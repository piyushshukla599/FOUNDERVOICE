"""Elite coach / investor / language / practice templates used when DeepSeek is unavailable.

Mirrors the DeepSeek output shape and coaching quality bar (observation → cause → fix)
using local metrics, events, and professional report data — no cloud call.
"""

from __future__ import annotations

import re
from collections import Counter
from typing import Any


def _fmt(v: Any, digits: int = 0) -> str:
    try:
        n = float(v)
    except (TypeError, ValueError):
        return "—"
    if digits == 0:
        return str(int(round(n)))
    return f"{n:.{digits}f}"


def _ts(start: Any, end: Any = None) -> str:
    try:
        s = float(start or 0)
    except (TypeError, ValueError):
        return "0:00"
    m, sec = divmod(int(s), 60)
    stamp = f"{m}:{sec:02d}"
    if end is not None:
        try:
            e = float(end)
            em, es = divmod(int(e), 60)
            stamp += f"–{em}:{es:02d}"
        except (TypeError, ValueError):
            pass
    return stamp


def _event_block(e: dict[str, Any], idx: int) -> list[str]:
    label = e.get("observation") or e.get("label") or f"Finding {idx}"
    cause = e.get("cause") or "Habit under cognitive load — not accent or biology."
    evidence = e.get("evidence") or (
        f"Timestamp {_ts(e.get('start'), e.get('end'))}; severity {e.get('severity', 0.5)}."
    )
    impact = e.get("impact") or "Listeners work harder; authority and clarity drop."
    fix = e.get("fix") or "Slow 10%; finish consonants; plant one planned pause."
    exercise = e.get("exercise") or "pause_drill_3"
    expected = e.get("expected_improvement") or "+6 Clarity, +5 Executive Presence (estimates)"
    return [
        f"Priority {idx}",
        "Observation",
        str(label),
        "Root Cause",
        str(cause),
        "Evidence",
        str(evidence),
        "Impact",
        str(impact),
        "Specific Exercise",
        f"{exercise} — {fix}",
        "Expected Improvement",
        str(expected),
        "",
    ]


