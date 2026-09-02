"""Turn a finished session into something a coach would say out loud.

The written report and the spoken one are not the same artefact. A report can
open with a table of six metrics; a coach who opens that way has lost you by
the third number. So this does not read `coach_summary` aloud - it builds a
separate script from the same evidence, with the shape a person uses:

    verdict -> the one number that matters -> what went wrong -> why it went
    wrong -> what to do instead -> which lab fixes it -> go again

Every line is one idea, short enough to land and short enough to bill cheaply
(see ``tts.MAX_CHARS``). The rule templates below are the real implementation,
not a fallback of last resort: they always run, they are what gets spoken with
no API key, and when DeepSeek is configured it *rewrites* them line for line
rather than inventing a script of its own. That keeps the spoken coaching tied
to the same findings as the written coaching - a voice that contradicts the
report on screen is worse than no voice.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from . import tts

logger = logging.getLogger(__name__)

# The visitor waits through every line, so the script has a hard ceiling. Two
# findings coached properly beats five listed.
MAX_ISSUES = 2

SYSTEM_SPEAK = """You are an elite speaking coach talking to a founder, out loud, in the room.
You are rewriting lines that will be read by a text-to-speech voice.

Rules:
- Keep exactly the same number of lines, in the same order, saying the same thing.
- Never add a finding, a number, or a claim that is not already in the line you were given.
- Spoken English: contractions, second person, one idea per line, under 30 words.
- No markdown, no bullet characters, no headings, no emoji, no stage directions.
- Do not greet twice, do not sign off, do not mention that you are an AI.
Return ONLY a JSON array of strings, same length as the input array."""


def _num(value: Any, default: float | None = None) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _line(line_id: str, kind: str, text: str, **meta: Any) -> dict[str, Any]:
    return {"id": line_id, "kind": kind, "text": tts.speakable(text), **meta}


def _sentence(text: str) -> str:
    """Findings are written as mid-sentence fragments; spoken, they start one."""
    text = text.strip()
    if not text:
        return ""
    return text[0].upper() + text[1:]


def _clause(text: str) -> str:
    """The reverse: a finding label continuing a sentence someone has begun.

    Labels are stored capitalised ("Missing pause in long stretch") because
    they head a card in the report. Read out after "The main thing:" that
    capital does nothing, so it goes - unless the word is an acronym or a
    product name, which the second character gives away.
    """
    text = text.strip().rstrip(".")
    if not text or (len(text) > 1 and text[1].isupper()):
        return text
    return text[0].lower() + text[1:]


def _group(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Collapse repeats into one finding that knows how often it happened.

    The analyser emits one event per occurrence, so a founder who never pauses
    gets six identical "missing pause" findings. Read aloud that is the coach
    saying the same sentence six times; counted, it becomes the evidence.
    """
    grouped: dict[str, dict[str, Any]] = {}
    for event in events:
        key = str(event.get("kind") or event.get("label") or "").strip().lower()
        if not key:
            continue
        seen = grouped.get(key)
        if seen is None:
            grouped[key] = {**event, "_count": 1}
            continue
        seen["_count"] += 1
        # Keep the worst instance: it is the one worth describing.
        if (_num(event.get("severity"), 0) or 0) > (_num(seen.get("severity"), 0) or 0):
            grouped[key] = {**event, "_count": seen["_count"]}
    return sorted(grouped.values(), key=lambda e: -(_num(e.get("severity"), 0.5) or 0.5))


def brief_lines(seconds: int = 45, name: str = "") -> list[dict[str, Any]]:
    """What the coach says before the clock starts.

    Spoken, not written, because the founder is about to look away from the
    screen - that is the whole point of the drill.
    """
    who = f" {name.strip()}" if name.strip() else ""
    return [
        _line("brief-1", "open", f"Alright{who}. You have {seconds} seconds to pitch me."),
        _line("brief-2", "open", "Who it's for, what it does, why now, and what you want from me."),
        _line("brief-3", "open", "Don't read. Talk to me like I'm across the table. Starting now."),
    ]


def _verdict(score: int) -> str:
    if score >= 82:
        return "That was strong. You sounded like someone who has run this pitch before."
    if score >= 70:
        return "Solid. The pitch is there. The delivery is what's costing you."
    if score >= 58:
        return "It's rough, but it's fixable. The content held up better than the voice did."
    return "Honestly, that one got away from you. Let's find out where."


