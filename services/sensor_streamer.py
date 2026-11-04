"""
Module A: Excel/CSV Sensor Data Simulator & WebSocket Telemetry Streamer.
Reads mock dataset (sensor_data.xlsx / sensor_data.csv) containing:
  timestamp, thumb_flex, index_flex, middle_flex, ring_flex, pinky_flex,
  accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z.

Loops through dataset sequentially every 200ms (5 Hz) to mimic live ESP32/BLE
hardware transmission, pushing live readings and translated gesture states to
all connected WebSocket clients (/ws/sensors).
"""

import os
import csv
import asyncio
import logging
from typing import Dict, Any, List, Optional, Set
from fastapi import WebSocket, WebSocketDisconnect

from config import EXCEL_DATA_PATH, CSV_DATA_PATH, DEFAULT_STREAM_INTERVAL_MS
from services.translator import translator_service

logger = logging.getLogger("SensorStreamer")
logging.basicConfig(level=logging.INFO)


def _cast_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Casts raw string values from CSV/Excel into proper float/int/str types."""
    float_fields = {
        "timestamp", "thumb_flex", "index_flex", "middle_flex", "ring_flex", "pinky_flex",
        "accel_x", "accel_y", "accel_z", "gyro_x", "gyro_y", "gyro_z"
    }
    cleaned = {}
    for k, v in row.items():
        if v is None or v == "":
            cleaned[k] = None
        elif k in float_fields:
            try:
                cleaned[k] = round(float(v), 3)
            except (ValueError, TypeError):
                cleaned[k] = v
        elif k == "gesture_id":
            try:
                cleaned[k] = int(float(v))
            except (ValueError, TypeError):
                cleaned[k] = v
        else:
            cleaned[k] = v
    return cleaned


class SensorStreamer:
    def __init__(self):
        self.excel_path = str(EXCEL_DATA_PATH)
        self.csv_path = str(CSV_DATA_PATH)
        self.records: List[Dict[str, Any]] = []
        self.current_index: int = 0
        self.is_running: bool = False
        self.is_paused: bool = False
        self.interval_ms: int = DEFAULT_STREAM_INTERVAL_MS
        self.speed_factor: float = 1.0
        
        # Latest reading cache
        self.latest_reading: Dict[str, Any] = self._default_reading()
        
        # WebSocket client connections
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self._worker_task: Optional[asyncio.Task] = None

    @property
    def df(self):
        """Shim for backwards compatibility with dataframe-like calls."""
        class _DataFrameShim:
            def __init__(self, records):
                self._records = records
            def __len__(self):
                return len(self._records)
            @property
            def iloc(self):
                class _Iloc:
                    def __init__(self, recs):
                        self._recs = recs
                    def __getitem__(self, idx):
                        class _Row:
                            def __init__(self, item):
                                self._item = item
                            def to_dict(self):
                                return dict(self._item)
                        return _Row(self._recs[idx])
                return _Iloc(self._records)
        return _DataFrameShim(self.records) if self.records else None

    def _default_reading(self) -> Dict[str, Any]:
        return {
            "timestamp": 0.0,
            "thumb_flex": 250.0,
            "index_flex": 260.0,
            "middle_flex": 240.0,
            "ring_flex": 250.0,
            "pinky_flex": 270.0,
            "accel_x": 0.1,
            "accel_y": 1.2,
            "accel_z": 9.6,
            "gyro_x": 0.5,
            "gyro_y": 0.2,
            "gyro_z": -0.3,
            "gesture_id": 100,
            "ground_truth_label": "Rest"
        }

    def _load_csv(self, path: str) -> List[Dict[str, Any]]:
        rows = []
        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for r in reader:
                rows.append(_cast_row(r))
        return rows

    def _load_excel(self, path: str) -> List[Dict[str, Any]]:
        import openpyxl
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        sheet = wb.active
        rows = []
        headers = []
        for i, row_vals in enumerate(sheet.iter_rows(values_only=True)):
            if i == 0:
                headers = [str(h).strip() if h is not None else f"col_{j}" for j, h in enumerate(row_vals)]
            else:
                if not any(v is not None for v in row_vals):
                    continue
                row_dict = dict(zip(headers, row_vals))
                rows.append(_cast_row(row_dict))
        wb.close()
        return rows

    def load_dataset(self) -> bool:
        """Loads data from CSV file or falls back to Excel."""
        try:
            if os.path.exists(self.csv_path):
                logger.info(f"Loading sensor dataset from CSV: {self.csv_path}")
                self.records = self._load_csv(self.csv_path)
            elif os.path.exists(self.excel_path):
                logger.info(f"Loading sensor dataset from Excel: {self.excel_path}")
                self.records = self._load_excel(self.excel_path)
            else:
                logger.warning("No dataset file found. Generating synthetic rows on the fly.")
                from data.create_mock_data import generate_sensor_dataset
                generate_sensor_dataset()
                if os.path.exists(self.csv_path):
                    self.records = self._load_csv(self.csv_path)
                elif os.path.exists(self.excel_path):
                    self.records = self._load_excel(self.excel_path)

            logger.info(f"Loaded {len(self.records)} sensor telemetry rows.")
            if len(self.records) > 0:
                self.latest_reading = dict(self.records[0])
            return True
        except Exception as e:
            logger.error(f"Failed to load dataset: {e}")
            return False

    async def connect_client(self, websocket: WebSocket):
        """Registers a new WebSocket subscriber."""
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    async def disconnect_client(self, websocket: WebSocket):
        """Unregisters a WebSocket subscriber."""
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Pushes data payload to all connected WebSocket subscribers."""
        if not self.active_connections:
            return

        dead_connections = []
        async with self._lock:
            clients = list(self.active_connections)

        for ws in clients:
            try:
                await ws.send_json(message)
            except Exception:
                dead_connections.append(ws)

        if dead_connections:
            async with self._lock:
                for ws in dead_connections:
                    self.active_connections.discard(ws)

    def get_latest(self) -> Dict[str, Any]:
        """Returns the most recent glove sensor telemetry row."""
        return self.latest_reading

    async def start_streaming(self):
        """Launches the background streaming worker."""
        if not self.records:
            self.load_dataset()

        self.is_running = True
        self.is_paused = False
        if self._worker_task is None or self._worker_task.done():
            self._worker_task = asyncio.create_task(self._stream_loop())
            logger.info("Sensor streaming background worker started.")

    async def stop_streaming(self):
        """Stops the streaming worker."""
        self.is_running = False
        if self._worker_task:
            self._worker_task.cancel()
            self._worker_task = None
        logger.info("Sensor streaming stopped.")

    def pause(self):
        self.is_paused = True

    def resume(self):
        self.is_paused = False

    def restart(self):
        self.current_index = 0
        self.is_paused = False

    def set_speed(self, factor: float):
        if factor > 0:
            self.speed_factor = factor

    def set_interval(self, interval_ms: int):
        if interval_ms >= 20:
            self.interval_ms = interval_ms

    async def _stream_loop(self):
        """Main async generator/loop streaming rows every 200ms."""
        while self.is_running:
            try:
                if self.is_paused or not self.records:
                    await asyncio.sleep(0.1)
                    continue

                cleaned_row = dict(self.records[self.current_index])
                self.latest_reading = cleaned_row

                # Classify on the fly using translation engine
                glabel, conf, gid, desc, tts = translator_service.classify_raw_sensors(
                    thumb=cleaned_row.get("thumb_flex", 250),
                    index=cleaned_row.get("index_flex", 260),
                    middle=cleaned_row.get("middle_flex", 240),
                    ring=cleaned_row.get("ring_flex", 250),
                    pinky=cleaned_row.get("pinky_flex", 270),
                    ax=cleaned_row.get("accel_x", 0.1),
                    ay=cleaned_row.get("accel_y", 1.2),
                    az=cleaned_row.get("accel_z", 9.6),
                    gx=cleaned_row.get("gyro_x", 0.0),
                    gy=cleaned_row.get("gyro_y", 0.0),
                    gz=cleaned_row.get("gyro_z", 0.0)
                )

                # Prepare live telemetry broadcast packet
                payload = {
                    "type": "telemetry",
                    "index": self.current_index,
                    "total_rows": len(self.records),
                    "sensors": cleaned_row,
                    "classification": {
                        "gesture_label": glabel,
                        "confidence": conf,
                        "gesture_id": gid,
                        "description": desc,
                        "tts_speech_hint": tts
                    },
                    "current_sentence": translator_service.get_sentence(),
                    "active_buffer": translator_service.get_buffer()
                }

                await self.broadcast(payload)

                # Advance sequentially and loop back smoothly
                self.current_index = (self.current_index + 1) % len(self.records)

                # Sleep interval based on 200ms and speed factor
                sleep_sec = (self.interval_ms / 1000.0) / max(0.1, self.speed_factor)
                await asyncio.sleep(sleep_sec)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in sensor streamer loop: {e}")
                await asyncio.sleep(0.5)

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_streaming": self.is_running and not self.is_paused,
            "current_row": self.current_index,
            "total_rows": len(self.records),
            "speed_factor": self.speed_factor,
            "interval_ms": self.interval_ms,
            "connected_clients": len(self.active_connections)
        }


# Global singleton instance
sensor_streamer = SensorStreamer()
