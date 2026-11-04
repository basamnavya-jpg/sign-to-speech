"""
Sensors Router:
  - GET /api/sensors/latest (Latest row from Excel mock dataset)
  - WS /ws/sensors (WebSocket live telemetry channel)
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.sensor_streamer import sensor_streamer
from models.schemas import SensorReading

router = APIRouter(tags=["Sensors"])

@router.get(
    "/api/sensors/latest",
    response_model=SensorReading,
    summary="Fetch latest glove sensor readings",
    description="Fetches the latest stream row from the mock Excel/CSV dataset containing finger flex and MPU6050 coordinates."
)
async def get_latest_sensor_data():
    """Returns the most recent row of glove telemetry."""
    reading = sensor_streamer.get_latest()
    return reading


@router.websocket("/ws/sensors")
async def websocket_sensor_stream(websocket: WebSocket):
    """
    WebSocket channel pushing live mock sensor rows and translated
    gesture states to the frontend client in real-time.
    """
    await sensor_streamer.connect_client(websocket)
    try:
        # Keep connection open and listen for any incoming client control packets
        while True:
            data = await websocket.receive_text()
            # If client sends ping or commands like "pause" or "resume"
            if data == "pause":
                sensor_streamer.pause()
            elif data == "resume":
                sensor_streamer.resume()
            elif data == "restart":
                sensor_streamer.restart()
    except WebSocketDisconnect:
        await sensor_streamer.disconnect_client(websocket)
    except Exception:
        await sensor_streamer.disconnect_client(websocket)
