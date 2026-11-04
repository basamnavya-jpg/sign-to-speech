"""
Script to generate realistic mock sensor data for Sign-to-Speech Smart Glove.
Generates:
  - data/sensor_data.xlsx
  - data/sensor_data.csv

Columns:
  timestamp, thumb_flex, index_flex, middle_flex, ring_flex, pinky_flex,
  accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z, gesture_id, ground_truth_label
"""

import os
import random
import csv
from typing import TypedDict
import openpyxl

class GestureTemplate(TypedDict):
    id: int
    label: str
    flex: tuple[int, int, int, int, int]
    accel: tuple[float, float, float]
    gyro: tuple[float, float, float]
    duration_frames: int

def generate_sensor_dataset():
    data_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(data_dir, exist_ok=True)
    
    excel_path = os.path.join(data_dir, "sensor_data.xlsx")
    csv_path = os.path.join(data_dir, "sensor_data.csv")

    # Defined gestures with their physical sensor profiles
    # Flex range: 0 (flat/extended) to 1023 (fully bent)
    # Accelerometer: m/s^2 (hand upright is typically ax ~ 0, ay ~ 1, az ~ 9.8)
    # Gyroscope: deg/s
    gesture_templates: list[GestureTemplate] = [
        {
            "id": 101,
            "label": "Hello",
            "flex": (120, 110, 115, 125, 130), # All fingers extended (flat palm wave)
            "accel": (0.2, 8.5, 3.2),
            "gyro": (15.0, 55.0, 25.0), # Hand waving motion
            "duration_frames": 25
        },
        {
            "id": 100,
            "label": "Rest",
            "flex": (250, 260, 240, 250, 270), # Neutral resting relaxed hand
            "accel": (0.1, 1.2, 9.6),
            "gyro": (0.5, 0.2, -0.3),
            "duration_frames": 10
        },
        {
            "id": 104,
            "label": "I",
            "flex": (850, 870, 890, 880, 120), # Only pinky straight, rest curled (ASL 'I')
            "accel": (0.0, 4.5, 8.2),
            "gyro": (2.1, 3.0, 1.5),
            "duration_frames": 25
        },
        {
            "id": 100,
            "label": "Rest",
            "flex": (250, 260, 240, 250, 270),
            "accel": (0.1, 1.2, 9.6),
            "gyro": (0.5, 0.2, -0.3),
            "duration_frames": 10
        },
        {
            "id": 105,
            "label": "Need",
            "flex": (650, 820, 300, 310, 320), # Index bent downward hook motion
            "accel": (0.4, -2.1, 8.8),
            "gyro": (35.0, -12.0, 5.0),
            "duration_frames": 25
        },
        {
            "id": 100,
            "label": "Rest",
            "flex": (250, 260, 240, 250, 270),
            "accel": (0.1, 1.2, 9.6),
            "gyro": (0.5, 0.2, -0.3),
            "duration_frames": 10
        },
        {
            "id": 106,
            "label": "Doctor",
            "flex": (450, 220, 210, 750, 780), # M-shape / D-shape wrist tap
            "accel": (0.1, 6.2, 7.1),
            "gyro": (12.0, 18.0, -4.0),
            "duration_frames": 25
        },
        {
            "id": 100,
            "label": "Rest",
            "flex": (250, 260, 240, 250, 270),
            "accel": (0.1, 1.2, 9.6),
            "gyro": (0.5, 0.2, -0.3),
            "duration_frames": 10
        },
        {
            "id": 102,
            "label": "Help",
            "flex": (450, 510, 100, 90, 80), # Flat hand supporting thumbs up or open urgency
            "accel": (0.1, 0.9, 9.8),
            "gyro": (5.0, 12.0, 3.0),
            "duration_frames": 25
        },
        {
            "id": 100,
            "label": "Rest",
            "flex": (250, 260, 240, 250, 270),
            "accel": (0.1, 1.2, 9.6),
            "gyro": (0.5, 0.2, -0.3),
            "duration_frames": 10
        },
        {
            "id": 103,
            "label": "Hospital",
            "flex": (800, 150, 160, 820, 830), # H-handshape (Index & middle straight together)
            "accel": (0.3, 5.1, 7.8),
            "gyro": (8.0, 4.0, 1.0),
            "duration_frames": 25
        },
        {
            "id": 100,
            "label": "Rest",
            "flex": (250, 260, 240, 250, 270),
            "accel": (0.1, 1.2, 9.6),
            "gyro": (0.5, 0.2, -0.3),
            "duration_frames": 10
        },
        {
            "id": 107,
            "label": "Water",
            "flex": (750, 140, 150, 160, 820), # W-handshape (Index, middle, ring straight)
            "accel": (0.2, 6.8, 6.5),
            "gyro": (10.0, 8.0, 2.0),
            "duration_frames": 25
        },
        {
            "id": 100,
            "label": "Rest",
            "flex": (250, 260, 240, 250, 270),
            "accel": (0.1, 1.2, 9.6),
            "gyro": (0.5, 0.2, -0.3),
            "duration_frames": 10
        },
        {
            "id": 108,
            "label": "Thank You",
            "flex": (140, 130, 135, 140, 150), # Flat hand moving forward down from mouth
            "accel": (1.8, 3.4, 8.5),
            "gyro": (-25.0, 10.0, 4.0),
            "duration_frames": 25
        },
        {
            "id": 100,
            "label": "Rest",
            "flex": (250, 260, 240, 250, 270),
            "accel": (0.1, 1.2, 9.6),
            "gyro": (0.5, 0.2, -0.3),
            "duration_frames": 10
        },
        {
            "id": 111,
            "label": "Where",
            "flex": (650, 160, 720, 740, 780), # Index wagging left-to-right
            "accel": (0.3, 7.2, 5.5),
            "gyro": (0.0, 42.0, -38.0),
            "duration_frames": 25
        },
        {
            "id": 100,
            "label": "Rest",
            "flex": (250, 260, 240, 250, 270),
            "accel": (0.1, 1.2, 9.6),
            "gyro": (0.5, 0.2, -0.3),
            "duration_frames": 10
        },
        {
            "id": 112,
            "label": "Exit",
            "flex": (210, 190, 710, 750, 780), # Hand gesturing direction toward doorway
            "accel": (3.5, 4.0, 7.2),
            "gyro": (18.0, -15.0, 20.0),
            "duration_frames": 25
        }
    ]

    rows = []
    current_time_ms = 0
    delta_ms = 200 # 200ms per sample (5 Hz ESP32 BLE stream)

    for gesture in gesture_templates:
        tf, inf, mf, rf, pf = gesture["flex"]
        ax, ay, az = gesture["accel"]
        gx, gy, gz = gesture["gyro"]
        gid = gesture["id"]
        label = gesture["label"]

        for _ in range(gesture["duration_frames"]):
            current_time_ms += delta_ms
            # Add realistic minor analog sensor noise (+/- 1-3%)
            noise_flex = [int(max(0, min(1023, v + random.gauss(0, 8)))) for v in (tf, inf, mf, rf, pf)]
            n_ax = round(ax + random.gauss(0, 0.05), 3)
            n_ay = round(ay + random.gauss(0, 0.05), 3)
            n_az = round(az + random.gauss(0, 0.05), 3)
            n_gx = round(gx + random.gauss(0, 0.8), 2)
            n_gy = round(gy + random.gauss(0, 0.8), 2)
            n_gz = round(gz + random.gauss(0, 0.8), 2)

            rows.append({
                "timestamp": current_time_ms / 1000.0,
                "thumb_flex": noise_flex[0],
                "index_flex": noise_flex[1],
                "middle_flex": noise_flex[2],
                "ring_flex": noise_flex[3],
                "pinky_flex": noise_flex[4],
                "accel_x": n_ax,
                "accel_y": n_ay,
                "accel_z": n_az,
                "gyro_x": n_gx,
                "gyro_y": n_gy,
                "gyro_z": n_gz,
                "gesture_id": gid,
                "ground_truth_label": label
            })

    if rows:
        # Write CSV
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)

        # Write Excel
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(list(rows[0].keys()))
        for r in rows:
            ws.append(list(r.values()))
        wb.save(excel_path)

    print(f"Successfully generated {len(rows)} sensor rows in:")
    print(f" -> {excel_path}")
    print(f" -> {csv_path}")

if __name__ == "__main__":
    generate_sensor_dataset()
