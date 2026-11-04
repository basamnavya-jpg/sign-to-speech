"""
Simulator Control Router:
  - POST /api/simulator/control (Play, pause, restart, change speed)
  - GET /api/simulator/status (Current streamer status)
"""

from fastapi import APIRouter, HTTPException
from models.schemas import SimulatorControlPayload, SimulatorStatusResponse
from services.sensor_streamer import sensor_streamer

router = APIRouter(tags=["Simulator Controls"])

@router.post(
    "/api/simulator/control",
    response_model=SimulatorStatusResponse,
    summary="Control mock telemetry stream playback",
    description="Commands: 'play', 'pause', 'restart', 'speed'."
)
async def control_simulator(payload: SimulatorControlPayload):
    """Controls the background telemetry stream loop."""
    action = payload.action.lower()

    if action == "play" or action == "resume":
        sensor_streamer.resume()
    elif action == "pause":
        sensor_streamer.pause()
    elif action == "restart":
        sensor_streamer.restart()
    elif action == "speed":
        if payload.speed_factor:
            sensor_streamer.set_speed(payload.speed_factor)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}. Use 'play', 'pause', 'restart', or 'speed'")

    if payload.interval_ms:
        sensor_streamer.set_interval(payload.interval_ms)

    status = sensor_streamer.get_status()
    return SimulatorStatusResponse(**status)


@router.get(
    "/api/simulator/status",
    response_model=SimulatorStatusResponse,
    summary="Get simulator status",
    description="Returns current stream position, speed, and client count."
)
async def get_simulator_status():
    """Returns current streamer metrics."""
    return SimulatorStatusResponse(**sensor_streamer.get_status())