def build_coach_summary(
    metrics: dict[str, Any],
    events: list[dict[str, Any]],
    memory: dict[str, Any],
    profile: dict[str, Any] | None = None,
    session_context: dict[str, Any] | None = None,
    transcript: str = "",
) -> str:
    ctx = session_context or {}
    mode = (ctx.get("mode") or "free").lower()
    focus = ctx.get("focus") or {}
    pro = ctx.get("professional") or {}
    lines: list[str] = []

    mode_label = {
        "exercise": "Labs drill",
        "practice": "Practice session",
        "listening": "Smart Session conversation",
        "pitch": "Pitch recording",
        "free": "Recording",
    }.get(mode, "Session")

    lines.append(f"Session type: {mode_label} (full local evaluation — same engine as Record).")
    if focus.get("exercise_title"):
        lines.append(f"Focus: {focus.get('exercise_title')}")
        if focus.get("exercise_description"):
            lines.append(f"Drill intent: {focus.get('exercise_description')}")
        if focus.get("focus_note"):
            lines.append(f"Context note: {str(focus.get('focus_note'))[:240]}")
    lines.append("")

    wpm = metrics.get("wpm") or 0
    clarity = metrics.get("clarity") or 0
    fillers = metrics.get("filler_count") or 0
    pause_q = metrics.get("pause_quality") or 0
    conf = metrics.get("confidence_est") or 0
    ep = metrics.get("executive_presence") or metrics.get("ceo_presence") or 0
    mono = metrics.get("monotone_score") or 0

    vq = (pro.get("voice_quality") or {}).get("score")
    proj = ((pro.get("projection") or {}).get("score") if isinstance(pro.get("projection"), dict) else None)
    habit = pro.get("one_habit_next") or "Finish every word clearly at a calm executive pace."

    lines.append("Session snapshot (estimates)")
    lines.append(
        f"Pace ~{_fmt(wpm)} WPM · Clarity {_fmt(clarity)} · Fillers {fillers} · "
        f"Pause quality {_fmt(pause_q)} · Confidence {_fmt(conf)} · "
        f"Executive Presence {_fmt(ep)}"
        + (f" · Voice quality {_fmt(vq)}" if vq is not None else "")
        + (f" · Projection {_fmt(proj)}" if proj is not None else "")
        + (f" · Monotone {_fmt(mono)}" if mono else "")
        + "."
    )
    lines.append("")

    # Practice / Labs focus judgment
    if mode in ("practice", "exercise"):
        lines.append("Focus evaluation")
        title = focus.get("exercise_title") or mode_label
        if mode == "practice" and "investor" in str(focus.get("exercise_key") or "").lower():
            lines.append(
                f"Investor answer practice ({title}): treat this as a high-stakes Q&A beat. "
                f"Clarity {_fmt(clarity)} and confidence {_fmt(conf)} matter more than length."
            )
            if float(wpm or 0) > 155:
                lines.append(
                    "You likely rushed the answer — investors hear uncertainty when pace spikes."
                )
            elif float(clarity or 0) >= 70 and float(conf or 0) >= 60:
                lines.append("Delivery held up under pressure — keep the same finish on consonants.")
            else:
                lines.append("Answer substance may be fine, but delivery still needs cleaner endings and pauses.")
        elif mode == "exercise":
            lines.append(
                f"Labs drill scored with the full Record engine. Hit the drill intent for “{title}”, "
                "but treat pace/clarity/presence gaps as real coaching targets."
            )
        lines.append("")

    ranked = sorted(events or [], key=lambda e: float(e.get("severity") or 0), reverse=True)
    top = ranked[:3]
    if not top:
        lines.extend(
            [
                "Priority 1",
                "Observation",
                "No major flagged events — keep consolidating calm pace and finished endings.",
                "Root Cause",
                "Consistency under load is the next lever, not a different voice.",
                "Evidence",
                f"WPM {_fmt(wpm)}; clarity {_fmt(clarity)}; fillers {fillers}.",
                "Impact",
                "Small drifts still compound across long pitches.",
                "Specific Exercise",
                f"pause_drill_3 — {habit}",
                "Expected Improvement",
                "+5 Clarity, +5 Pause Control (estimates)",
                "",
            ]
        )
    else:
        for i, e in enumerate(top, 1):
            lines.extend(_event_block(e, i))

    patterns = memory.get("top_patterns") or []
    if patterns:
        p = patterns[0]
        lines.append("Voice Memory")
        lines.append(
            f"Recurring pattern: {p.get('label')} (seen across ~{p.get('frequency')} sessions). "
            "Coach from your history — not generic tips."
        )
        lines.append("")

    if profile and profile.get("deltas"):
        top_delta = sorted(
            ((k, v) for k, v in (profile.get("deltas") or {}).items() if v is not None),
            key=lambda x: -abs(float(x[1])),
        )[:3]
        if top_delta:
            lines.append("Profile trend vs baseline")
            lines.append(
                ", ".join(f"{k.replace('_', ' ')} {float(v):+.0f}" for k, v in top_delta) + "."
            )
            lines.append("")

    if transcript.strip():
        excerpt = " ".join(transcript.split()[:40])
        if excerpt:
            lines.append("Transcript cue")
            lines.append(f"“{excerpt}{'…' if len(transcript.split()) > 40 else ''}”")
            lines.append("")

    lines.append("Daily habit")
    lines.append(habit if isinstance(habit, str) else "One habit: finish every word clearly today.")
    lines.append("")
    lines.append(
        "Coach source: AI Executive Coach (built-in elite template when cloud coach is offline). "
        "Scores and findings are local estimates."
    )
    return "\n".join(lines)


def build_listening_collection_note(
    metrics: dict[str, Any],
    events: list[dict[str, Any]],
) -> str:
    """Short note for Smart Session clips — full verdict unlocks after Voice Labs drill."""
    wpm = _fmt(metrics.get("wpm"))
    fillers = _fmt(metrics.get("filler_count"))
    clarity = _fmt(metrics.get("clarity"))
    top = events[0] if events else {}
    hint = top.get("fix") or "Complete today's Voice Labs drill to unlock your Founder Voice Verdict."
    return (
        "Smart Session clip collected (local analysis only).\n\n"
        f"Snapshot: {wpm} WPM · {fillers} fillers · {clarity} clarity (estimates).\n\n"
        f"Preview: {(top.get('observation') or top.get('label') or 'No major flags in this clip.')}\n\n"
        f"Next step: {hint}\n\n"
        "Full Founder Voice Verdict unlocks after you record today's exercise in Voice Labs."
    )


