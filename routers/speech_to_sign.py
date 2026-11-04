"""
Speech-to-Sign Router:
  - POST /api/speech-to-sign (Interlocutor text -> Sign tokens & visual assets)
  - GET /api/speech-to-sign/vocab (List all supported sign vocabulary)
"""

from fastapi import APIRouter
from models.schemas import SpeechToSignPayload, SpeechToSignResponse
from services.speech_to_sign import speech_to_sign_service, SIGN_VOCABULARY

router = APIRouter(tags=["Speech to Sign"])

@router.post(
    "/api/speech-to-sign",
    response_model=SpeechToSignResponse,
    summary="Convert spoken/text phrase into sign sequence and image URLs",
    description="Converts input text (speech-to-text output from an interlocutor) into sign language asset mappings."
)
async def convert_speech_to_sign(payload: SpeechToSignPayload):
    """
    Tokenizes input speech text, strips stop words, and maps to sign language tokens
    and visual image asset URLs.
    """
    signs, image_urls, details = speech_to_sign_service.convert_speech_to_sign(payload.text)

    return SpeechToSignResponse(
        sign_sequence=signs,
        image_urls=image_urls,
        original_text=payload.text,
        details=details
    )


@router.get(
    "/api/speech-to-sign/vocab",
    summary="Get sign language vocabulary catalog",
    description="Returns all supported sign language tokens, asset links, and categories."
)
async def get_speech_to_sign_vocab():
    """Lists available sign language tokens."""
    return {
        "count": len(SIGN_VOCABULARY),
        "vocabulary": SIGN_VOCABULARY
    }