def _pace_note(wpm: float | None) -> str:
    if wpm is None:
        return ""
    speed = int(round(wpm))
    if wpm > 168:
        return f"You ran at about {speed} words a minute. That's a pitch under pressure, not a pitch in control."
    if wpm > 152:
        return f"About {speed} words a minute. A shade fast, so your best lines don't get room to land."
    if wpm < 105:
        return f"About {speed} words a minute. That's careful, and careful reads as unsure."
    return f"About {speed} words a minute, which is a good room pace. Keep that."


def build_script(
    session: dict[str, Any] | None,
    metrics: dict[str, Any] | None,
    events: list[dict[str, Any]] | None,
    lab_recs: list[dict[str, Any]] | None,
    *,
    seconds: int | None = None,
) -> list[dict[str, Any]]:
    """The spoken review, as ordered lines the player speaks one at a time."""
    from .founder_verdict import founder_voice_score

    m = dict(metrics or {})
    sess = dict(session or {})
    ranked = _group([e for e in (events or []) if e.get("label") or e.get("observation")])
    score = founder_voice_score(m)
    lines: list[dict[str, Any]] = []

    spoken_for = seconds or int(_num(sess.get("duration"), 0) or 0)
    opener = "Okay. Here's what I heard."
    if spoken_for:
        opener = f"Okay, {spoken_for} seconds. Here's what I heard."
    lines.append(_line("open", "open", opener))
    lines.append(_line("verdict", "verdict", _verdict(score), score=score))

    pace = _pace_note(_num(m.get("wpm")))
    if pace:
        lines.append(_line("pace", "read", pace))

    fillers = _num(m.get("filler_count"))
    if fillers and fillers >= 3:
        count = int(fillers)
        lines.append(
            _line(
                "fillers",
                "read",
                f"I counted {count} filler words. Every one of them is a place you could have "
                "just stopped talking for half a second.",
            )
        )

    for idx, event in enumerate(ranked[:MAX_ISSUES], start=1):
        headline = str(event.get("observation") or event.get("label") or "").strip()
        cause = str(event.get("cause") or "").strip()
        fix = str(event.get("fix") or "").strip()
        lead = "The main thing" if idx == 1 else "The other one"
        times = int(event.get("_count") or 1)
        if headline:
            said = f"{lead}: {_clause(headline)}."
            if times > 1:
                said += f" That happened {times} times in one take."
            lines.append(_line(f"issue-{idx}", "issue", said, severity=_num(event.get("severity"), 0.5)))
        if cause:
            lines.append(
                _line(f"cause-{idx}", "cause", f"That's not your voice, that's a habit. {_sentence(cause)}")
            )
        if fix:
            lines.append(_line(f"fix-{idx}", "fix", f"So next take, {fix[0].lower()}{fix[1:]}"))

    if not ranked:
        lines.append(
            _line(
                "issue-none",
                "issue",
                "Nothing in there broke. That means the next gain is range, not repair.",
            )
        )

    lab = (lab_recs or [None])[0]
    if lab:
        title = str(lab.get("title") or "").strip()
        sound = str(lab.get("sound") or "").strip()
        fix_line = str(lab.get("fix_line") or "").strip()
        if sound:
            lines.append(_line("lab-why", "lab", sound, lab_key=lab.get("key")))
        lines.append(
            _line(
                "lab",
                "lab",
                fix_line or f"Go do the {title} lab. Two minutes, then pitch me again.",
                lab_key=lab.get("key"),
                lab_title=title,
            )
        )

    lines.append(
        _line(
            "close",
            "close",
            "Then run it again. Same 45 seconds, same pitch, one thing changed. That's how this moves.",
        )
    )
    return [ln for ln in lines if ln["text"]]


async def humanize(lines: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Let DeepSeek rewrite the templates into speech, without changing them.

    Any drift in shape - wrong length, non-JSON, an empty line - and the
    templates are kept as-is. A rewrite that loses a finding is worse than a
    stiff line that keeps it.
    """
    from .deepseek import deepseek_chat

    if not lines:
        return lines
    payload = json.dumps([ln["text"] for ln in lines], ensure_ascii=False)
    raw = await deepseek_chat(
        [
            {"role": "system", "content": SYSTEM_SPEAK},
            {"role": "user", "content": payload},
        ],
        temperature=0.6,
        max_tokens=900,
    )
    if not raw:
        return lines
    cleaned = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.M).strip()
    try:
        rewritten = json.loads(cleaned)
    except ValueError:
        logger.debug("Spoken rewrite was not JSON, keeping the templates.")
        return lines
    if not isinstance(rewritten, list) or len(rewritten) != len(lines):
        return lines
    out: list[dict[str, Any]] = []
    for original, replacement in zip(lines, rewritten):
        text = tts.speakable(replacement if isinstance(replacement, str) else "")
        out.append({**original, "text": text or original["text"]})
    return out
