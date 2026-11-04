"""
Sign-to-Speech TTS helper service.
Generates:
  1. Frontend Web Speech API parameters and metadata
  2. Synthesized audio waveform references or PCM audio stream
"""

import io
import wave
import math
import struct
from typing import Dict, Any

class TTSService:
    @staticmethod
    def get_tts_metadata(text: str) -> Dict[str, Any]:
        """Returns metadata tailored for frontend browser SpeechSynthesis API."""
        return {
            "text": text,
            "lang": "en-US",
            "rate": 1.0,
            "pitch": 1.0,
            "volume": 1.0,
            "trigger_auto_play": True,
            "audio_url": f"/api/sentence/audio?text={text.replace(' ', '+')}" if text else None
        }

    @staticmethod
    def generate_feedback_tone(frequency: float = 440.0, duration: float = 0.25) -> bytes:
        """
        Generates a crisp audio confirmation beep WAV in memory.
        Can be used as immediate auditory feedback when a gesture is accepted.
        """
        sample_rate = 22050
        num_samples = int(sample_rate * duration)
        buf = io.BytesIO()
        
        with wave.open(buf, 'wb') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)
            
            for i in range(num_samples):
                t = i / sample_rate
                # Apply envelope to prevent clicking
                envelope = 1.0
                if i < 200:
                    envelope = i / 200.0
                elif i > num_samples - 200:
                    envelope = (num_samples - i) / 200.0
                
                value = int(32767.0 * 0.5 * envelope * math.sin(2.0 * math.pi * frequency * t))
                wav_file.writeframes(struct.pack('<h', value))
                
        return buf.getvalue()

tts_service = TTSService()
