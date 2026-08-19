"""Founder Voice Verdict — final score after Smart Session + exercise/test (local, no LLM)."""

from __future__ import annotations

from typing import Any

from ..db import connect, dumps, loads, row_to_dict, utc_now
from . import coach_templates


def founder_voice_score(metrics: dict[str, Any]) -> int:
    """Composite 0–100 from local metrics only."""
    clarity = float(metrics.get("clarity") or 55)
    presence = float(metrics.get("executive_presence") or metrics.get("ceo_presence") or 55)
    conf = float(metrics.get("confidence_est") or 55)
    pause_q = float(metrics.get("pause_quality") or 50)
    filler_rate = float(metrics.get("filler_rate") or 0)
    wpm = float(metrics.get("wpm") or 140)

    filler_pen = min(18, filler_rate * 400)
    pace_pen = 8 if wpm > 165 else (4 if wpm > 155 else 0)
    pace_bonus = 4 if 125 <= wpm <= 145 else 0

    raw = clarity * 0.28 + presence * 0.28 + conf * 0.22 + pause_q * 0.22
    return int(max(20, min(98, round(raw - filler_pen - pace_pen + pace_bonus))))


def _find_exercise_session(listening_id: str, exercise_session_id: str | None) -> dict[str, Any] | None:
    with connect() as conn:
        parent = row_to_dict(
            conn.execute("SELECT * FROM listening_sessions WHERE id=?", (listening_id,)).fetchone()
        )
        if not parent:
            return None
        started = parent.get("created_at") or ""

        if exercise_session_id:
            row = conn.execute(
                """
                SELECT s.*, m.wpm, m.filler_rate, m.pause_quality, m.clarity,
                       m.confidence_est, m.executive_presence
                FROM sessions s
                LEFT JOIN metrics m ON m.session_id = s.id
                WHERE s.id=? AND s.mode='exercise' AND s.status='ready'
                """,
                (exercise_session_id,),
            ).fetchone()
            return row_to_dict(row) if row else None

        row = conn.execute(
            """
            SELECT s.*, m.wpm, m.filler_rate, m.pause_quality, m.clarity,
                   m.confidence_est, m.executive_presence
            FROM sessions s
            LEFT JOIN metrics m ON m.session_id = s.id
            WHERE s.mode='exercise' AND s.status='ready' AND s.created_at >= ?
            ORDER BY s.created_at DESC LIMIT 1
            """,
            (started,),
        ).fetchone()
        return row_to_dict(row)


