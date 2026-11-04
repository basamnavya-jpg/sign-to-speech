"""
Configuration settings for the Sign-to-Speech backend.
"""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# File paths
DATA_DIR = BASE_DIR / "data"
EXCEL_DATA_PATH = DATA_DIR / "sensor_data.xlsx"
CSV_DATA_PATH = DATA_DIR / "sensor_data.csv"
SIGNS_METADATA_PATH = DATA_DIR / "signs.json"
STATIC_DIR = BASE_DIR / "static"
ASSETS_DIR = STATIC_DIR / "assets" / "signs"

# Sensor simulator defaults
DEFAULT_STREAM_INTERVAL_MS = 200  # 200ms = 5 Hz (ESP32 BLE streaming rate)
DEFAULT_SPEED_FACTOR = 1.0

# Sentence construction engine defaults
DEFAULT_SENTENCE_CLEAR_TIMEOUT_SECONDS = 10.0  # Timeout to auto-clear or finalize idle buffer
GESTURE_DEBOUNCE_SECONDS = 1.2  # Minimum duration before repeating same gesture

# Server settings
HOST = "127.0.0.1"
PORT = 8000
CORS_ORIGINS = ["*"]
