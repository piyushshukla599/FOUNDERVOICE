from __future__ import annotations

from pathlib import Path
from typing import Any

from ..config import get_settings
from . import groq_asr, whisper_asr


def transcribe(audio_path: Path) -> dict[str, Any]:
    """Transcribe with whichever engine is configured.

    A Groq failure never falls through to the local model: the hosts we pick
    Groq for cannot load faster-whisper at all, and the attempt would be
    OOM-killed rather than raising something we could catch.
    """
    settings = get_settings()
    if settings.asr_provider.strip().lower() == "groq":
        try:
            return groq_asr.transcribe(audio_path)
        except Exception as exc:  # noqa: BLE001 - keep the pipeline alive
            return whisper_asr.demo_transcript(audio_path, f"Groq transcription failed: {exc}")
    return whisper_asr.transcribe(audio_path)