def build_founder_verdict(
    listening_id: str,
    *,
    exercise_session_id: str | None = None,
) -> dict[str, Any]:
    with connect() as conn:
        parent = row_to_dict(
            conn.execute("SELECT * FROM listening_sessions WHERE id=?", (listening_id,)).fetchone()
        )
        if not parent:
            raise ValueError("Listening session not found")

        conv_rows = conn.execute(
            """
            SELECT s.id, s.title, s.duration, s.status, s.exercise_key,
                   m.wpm, m.filler_rate, m.pause_quality, m.clarity,
                   m.confidence_est, m.executive_presence
            FROM sessions s
            LEFT JOIN metrics m ON m.session_id = s.id
            WHERE s.listening_session_id=? AND s.status='ready'
            ORDER BY s.created_at ASC
            """,
            (listening_id,),
        ).fetchall()
        conversations = [row_to_dict(r) for r in conv_rows]

    exercise = _find_exercise_session(listening_id, exercise_session_id)
    if not exercise:
        return {
            "status": "pending",
            "headline": "Complete today's Voice Labs drill to unlock your Founder Voice Verdict.",
            "why": (
                "Smart Session collected how you speak in real discussions. "
                "A short exercise/test proves whether you can fix your top weakness on demand."
            ),
            "listening_clips": len(conversations),
            "exercise_required": True,
            "cta": "Go to Voice Labs → do today's drill → record it.",
        }

    # Blend listening averages with exercise session (exercise weighted higher for verdict)
    listen_metrics: dict[str, float] = {}
    if conversations:
        for key in ("wpm", "filler_rate", "pause_quality", "clarity", "confidence_est", "executive_presence"):
            vals = [float(c[key]) for c in conversations if c.get(key) is not None]
            if vals:
                listen_metrics[key] = sum(vals) / len(vals)

    blended: dict[str, Any] = {}
    for key in ("wpm", "filler_rate", "pause_quality", "clarity", "confidence_est", "executive_presence"):
        lv = listen_metrics.get(key)
        ev = exercise.get(key)
        if lv is not None and ev is not None:
            blended[key] = round(lv * 0.4 + float(ev) * 0.6, 2)
        elif ev is not None:
            blended[key] = float(ev)
        elif lv is not None:
            blended[key] = lv

    score = founder_voice_score(blended)
    exercise_score = founder_voice_score(
        {k: exercise.get(k) for k in blended if exercise.get(k) is not None}
    )

    insights: list[str] = []
    wpm = blended.get("wpm")
    if wpm and wpm > 155:
        insights.append(
            f"You rush in real talk (avg ~{int(wpm)} WPM). Slow your first sentence; plant one pause after the hook."
        )
    filler = blended.get("filler_rate")
    if filler and filler > 0.035:
        insights.append("Fillers spike under pressure — replace with a silent breath before technical points.")
    clarity = blended.get("clarity")
    if clarity and clarity < 62:
        insights.append("Articulation drops in longer explanations — finish consonants on key terms.")
    presence = blended.get("executive_presence")
    if presence and presence < 58:
        insights.append("Executive presence reads low — project from chest, not throat; fix mic distance.")
    if not insights:
        insights.append("Solid baseline today. Keep pace steady and mark pauses before big claims.")

    exercise_delta = exercise_score - score
    if exercise_delta >= 5:
        verdict_line = (
            f"Your drill scored higher than real talk (+{exercise_delta} pts) — "
            "you know what good sounds like; now carry it into meetings."
        )
    elif exercise_delta <= -8:
        verdict_line = (
            "Real conversations outscore your drill — practice the exercise slower until it matches meeting pace."
        )
    else:
        verdict_line = "Your real talk and drill are aligned — repeat this daily to lock the habit."

    fix = insights[0].split("—")[-1].strip() if "—" in insights[0] else insights[0]
    device = parent.get("device_label") or "your microphone"

    verdict = {
        "status": "ready",
        "founder_voice_score": score,
        "exercise_score": exercise_score,
        "headline": _headline(score),
        "verdict": verdict_line,
        "insights": insights[:3],
        "top_fix": fix,
        "daily_habit": "Mark one 0.7s pause before your main point today.",
        "listening_clips": len(conversations),
        "exercise_session_id": exercise.get("id"),
        "exercise_title": exercise.get("title") or exercise.get("exercise_key") or "Voice Labs drill",
        "device_label": device,
        "mic_note": _mic_note(device),
        "generated_at": utc_now(),
        "cost": "local",
    }

    summary = loads(parent.get("summary_json"), {}) or {}
    summary["verdict"] = verdict
    summary["verdict_status"] = "ready"

    with connect() as conn:
        conn.execute(
            "UPDATE listening_sessions SET summary_json=? WHERE id=?",
            (dumps(summary), listening_id),
        )
        conn.commit()

    return verdict


def _headline(score: int) -> str:
    if score >= 80:
        return "Strong founder voice today — clear, controlled, credible."
    if score >= 65:
        return "Good foundation — one habit away from sounding executive."
    if score >= 50:
        return "Founder voice is developing — pace and pauses need work."
    return "Early stage — daily drills will move this fast."


def _mic_note(device_label: str) -> str:
    low = (device_label or "").lower()
    if any(k in low for k in ("airpods", "earbud", "buds", "galaxy buds", "pixel buds")):
        return "Earbuds detected — keep mic near mouth; avoid rubbing cable noise."
    if any(k in low for k in ("headset", "headphone", "jabra", "logitech", "hyperx")):
        return "Headset mic — stable for long sessions; check boom position 2 fingers from corner of mouth."
    if any(k in low for k in ("built-in", "internal", "array", "realtek")):
        return "Built-in mic — sit closer; reduce keyboard/fan noise; earbuds recommended for calls."
    if "bluetooth" in low or "bt " in low:
        return "Bluetooth mic — watch for latency drops; wired backup helps if audio cuts."
    return "Tip: same mic for Smart Session + drills keeps scores comparable."