def build_pitch_scores(metrics: dict[str, Any], transcript: str = "") -> dict[str, Any]:
    clarity = float(metrics.get("clarity") or 60)
    conf = float(metrics.get("confidence_est") or 55)
    wpm = float(metrics.get("wpm") or 140)
    fillers = float(metrics.get("filler_count") or 0)
    pause_q = float(metrics.get("pause_quality") or 50)
    base = int(max(25, min(92, (clarity * 0.45 + conf * 0.35 + pause_q * 0.2))))

    # Pace penalty / reward
    if wpm > 165:
        base = max(25, base - 8)
    elif 125 <= wpm <= 145:
        base = min(92, base + 4)

    if fillers >= 8:
        base = max(25, base - 6)

    text = (transcript or "").lower()
    has_ask = any(k in text for k in ("raising", "ask", "seed", "series", "invest"))
    has_problem = any(k in text for k in ("problem", "pain", "challenge", "broken"))
    has_traction = any(k in text for k in ("revenue", "customers", "users", "growth", "mrr", "arr"))
    has_moat = any(k in text for k in ("moat", "defensib", "unique", "only", "proprietary"))
    has_solution = any(k in text for k in ("solution", "product", "we built", "platform"))

    hook = min(100, base + (6 if has_problem else -4))
    problem = min(100, base + (8 if has_problem else -6))
    solution = min(100, base + (5 if has_solution else -8))
    moat = min(100, base + (8 if has_moat else -12))
    traction = min(100, base + (10 if has_traction else -10))
    cta = min(100, base + (8 if has_ask else -10))
    closing = max(30, cta - 4)

    weakest = min(
        [
            ("hook", hook),
            ("problem", problem),
            ("solution", solution),
            ("moat", moat),
            ("traction", traction),
            ("ask/cta", cta),
        ],
        key=lambda x: x[1],
    )[0]

    avg_story = (hook + problem + solution + moat + traction + cta) / 6
    if avg_story >= 70 and conf >= 60:
        invest = "maybe"
    elif avg_story >= 55:
        invest = "maybe"
    else:
        invest = "no"
    if avg_story >= 78 and has_traction and has_ask:
        invest = "yes" if conf >= 65 else "maybe"

    return {
        "would_invest": invest,
        "confused_by": (
            "Differentiation vs alternatives is still fuzzy."
            if moat < 55
            else "Business impact of the technical claims could be sharper."
        ),
        "weakest_section": weakest,
        "attention_loss": (
            f"Around pace spikes (~{_fmt(wpm)} WPM) or filler bursts."
            if wpm > 155 or fillers >= 5
            else "Mid-pitch when structure softens."
        ),
        "strongest_answer": "Problem framing" if problem >= solution else "Solution narrative",
        "too_technical": (
            "Implementation detail without clear buyer/outcome language."
            if clarity < 65
            else "Mostly balanced — watch jargon density on the ask."
        ),
        "sounded_confident": conf >= 60,
        "ceo_presence": int(metrics.get("executive_presence") or metrics.get("ceo_presence") or base),
        "founder_trust": int(metrics.get("founder_trust") or max(40, base - 4)),
        "fundraising_readiness": max(30, base - (0 if has_ask else 8)),
        "demo_day_readiness": max(30, base - (0 if has_problem and has_solution else 6)),
        "yc_readiness": max(28, base - 10 + (5 if has_traction else 0)),
        "hook_strength": int(hook),
        "problem_clarity": int(problem),
        "solution_clarity": int(solution),
        "moat_clarity": int(moat),
        "traction_clarity": int(traction),
        "closing_effectiveness": int(closing),
        "cta_score": int(cta),
        "summary": (
            f"Local investor template (estimate): weakest area is {weakest}. "
            f"Presence ~{base}. "
            + ("Ask is detectable. " if has_ask else "Make the ask explicit. ")
            + ("Traction language present. " if has_traction else "Add concrete traction. ")
            + "Tighten structure; keep authentic voice."
        ),
    }


