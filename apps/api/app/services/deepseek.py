from __future__ import annotations

import logging
from typing import Any

import httpx
import ssl

from ..config import get_settings
from . import coach_templates

logger = logging.getLogger(__name__)


def _ssl_context() -> ssl.SSLContext:
    from .. import ssl_fix

    return ssl_fix.client_ssl_context()


SYSTEM_COACH = """You are FounderVoice AI — an elite executive speech coach.
Never give generic advice. Never claim to change the user's natural voice, accent, or biology.
Improvements come from breathing, resonance, articulation, pacing, projection, emphasis, confidence, and habits.

Always structure EACH priority finding as plain text sections with these labels on their own lines:
Observation
Root Cause
Evidence
Impact
Specific Exercise
Expected Improvement

Do NOT use markdown: no # headings, no **bold**, no bullet symbols required, no code fences.
Use short paragraphs under each label. Be concrete with metrics/timestamps.
Label uncertain scores as estimates. Cite Voice Memory / Voice Profile when provided."""


_WARNED: set[str] = set()


def _warn_once(key: str, message: str) -> None:
    """One line per failure kind per process — a broken key should not flood the log."""
    if key in _WARNED:
        return
    _WARNED.add(key)
    logger.warning(message)


async def deepseek_chat(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.4,
    max_tokens: int = 2048,
) -> str:
    settings = get_settings()
    if not settings.deepseek_api_key or settings.deepseek_api_key.startswith("sk-your"):
        return ""

    url = f"{settings.deepseek_base_url.rstrip('/')}/v1/chat/completions"
    payload = {
        "model": settings.deepseek_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    headers = {
        "Authorization": f"Bearer {settings.deepseek_api_key}",
        "Content-Type": "application/json",
    }
    # Every caller treats "" as "the model is unavailable" and falls back to a
    # rule template. A rejected key, a dead network or a malformed body are all
    # that same condition — letting them raise turns an optional enhancement
    # into a 500 and takes the whole feature down.
    try:
        async with httpx.AsyncClient(timeout=120.0, verify=_ssl_context()) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return (data["choices"][0]["message"]["content"] or "").strip()
    except httpx.HTTPStatusError as exc:
        code = exc.response.status_code
        if code in (401, 403):
            _warn_once("deepseek-auth", f"DeepSeek rejected the API key ({code}) — using rule templates.")
        elif code == 429:
            _warn_once("deepseek-rate", "DeepSeek rate limit or credit exhausted — using rule templates.")
        else:
            _warn_once(f"deepseek-{code}", f"DeepSeek returned {code} — using rule templates.")
        return ""
    except (httpx.HTTPError, ssl.SSLError) as exc:
        _warn_once("deepseek-net", f"DeepSeek unreachable ({type(exc).__name__}) — using rule templates.")
        return ""
    except (KeyError, IndexError, ValueError):
        _warn_once("deepseek-shape", "DeepSeek returned an unexpected body — using rule templates.")
        return ""


async def generate_coach_summary(
    transcript: str,
    metrics: dict[str, Any],
    events: list[dict[str, Any]],
    memory: dict[str, Any],
    profile: dict[str, Any] | None = None,
    goal: dict[str, str] | None = None,
    session_context: dict[str, Any] | None = None,
) -> str:
    top_events = events[:12]
    ctx = session_context or {}
    mode = ctx.get("mode") or "free"
    focus = ctx.get("focus") or {}
    user = (
        "Produce an elite coach summary (max 500 words) for this speaking session.\n"
        "Use labeled sections Observation / Root Cause / Evidence / Impact / Specific Exercise / "
        "Expected Improvement for the top 1–3 findings. End with one daily habit.\n"
        "Plain text only — no markdown syntax.\n"
        "IMPORTANT: If SESSION MODE is exercise (Labs), coach ONLY the chosen drill specialty. "
        "Do not contradict the drill. Do not grade them as a failed founder. Help them succeed at THIS lab. "
        "Use Voice Memory only to explain why this lab fits — other weaknesses wait for other labs.\n"
        f"SESSION MODE: {mode}\n"
        f"SESSION FOCUS: {focus}\n"
        f"GOAL: {goal or {'goal_key': 'executive_presence'}}\n"
        f"VOICE PROFILE (estimates):\n{(profile or {}).get('scores')}\n"
        f"PROFILE DELTAS vs baseline:\n{(profile or {}).get('deltas')}\n"
        f"HARD WORDS:\n{(profile or {}).get('hard_words')}\n"
        f"METRICS:\n{metrics}\n\n"
        f"TOP FINDINGS:\n{top_events}\n\n"
        f"VOICE MEMORY:\n{memory}\n\n"
        f"TRANSCRIPT (excerpt):\n{transcript[:6000]}\n"
    )
    text = await deepseek_chat(
        [{"role": "system", "content": SYSTEM_COACH}, {"role": "user", "content": user}]
    )
    if text:
        return text
    return coach_templates.build_coach_summary(
        metrics, events, memory, profile, session_context=ctx, transcript=transcript
    )


async def analyze_pitch_with_llm(transcript: str, metrics: dict[str, Any]) -> dict[str, Any]:
    user = (
        "You are a tough early-stage investor. Score this founder pitch.\n"
        "Return ONLY valid JSON with keys: would_invest (yes|maybe|no), confused_by (string), "
        "weakest_section (string), attention_loss (string), strongest_answer (string), "
        "too_technical (string), sounded_confident (boolean), ceo_presence (0-100), "
        "founder_trust (0-100), fundraising_readiness (0-100), demo_day_readiness (0-100), "
        "yc_readiness (0-100), hook_strength (0-100), problem_clarity (0-100), "
        "solution_clarity (0-100), moat_clarity (0-100), traction_clarity (0-100), "
        "closing_effectiveness (0-100), cta_score (0-100), summary (string).\n\n"
        f"METRICS:\n{metrics}\n\nTRANSCRIPT:\n{transcript[:8000]}"
    )
    text = await deepseek_chat(
        [
            {"role": "system", "content": "Return JSON only. No markdown."},
            {"role": "user", "content": user},
        ],
        temperature=0.3,
    )
    if not text:
        return coach_templates.build_pitch_scores(metrics, transcript)
    import json
    import re

    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return coach_templates.build_pitch_scores(metrics, transcript)
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return coach_templates.build_pitch_scores(metrics, transcript)


async def practice_investor_reply(
    history: list[dict[str, str]],
    pitch_context: str,
) -> dict[str, Any]:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a skeptical Series A investor doing a live pitch practice. "
                "Interrupt naturally, ask hard questions, push on moat/traction/market. "
                "After each founder answer, briefly critique. "
                "Also return a trailing JSON block with scores: "
                '{"confidence":0-100,"clarity":0-100,"logic":0-100,"persuasiveness":0-100,"conciseness":0-100}.'
            ),
        },
        {"role": "user", "content": f"Pitch context:\n{pitch_context[:4000]}"},
        *history,
    ]
    text = await deepseek_chat(messages, temperature=0.7)
    if not text:
        return coach_templates.build_practice_reply(history, pitch_context)
    import json
    import re

    scores = {"confidence": 50, "clarity": 50, "logic": 50, "persuasiveness": 50, "conciseness": 50}
    match = re.search(r"\{[^{}]*confidence[^{}]*\}", text)
    if match:
        try:
            scores = {**scores, **json.loads(match.group(0))}
        except json.JSONDecodeError:
            pass
        text = text[: match.start()].strip()
    return {"reply": text, "scores": scores}


async def language_insights(transcript: str) -> dict[str, Any]:
    user = (
        "Analyze founder language quality. Return JSON only with: "
        "grammar_score, vocabulary_richness, vocabulary_diversity, sentence_complexity, "
        "avg_sentence_length, repeated_phrases (array), passive_voice_note, overused_words (array), "
        "readability, business_language_quality, investor_language_quality, notes (string). "
        "Scores 0-100.\n\n"
        f"TRANSCRIPT:\n{transcript[:7000]}"
    )
    text = await deepseek_chat(
        [{"role": "system", "content": "JSON only."}, {"role": "user", "content": user}],
        temperature=0.2,
    )
    if not text:
        return coach_templates.build_language_insights(transcript)
    import json
    import re

    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return coach_templates.build_language_insights(transcript)
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return coach_templates.build_language_insights(transcript)
