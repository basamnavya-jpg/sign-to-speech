"""
Pydantic schemas and data validation models for the Sign-to-Speech Smart Glove API.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SensorReading(BaseModel):
    """Schema representing one full row of ESP32 / MPU6050 glove sensor telemetry."""
    timestamp: float = Field(..., description="Sample timestamp in seconds")
    thumb_flex: float = Field(..., description="Thumb flex sensor value (0-1023)")
    index_flex: float = Field(..., description="Index flex sensor value (0-1023)")
    middle_flex: float = Field(..., description="Middle flex sensor value (0-1023)")
    ring_flex: float = Field(..., description="Ring flex sensor value (0-1023)")
    pinky_flex: float = Field(..., description="Pinky flex sensor value (0-1023)")
    accel_x: float = Field(..., description="MPU6050 Accelerometer X (m/s^2 or g)")
    accel_y: float = Field(..., description="MPU6050 Accelerometer Y (m/s^2 or g)")
    accel_z: float = Field(..., description="MPU6050 Accelerometer Z (m/s^2 or g)")
    gyro_x: float = Field(..., description="MPU6050 Gyroscope X (deg/s)")
    gyro_y: float = Field(..., description="MPU6050 Gyroscope Y (deg/s)")
    gyro_z: float = Field(..., description="MPU6050 Gyroscope Z (deg/s)")
    gesture_id: Optional[int] = Field(None, description="Optional ground truth gesture identifier")
    ground_truth_label: Optional[str] = Field(None, description="Optional ground truth gesture label")

    model_config = {
        "json_schema_extra": {
            "example": {
                "timestamp": 12.4,
                "thumb_flex": 450.0,
                "index_flex": 510.0,
                "middle_flex": 100.0,
                "ring_flex": 90.0,
                "pinky_flex": 80.0,
                "accel_x": 0.1,
                "accel_y": 0.9,
                "accel_z": 9.8,
                "gyro_x": 5.0,
                "gyro_y": 12.0,
                "gyro_z": 3.0,
                "gesture_id": 102,
                "ground_truth_label": "Help"
            }
        }
    }


class RawSensorPayload(BaseModel):
    """
    Payload for POST /api/translate
    Matches required schema:
    {"thumb": 450, "index": 510, "middle": 100, "ring": 90, "pinky": 80, "ax": 0.1, "ay": 0.9, "az": 9.8}
    """
    thumb: float = Field(..., description="Thumb flex reading")
    index: float = Field(..., description="Index flex reading")
    middle: float = Field(..., description="Middle flex reading")
    ring: float = Field(..., description="Ring flex reading")
    pinky: float = Field(..., description="Pinky flex reading")
    ax: float = Field(..., description="Accelerometer X")
    ay: float = Field(..., description="Accelerometer Y")
    az: float = Field(..., description="Accelerometer Z")
    gx: Optional[float] = Field(0.0, description="Gyroscope X (optional)")
    gy: Optional[float] = Field(0.0, description="Gyroscope Y (optional)")
    gz: Optional[float] = Field(0.0, description="Gyroscope Z (optional)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "thumb": 450,
                "index": 510,
                "middle": 100,
                "ring": 90,
                "pinky": 80,
                "ax": 0.1,
                "ay": 0.9,
                "az": 9.8
            }
        }
    }


class TranslateResponse(BaseModel):
    """
    Response schema for POST /api/translate
    Example: {"gesture_label": "Help", "confidence": 0.94}
    """
    gesture_label: str = Field(..., description="Predicted gesture translation")
    confidence: float = Field(..., description="Classification confidence (0.0 to 1.0)")
    gesture_id: Optional[int] = Field(None, description="Internal gesture code identifier")
    description: Optional[str] = Field(None, description="Human friendly sign meaning")
    tts_speech_hint: Optional[str] = Field(None, description="Text string ready for TTS synthesis")


class SentenceAddPayload(BaseModel):
    """
    Payload for POST /api/sentence/add
    Example: {"word": "Hospital"}
    """
    word: str = Field(..., description="Recognized sign gesture word to append")

    model_config = {
        "json_schema_extra": {
            "example": {
                "word": "Hospital"
            }
        }
    }


class SentenceAddResponse(BaseModel):
    """
    Response schema for POST /api/sentence/add
    Example: {"current_sentence": "I need a hospital", "status": "success"}
    """
    current_sentence: str = Field(..., description="Formulated grammatical sentence")
    buffer: List[str] = Field(..., description="Underlying gesture sequence buffer")
    status: str = Field("success", description="Operation status")
    tts_metadata: Optional[Dict[str, Any]] = Field(None, description="Browser TTS parameters")


class SentenceResponse(BaseModel):
    """Response schema for GET /api/sentence/current or DELETE /api/sentence/clear"""
    current_sentence: str = Field(..., description="Current composed sentence")
    buffer: List[str] = Field(..., description="List of recognized sign tokens in buffer")
    word_count: int = Field(0, description="Number of tokens in buffer")
    status: str = Field("cleared", description="Buffer status")


class SpeechToSignPayload(BaseModel):
    """
    Payload for POST /api/speech-to-sign
    Example: {"text": "Where is the exit?"}
    """
    text: str = Field(..., description="Spoken/written sentence from interlocutor to convert to sign language")

    model_config = {
        "json_schema_extra": {
            "example": {
                "text": "Where is the exit?"
            }
        }
    }


class SpeechToSignResponse(BaseModel):
    """
    Response schema for POST /api/speech-to-sign
    Example: {"sign_sequence": ["WHERE", "EXIT"], "image_urls": ["/assets/signs/where.png", "/assets/signs/exit.png"]}
    """
    sign_sequence: List[str] = Field(..., description="List of recognized sign tokens")
    image_urls: List[str] = Field(..., description="URLs to visual sign illustrations / animations")
    original_text: str = Field(..., description="Original interlocutor sentence")
    details: Optional[List[Dict[str, Any]]] = Field(None, description="Detailed token matching breakdown")


class SimulatorControlPayload(BaseModel):
    """Payload to control mock telemetry streamer."""
    action: str = Field(..., description="'play', 'pause', 'restart', 'step', or 'speed'")
    speed_factor: Optional[float] = Field(1.0, description="Playback speed multiplier (e.g., 0.5, 1.0, 2.0)")
    interval_ms: Optional[int] = Field(None, description="Custom stream interval in ms")


class SimulatorStatusResponse(BaseModel):
    """Status response for the telemetry simulator."""
    is_streaming: bool
    current_row: int
    total_rows: int
    speed_factor: float
    interval_ms: int
    connected_clients: int
