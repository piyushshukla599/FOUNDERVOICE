from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

from ..config import get_settings


@lru_cache
def _model():
    from faster_whisper import WhisperModel

    settings = get_settings()
    return WhisperModel(
        settings.whisper_model,
        device=settings.whisper_device,
        compute_type=settings.whisper_compute_type,
        download_root=str(settings.models_dir),
    )


def transcribe(audio_path: Path) -> dict[str, Any]:
    """Local Whisper transcription with word/sentence timestamps."""
    settings = get_settings()
    try:
        model = _model()
        segments_iter, info = model.transcribe(
            str(audio_path),
            word_timestamps=True,
            vad_filter=True,
            beam_size=5,
        )
        words: list[dict[str, Any]] = []
        sentences: list[dict[str, Any]] = []
        full_parts: list[str] = []
        for seg in segments_iter:
            text = (seg.text or "").strip()
            if not text:
                continue
            full_parts.append(text)
            conf = float(getattr(seg, "avg_logprob", -1.0))
            # map logprob roughly into 0-1
            confidence = max(0.0, min(1.0, (conf + 1.0)))
            sentences.append(
                {
                    "start": float(seg.start or 0),
                    "end": float(seg.end or 0),
                    "text": text,
                    "confidence": confidence,
                }
            )
            if seg.words:
                for w in seg.words:
                    words.append(
                        {
                            "start": float(w.start or 0),
                            "end": float(w.end or 0),
                            "word": (w.word or "").strip(),
                            "probability": float(getattr(w, "probability", 0.0) or 0.0),
                        }
                    )
        return {
            "text": " ".join(full_parts).strip(),
            "language": getattr(info, "language", "en"),
            "duration": float(getattr(info, "duration", 0) or 0),
            "words": words,
            "sentences": sentences,
            "engine": f"faster-whisper:{settings.whisper_model}",
        }
    except Exception as exc:  # noqa: BLE001 — provide demo transcript so UI still works
        return demo_transcript(audio_path, str(exc))


def demo_transcript(audio_path: Path, error: str) -> dict[str, Any]:
    """Keep the pipeline running when no engine could produce a transcript."""
    try:
        import librosa

        duration = float(librosa.get_duration(path=str(audio_path)))
    except Exception:  # noqa: BLE001
        duration = 30.0
    duration = max(duration, 1.0)

    text = (
        "Hi, I'm the founder of FounderVoice. We help executives speak with clarity and conviction. "
        "The problem is most pitch feedback is generic. Like, you know, it just says you spoke too fast. "
        "Our solution builds a voice memory over time so coaching is personal. "
        "We're raising a seed round to expand local analysis and practice mode."
    )
    words_raw = text.split()
    # ~140 WPM target for demo timing
    target_spoken = min(duration * 0.85, (len(words_raw) / 140.0) * 60.0)
    target_spoken = max(target_spoken, 2.0)
    step = target_spoken / max(len(words_raw), 1)
    words = []
    t = 0.0
    for w in words_raw:
        words.append({"start": round(t, 3), "end": round(t + step * 0.85, 3), "word": w, "probability": 0.85})
        t += step
    # scale into [0, duration]
    scale = duration / max(t, 0.01)
    for w in words:
        w["start"] = round(w["start"] * scale, 3)
        w["end"] = round(w["end"] * scale, 3)

    n = max(len(words_raw), 1)
    cuts = [0, int(n * 0.25), int(n * 0.55), int(n * 0.8), n]
    sentences = []
    for i in range(4):
        chunk = words_raw[cuts[i] : cuts[i + 1]]
        if not chunk:
            continue
        start = words[cuts[i]]["start"] if cuts[i] < len(words) else 0.0
        end = words[min(cuts[i + 1] - 1, len(words) - 1)]["end"]
        sentences.append({"start": start, "end": end, "text": " ".join(chunk), "confidence": 0.8})
    return {
        "text": text,
        "language": "en",
        "duration": duration,
        "words": words,
        "sentences": sentences,
        "engine": "demo-fallback",
        "warning": f"Transcription unavailable ({error}). Using demo transcript for pipeline continuity.",
    }