def build_language_insights(transcript: str) -> dict[str, Any]:
    words = [re.sub(r"[^a-zA-Z']", "", w).lower() for w in transcript.split()]
    words = [w for w in words if w]
    sentences = [s.strip() for s in re.split(r"[.!?]+", transcript) if s.strip()]
    avg_len = (len(words) / max(len(sentences), 1)) if words else 0
    unique_ratio = len(set(words)) / max(len(words), 1)

    counts = Counter(words)
    stop = {
        "the", "a", "an", "and", "or", "but", "to", "of", "in", "on", "for", "is", "are",
        "we", "our", "you", "i", "it", "that", "this", "with", "as", "at", "be", "by",
    }
    overused = [
        w for w, c in counts.most_common(12)
        if c >= 3 and w not in stop and len(w) > 3
    ][:6]

    # repeated bigrams
    bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words) - 1)]
    bi_counts = Counter(bigrams)
    repeated = [p for p, c in bi_counts.most_common(8) if c >= 2 and p.split()[0] not in stop][:5]

    passive_hits = len(re.findall(r"\b(was|were|been|being)\s+\w+ed\b", transcript.lower()))
    passive_note = (
        f"Detected ~{passive_hits} passive-leaning constructions (heuristic)."
        if passive_hits
        else "Little passive voice detected (heuristic)."
    )

    richness = int(unique_ratio * 100)
    complexity = min(100, int(avg_len * 4))
    readability = int(max(35, min(90, 100 - abs(avg_len - 14) * 3)))
    business = int(max(40, min(90, richness * 0.4 + readability * 0.3 + (100 - min(40, len(overused) * 5)) * 0.3)))
    investor = int(max(35, business - (8 if overused else 0) + (5 if any(k in transcript.lower() for k in ("market", "customer", "revenue")) else 0)))

    return {
        "grammar_score": 72,
        "vocabulary_richness": richness,
        "vocabulary_diversity": round(unique_ratio, 3),
        "sentence_complexity": complexity,
        "avg_sentence_length": round(avg_len, 1),
        "repeated_phrases": repeated,
        "passive_voice_note": passive_note,
        "overused_words": overused,
        "readability": readability,
        "business_language_quality": business,
        "investor_language_quality": investor,
        "notes": (
            "Local language template. "
            "Focus on cutting overused words and tightening sentence length for investor ears."
        ),
    }


_PRACTICE_QUESTIONS = [
    "What stops a well-funded incumbent from copying this in six months?",
    "Walk me through your last three customer conversations — what objection kept repeating?",
    "If I only remember one number from this pitch, what is it and why should I trust it?",
    "Who is the buyer, who is the user, and who blocks the budget?",
    "What did you try that failed, and what did that teach you about the market?",
    "Why now — what changed in the last 18 months that makes this inevitable?",
    "How do you lose? Paint the realistic failure case.",
    "Your traction slide — strip the vanity metrics. What is the hard proof?",
]


def build_practice_reply(
    history: list[dict[str, str]],
    pitch_context: str,
) -> dict[str, Any]:
    turns = [h for h in history if h.get("role") == "user"]
    n = len(turns)
    q = _PRACTICE_QUESTIONS[n % len(_PRACTICE_QUESTIONS)]

    last = (turns[-1].get("content") if turns else "") or ""
    words = last.split()
    wcount = len(words)
    conf = 58
    clarity = 60
    logic = 55
    persuasiveness = 52
    conciseness = 62

    if wcount > 120:
        conciseness = 40
        conf = 50
        critique = "That answer ran long — investors interrupt. Lead with the claim, then one proof."
    elif wcount < 12 and n > 0:
        clarity = 45
        logic = 45
        critique = "Too thin. I need a concrete example or number, not a slogan."
    elif any(x in last.lower() for x in ("um", "uh", "like", "basically")):
        conf = 48
        critique = "Fillers leaked into a high-stakes answer. Replace them with a silent beat."
    elif wcount >= 25:
        conf = 64
        clarity = 68
        logic = 62
        persuasiveness = 60
        critique = "Clearer. Now pressure-test the weakest assumption."
    else:
        critique = "Noted. Push harder on proof."

    ctx_hint = ""
    if pitch_context.strip():
        first = " ".join(pitch_context.split()[:18])
        ctx_hint = f" Given your context (“{first}…”),"

    if n == 0:
        reply = (
            f"Thanks for the setup.{ctx_hint} Before we go further — {q}"
        )
    else:
        reply = f"{critique} Follow-up: {q}"

    return {
        "reply": reply,
        "scores": {
            "confidence": conf,
            "clarity": clarity,
            "logic": logic,
            "persuasiveness": persuasiveness,
            "conciseness": conciseness,
        },
    }
