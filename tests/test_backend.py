"""
Unit and integration tests for the Sign-to-Speech Smart Glove Backend.
Covers:
  - GET /api/sensors/latest
  - POST /api/translate
  - POST /api/sentence/add
  - DELETE /api/sentence/clear
  - POST /api/speech-to-sign
  - POST /api/simulator/control
  - WebSocket /ws/sensors
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from main import app
from services.sensor_streamer import sensor_streamer

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "simulator" in data

def test_get_sensors_latest(client):
    response = client.get("/api/sensors/latest")
    assert response.status_code == 200
    data = response.json()
    assert "thumb_flex" in data
    assert "index_flex" in data
    assert "middle_flex" in data
    assert "ring_flex" in data
    assert "pinky_flex" in data
    assert "accel_x" in data
    assert "accel_y" in data
    assert "accel_z" in data

def test_post_translate(client):
    payload = {
        "thumb": 450,
        "index": 510,
        "middle": 100,
        "ring": 90,
        "pinky": 80,
        "ax": 0.1,
        "ay": 0.9,
        "az": 9.8
    }
    response = client.post("/api/translate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "gesture_label" in data
    assert "confidence" in data
    assert isinstance(data["confidence"], float)
    assert data["gesture_label"] == "Help"
    assert data["confidence"] > 0.8

def test_sentence_builder_flow(client):
    # 1. Clear buffer first
    clear_res = client.delete("/api/sentence/clear")
    assert clear_res.status_code == 200
    assert clear_res.json()["status"] == "cleared"

    # 2. Add 'I'
    res1 = client.post("/api/sentence/add", json={"word": "I"})
    assert res1.status_code == 200
    assert "I" in res1.json()["buffer"]

    # 3. Add 'Need'
    res2 = client.post("/api/sentence/add", json={"word": "Need"})
    assert res2.status_code == 200

    # 4. Add 'Hospital'
    res3 = client.post("/api/sentence/add", json={"word": "Hospital"})
    assert res3.status_code == 200
    data3 = res3.json()
    assert data3["status"] == "success"
    # NLP smoothing formulation check
    assert "hospital" in data3["current_sentence"].lower()

    # 5. Clear buffer
    res_clear = client.delete("/api/sentence/clear")
    assert res_clear.status_code == 200
    assert res_clear.json()["current_sentence"] == ""

def test_speech_to_sign(client):
    payload = {"text": "Where is the exit?"}
    response = client.post("/api/speech-to-sign", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "sign_sequence" in data
    assert "image_urls" in data
    assert "WHERE" in data["sign_sequence"]
    assert "EXIT" in data["sign_sequence"]
    assert any("where" in url for url in data["image_urls"])
    assert any("exit" in url for url in data["image_urls"])

def test_simulator_controls(client):
    # Test pause
    res = client.post("/api/simulator/control", json={"action": "pause"})
    assert res.status_code == 200
    assert res.json()["is_streaming"] is False

    # Test play
    res = client.post("/api/simulator/control", json={"action": "play"})
    assert res.status_code == 200
    assert res.json()["is_streaming"] is True

def test_websocket_stream(client):
    with client.websocket_connect("/ws/sensors") as ws:
        data = ws.receive_json()
        assert data["type"] == "telemetry"
        assert "sensors" in data
        assert "classification" in data
        assert "thumb_flex" in data["sensors"]
