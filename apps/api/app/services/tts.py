"""Speech for the coach's spoken reply.

Everything else in FounderVoice reads its coaching. This turns the same words
into a voice, because a founder practising a pitch is looking at a room, not at
a screen, and a coach who has to be read is a coach you stop using.

Three things this deliberately does NOT do:

*   It does not require a key. With no provider configured the endpoint says so
    and the browser speaks the same script with its own built-in voice. The
    feature degrades to a worse voice, never to no voice.
*   It does not send audio anywhere. Only the finished coaching text leaves the
    machine, which is the same line AGENTS.md already draws for DeepSeek.
*   It does not pay twice for a line. Synthesised audio is cached per workspace
    under ``data/<ws>/tts`` keyed by provider, voice and text, so replaying a
    verdict costs one call, not one per press.

Providers, in the order ``auto`` tries them: ElevenLabs (the most human, and
the reason this exists), OpenAI, then Groq PlayAI - Groq last only because a
key is often already present for ASR, so trying it first would quietly pick it
over a better voice the operator paid for.
"""

from __future__ import annotations

import hashlib
import logging
import re
import ssl
from pathlib import Path
from typing import Any

import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)

# One spoken line. Longer than this is a paragraph nobody listens to, and every
# provider bills by the character.
MAX_CHARS = 900

# How many synthesised lines to keep on disk per workspace before the oldest go.
CACHE_LIMIT = 240

_WARNED: set[str] = set()

# Placeholder keys copied out of a README look configured but are not.
_PLACEHOLDER = re.compile(r"^(sk-)?your|^changeme|^xxx", re.I)


def _warn_once(key: str, message: str) -> None:
    """One line per failure kind per process. A dead key must not flood the log."""
    if key in _WARNED:
        return
    _WARNED.add(key)
    logger.warning(message)


def _ssl_context() -> ssl.SSLContext:
    from .. import ssl_fix

    return ssl_fix.client_ssl_context()


def _usable(key: str) -> bool:
    key = (key or "").strip()
    return bool(key) and not _PLACEHOLDER.match(key)


def provider() -> str:
    """Which service will speak, or "" when the browser has to do it itself."""
    s = get_settings()
    choice = (s.tts_provider or "auto").strip().lower()
    if choice in ("", "off", "none", "browser"):
        return ""
    keys = {
        "elevenlabs": s.elevenlabs_api_key,
        "openai": s.openai_api_key,
        "groq": s.groq_api_key,
    }
    if choice != "auto":
        return choice if _usable(keys.get(choice, "")) else ""
    for name in ("elevenlabs", "openai", "groq"):
        if _usable(keys.get(name, "")):
            return name
    return ""


def voice_name(name: str = "") -> str:
    """The configured voice for whichever provider answers."""
    s = get_settings()
    which = name or provider()
    return {
        "elevenlabs": s.elevenlabs_voice_id,
        "openai": s.openai_tts_voice,
        "groq": s.groq_tts_voice,
    }.get(which, "")


def status() -> dict[str, Any]:
    """What the web app needs to decide between a real voice and the browser's."""
    which = provider()
    return {
        "tts": bool(which),
        "provider": which,
        "voice": voice_name(which),
        "max_chars": MAX_CHARS,
    }


def speakable(text: str) -> str:
    """Strip what is punctuation to the eye but noise to the ear.

    Coach summaries carry markdown and metric shorthand. Read aloud, an
    asterisk becomes a stumble and "WPM" becomes three letters, so the script
    is cleaned once here rather than in every caller.
    """
    out = str(text or "")
    out = re.sub(r"```.*?```", " ", out, flags=re.S)
    out = re.sub(r"[*_`#>]+", " ", out)
    # "(estimate)" is an honest hedge on a page you can scan. Spoken, it is a
    # word nobody says out loud, and it lands mid-sentence as a stumble. The
    # hedge itself is not dropped - spoken_coach says it in English instead.
    out = re.sub(r"\s*\((?:model\s+)?estimat\w*\.?\)", "", out, flags=re.I)
    out = re.sub(r"\bWPM\b", "words per minute", out, flags=re.I)
    # A dash between words is a held beat and becomes a comma. A dash inside a
    # word is part of the word: the old rule caught both, and turned
    # "mid-sentence" into "mid, sentence" and "twenty-five" into "twenty, five".
    out = re.sub(r"\s*[—–]\s*", ", ", out)
    out = re.sub(r"\s+-\s+", ", ", out)
    out = re.sub(r"\s+", " ", out).strip()
    return out[:MAX_CHARS]


def _cache_dir() -> Path:
    return get_settings().data_path / "tts"


