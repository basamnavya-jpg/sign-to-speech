"""
Translation Router:
  - POST /api/translate (ML/Rule classification of raw glove array)
  - GET /api/gestures (Catalog of registered gestures)
"""

from fastapi import APIRouter
from models.schemas import RawSensorPayload, TranslateResponse
from services.translator import translator_service

router = APIRouter(tags=["Translation"])

@router.post(
    "/api/translate",
    response_model=TranslateResponse,
    summary="Translate raw sensor telemetry into sign gesture",
    description="Receives raw sensor array data, processes/classifies it via the mock ML model, and returns the translated sign word."
)
async def translate_sensor_telemetry(payload: RawSensorPayload):
    """
    Classifies raw flex sensors and MPU6050 accelerometer/gyroscope coordinates.
    """
    label, confidence, gid, desc, tts = translator_service.classify_raw_sensors(
        thumb=payload.thumb,
        index=payload.index,
        middle=payload.middle,
        ring=payload.ring,
        pinky=payload.pinky,
        ax=payload.ax,
        ay=payload.ay,
        az=payload.az,
        gx=payload.gx or 0.0,
        gy=payload.gy or 0.0,
        gz=payload.gz or 0.0
    )

    return TranslateResponse(
        gesture_label=label,
        confidence=confidence,
        gesture_id=gid,
        description=desc,
        tts_speech_hint=tts
    )


@router.get(
    "/api/gestures",
    summary="List all gesture signatures",
    description="Returns the full catalog of registered gestures with their definitions."
)
async def list_gestures():
    """Lists registered gesture profiles."""
    results = []
    for gid, gdef in translator_service.gestures.items():
        results.append({
            "gesture_id": gid,
            "label": gdef.label,
            "description": gdef.description,
            "tts_phrase": gdef.tts_phrase,
            "finger_targets": {
                "thumb": gdef.flex_targets[0],
                "index": gdef.flex_targets[1],
                "middle": gdef.flex_targets[2],
                "ring": gdef.flex_targets[3],
                "pinky": gdef.flex_targets[4]
            }
        })
    return {"total": len(results), "gestures": results}
