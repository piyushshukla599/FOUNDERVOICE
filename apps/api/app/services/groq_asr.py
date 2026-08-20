from __future__ import annotations

from pathlib import Path
from typing import Any

import httpx

from ..config import get_settings
from . import audio


# Groq rejects uploads over 25 MB. The pipeline hands us a float32 WAV at
# 64 KB/s, which crosses that at roughly six minutes; re-encoding to 16-bit
# FLAC costs one pass and buys about an hour of headroom.
MAX_UPLOAD_BYTES = 24 * 1024 * 1024

# verbose_json reports a language name ("english"), but the rest of the
# pipeline and the stored transcripts use ISO codes.
_LANGUAGE_CODES = {
    "english": "en",
    "hindi": "hi",
    "tamil": "ta",
    "telugu": "te",
    "marathi": "mr",
    "bengali": "bn",
    "gujarati": "gu",
    "kannada": "kn",
    "malayalam": "ml",
    "punjabi": "pa",
    "urdu": "ur",
    "spanish": "es",
    "french": "fr",
    "german": "de",
    "portuguese": "pt",
    "arabic": "ar",
    "chinese": "zh",
    "japanese": "ja",
}


def transcribe(audio_path: Path) -> dict[str, Any]:
    """Transcribe through Groq's Whisper endpoint.

    Raises on any failure. The caller decides what to fall back to, because on
    a small host falling back to the local model is not an option.
    """
    settings = get_settings()
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not set")

    payload_path = _to_flac(audio_path)
    try:
        size = payload_path.stat().st_size
        if size > MAX_UPLOAD_BYTES:
            raise RuntimeError(f"audio is {size // (1024 * 1024)} MB, over Groq's 25 MB limit")

        with payload_path.open("rb") as handle:
            response = httpx.post(
                f"{settings.groq_base_url.rstrip('/')}/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                files={"file": (payload_path.name, handle, "audio/flac")},
                data={
                    "model": settings.groq_model,
                    "response_format": "verbose_json",
                    "timestamp_granularities[]": ["word", "segment"],
                },
                timeout=settings.groq_timeout,
            )
        if response.status_code >= 400:
            raise RuntimeError(f"Groq returned {response.status_code}: {response.text[:300]}")
        return _to_transcript(response.json(), settings.groq_model)
    finally:
        if payload_path != audio_path:
            payload_path.unlink(missing_ok=True)


def _to_flac(wav_path: Path) -> Path:
    """Shrink the upload. Returns the original path if encoding is unavailable."""
    dest = None
    try:
        import soundfile as sf

        dest = audio.temp_path(".flac")
        data, sample_rate = sf.read(str(wav_path), dtype="float32")
        sf.write(str(dest), data, sample_rate, format="FLAC", subtype="PCM_16")
        return dest
    except Exception:  # noqa: BLE001 - size is an optimisation, not a requirement
        if dest is not None:
            dest.unlink(missing_ok=True)
        return wav_path


def _to_transcript(data: dict[str, Any], model: str) -> dict[str, Any]:
    sentences: list[dict[str, Any]] = []
    for seg in data.get("segments") or []:
        text = (seg.get("text") or "").strip()
        if not text:
            continue
        sentences.append(
            {
                "start": float(seg.get("start") or 0.0),
                "end": float(seg.get("end") or 0.0),
                "text": text,
                "confidence": _confidence(seg.get("avg_logprob")),
            }
        )

    words = _read_words(data.get("words") or [], sentences)
    if not words:
        # Pace, pauses and filler detection are all word-timed. Rather than
        # lose them, spread each sentence's words evenly across its span.
        words = _spread(sentences)

    text = (data.get("text") or "").strip()
    if not text:
        text = " ".join(s["text"] for s in sentences).strip()

    duration = float(data.get("duration") or 0.0)
    if not duration and words:
        duration = float(words[-1]["end"])

    return {
        "text": text,
        "language": _language_code(data.get("language")),
        "duration": duration,
        "words": words,
        "sentences": sentences,
        "engine": f"groq:{model}",
    }


def _read_words(raw: list[dict[str, Any]], sentences: list[dict[str, Any]]) -> list[dict[str, Any]]:
    words: list[dict[str, Any]] = []
    cursor = 0
    for item in raw:
        token = (item.get("word") or "").strip()
        if not token:
            continue
        start = float(item.get("start") or 0.0)
        end = float(item.get("end") or start)
        # Groq gives no per-word probability, so inherit the enclosing
        # segment's confidence. Both lists are in time order, so walk once.
        while cursor + 1 < len(sentences) and sentences[cursor]["end"] < start:
            cursor += 1
        probability = sentences[cursor]["confidence"] if sentences else 0.9
        words.append({"start": start, "end": end, "word": token, "probability": probability})
    return words


def _spread(sentences: list[dict[str, Any]]) -> list[dict[str, Any]]:
    words: list[dict[str, Any]] = []
    for sentence in sentences:
        tokens = sentence["text"].split()
        if not tokens:
            continue
        span = max(sentence["end"] - sentence["start"], 0.01)
        step = span / len(tokens)
        for index, token in enumerate(tokens):
            start = sentence["start"] + index * step
            words.append(
                {
                    "start": round(start, 3),
                    "end": round(start + step * 0.85, 3),
                    "word": token,
                    "probability": sentence["confidence"],
                }
            )
    return words


def _confidence(avg_logprob: Any) -> float:
    try:
        return max(0.0, min(1.0, float(avg_logprob) + 1.0))
    except (TypeError, ValueError):
        return 0.9


def _language_code(value: Any) -> str:
    name = str(value or "").strip().lower()
    if len(name) == 2:
        return name
    return _LANGUAGE_CODES.get(name, "en")