def _cache_path(which: str, voice: str, text: str, ext: str) -> Path:
    digest = hashlib.sha256(f"{which}|{voice}|{text}".encode("utf-8")).hexdigest()[:32]
    return _cache_dir() / f"{digest}.{ext}"


def _prune(directory: Path) -> None:
    try:
        files = sorted(directory.glob("*.*"), key=lambda p: p.stat().st_mtime)
    except OSError:
        return
    for stale in files[:-CACHE_LIMIT]:
        try:
            stale.unlink()
        except OSError:
            pass


async def synthesize(text: str, voice: str = "") -> tuple[bytes, str] | None:
    """Speak one line. Returns (audio, mime), or None when the browser must.

    None is an answer, not a failure: every caller falls back to the browser's
    own speech synthesis, so a missing key, a spent quota and a dead network
    all land in the same place instead of leaving the coach silent.
    """
    line = speakable(text)
    if not line:
        return None
    which = provider()
    if not which:
        return None

    chosen = (voice or voice_name(which)).strip()
    ext = "wav" if which == "groq" else "mp3"
    mime = "audio/wav" if ext == "wav" else "audio/mpeg"
    cached = _cache_path(which, chosen, line, ext)
    try:
        if cached.exists() and cached.stat().st_size > 0:
            return cached.read_bytes(), mime
    except OSError:
        pass

    try:
        if which == "elevenlabs":
            audio = await _elevenlabs(line, chosen)
        elif which == "openai":
            audio = await _openai(line, chosen)
        else:
            audio = await _groq(line, chosen)
    except httpx.HTTPStatusError as exc:
        code = exc.response.status_code
        if code in (401, 403):
            _warn_once(f"tts-auth-{which}", f"{which} rejected the TTS key ({code}) - using the browser voice.")
        elif code == 429:
            _warn_once(f"tts-rate-{which}", f"{which} TTS rate limit or credit reached - using the browser voice.")
        else:
            _warn_once(f"tts-{which}-{code}", f"{which} TTS returned {code} - using the browser voice.")
        return None
    except (httpx.HTTPError, ssl.SSLError) as exc:
        _warn_once(f"tts-net-{which}", f"{which} TTS unreachable ({type(exc).__name__}) - using the browser voice.")
        return None

    if not audio:
        return None
    try:
        directory = _cache_dir()
        directory.mkdir(parents=True, exist_ok=True)
        cached.write_bytes(audio)
        _prune(directory)
    except OSError:
        # A read-only data dir costs a cache, not the feature.
        pass
    return audio, mime


async def _elevenlabs(line: str, voice: str) -> bytes:
    s = get_settings()
    voice_id = voice or "21m00Tcm4TlvDq8ikWAM"
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    payload = {
        "text": line,
        "model_id": s.elevenlabs_model,
        # A coach who sounds identical on every take reads as a recording. Some
        # style, and a stability below one, keeps the delivery alive without the
        # wobble that makes cheap speech synthesis obvious.
        "voice_settings": {
            "stability": 0.45,
            "similarity_boost": 0.8,
            "style": 0.35,
            "use_speaker_boost": True,
        },
    }
    headers = {"xi-api-key": s.elevenlabs_api_key, "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=s.tts_timeout, verify=_ssl_context()) as client:
        resp = await client.post(
            url, json=payload, headers=headers, params={"output_format": "mp3_44100_128"}
        )
        resp.raise_for_status()
        return resp.content


async def _openai(line: str, voice: str) -> bytes:
    s = get_settings()
    payload: dict[str, Any] = {
        "model": s.openai_tts_model,
        "voice": voice or "onyx",
        "input": line,
        "response_format": "mp3",
    }
    # Only the gpt-4o speech models accept delivery direction; sending it to
    # tts-1 is a 400, so the instruction rides on the model that understands it.
    if s.openai_tts_instructions and "gpt-4o" in s.openai_tts_model:
        payload["instructions"] = s.openai_tts_instructions
    headers = {"Authorization": f"Bearer {s.openai_api_key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=s.tts_timeout, verify=_ssl_context()) as client:
        resp = await client.post(
            f"{s.openai_base_url.rstrip('/')}/audio/speech", json=payload, headers=headers
        )
        resp.raise_for_status()
        return resp.content


async def _groq(line: str, voice: str) -> bytes:
    s = get_settings()
    payload = {
        "model": s.groq_tts_model,
        "voice": voice or "Fritz-PlayAI",
        "input": line,
        "response_format": "wav",
    }
    headers = {"Authorization": f"Bearer {s.groq_api_key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=s.tts_timeout, verify=_ssl_context()) as client:
        resp = await client.post(
            f"{s.groq_base_url.rstrip('/')}/audio/speech", json=payload, headers=headers
        )
        resp.raise_for_status()
        return resp.content
