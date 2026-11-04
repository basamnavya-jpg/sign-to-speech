"""
Sentence Construction Router:
  - POST /api/sentence/add (Appends gesture word into active buffer)
  - DELETE /api/sentence/clear (Resets active sentence buffer)
  - GET /api/sentence/current (Retrieves active formulated sentence)
  - GET /api/sentence/audio (Optional auditory feedback / WAV tone)
"""

from fastapi import APIRouter, Response
from models.schemas import (
    SentenceAddPayload,
    SentenceAddResponse,
    SentenceResponse
)
from services.translator import translator_service
from services.tts_service import tts_service

router = APIRouter(tags=["Sentence Construction Engine"])

@router.post(
    "/api/sentence/add",
    response_model=SentenceAddResponse,
    summary="Append recognized sign word to sentence buffer",
    description="Appends a newly recognized sign word into the active sentence buffer and reconstructs a grammatically coherent sentence."
)
async def add_word_to_sentence(payload: SentenceAddPayload):
    """
    Appends a new gesture token into the buffer with debouncing
    and rule-based NLP smoothing.
    """
    current_sentence, buffer, was_added = translator_service.add_to_sentence(payload.word)
    
    tts_meta = tts_service.get_tts_metadata(current_sentence)

    return SentenceAddResponse(
        current_sentence=current_sentence,
        buffer=buffer,
        status="success" if was_added else "ignored_debounce",
        tts_metadata=tts_meta
    )


@router.delete(
    "/api/sentence/clear",
    response_model=SentenceResponse,
    summary="Reset sentence buffer",
    description="Resets the active sentence buffer and clears pending gestures."
)
async def clear_sentence_buffer():
    """Resets the active sentence buffer."""
    sentence, buffer = translator_service.clear_sentence()
    return SentenceResponse(
        current_sentence=sentence,
        buffer=buffer,
        word_count=0,
        status="cleared"
    )


@router.get(
    "/api/sentence/current",
    response_model=SentenceResponse,
    summary="Get current active sentence",
    description="Fetches the current formulated sentence and buffer contents."
)
async def get_current_sentence():
    """Retrieves current formulated sentence."""
    sentence = translator_service.get_sentence()
    buffer = translator_service.get_buffer()
    return SentenceResponse(
        current_sentence=sentence,
        buffer=buffer,
        word_count=len(buffer),
        status="active" if buffer else "empty"
    )


@router.get(
    "/api/sentence/audio",
    summary="Auditory feedback / tone",
    description="Returns a synthesized WAV audio tone for feedback confirmation."
)
async def get_audio_feedback():
    """Returns an audio confirmation beep for assistive feedback."""
    wav_bytes = tts_service.generate_feedback_tone(frequency=520.0, duration=0.2)
    return Response(content=wav_bytes, media_type="audio/wav")
