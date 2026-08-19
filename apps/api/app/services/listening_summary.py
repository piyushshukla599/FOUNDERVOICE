"""Build end-of-day Smart Session Listening summaries from local conversation metrics."""

from __future__ import annotations

from typing import Any

from ..db import connect, dumps, row_to_dict, utc_now


def _fmt_duration(sec: float) -> str:
    sec = max(0, int(sec or 0))
    h, rem = divmod(sec, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h}h {m:02d}m"
    if m:
        return f"{m}m {s:02d}s"
    return f"{s}s"


def build_listening_summary(listening_id: str) -> dict[str, Any]:
    with connect() as conn:
        parent = row_to_dict(
            conn.execute("SELECT * FROM listening_sessions WHERE id=?", (listening_id,)).fetchone()
        )
        if not parent:
            raise ValueError("Listening session not found")

        rows = conn.execute(
            """
            SELECT s.*, m.wpm, m.filler_rate, m.pause_quality, m.clarity,
                   m.confidence_est, m.executive_presence, m.grammar_score
            FROM sessions s
            LEFT JOIN metrics m ON m.session_id = s.id
            WHERE s.listening_session_id=?
            ORDER BY s.created_at ASC
            """,
            (listening_id,),
        ).fetchall()
        conversations = [row_to_dict(r) for r in rows]

        patterns = [
            row_to_dict(r)
            for r in conn.execute(
                "SELECT key, label, frequency, trend FROM patterns ORDER BY frequency DESC LIMIT 8"
            ).fetchall()
        ]

    ended = parent.get("ended_at") or utc_now()
    started = parent.get("created_at") or ended
    try:
        from datetime import datetime

        t0 = datetime.fromisoformat(started.replace("Z", "+00:00"))
        t1 = datetime.fromisoformat(ended.replace("Z", "+00:00"))
        session_duration = max(0.0, (t1 - t0).total_seconds())
    except Exception:  # noqa: BLE001
        session_duration = float(parent.get("speaking_time_sec") or 0)

    done = [c for c in conversations if c.get("status") == "ready"]
    speaking_time = sum(float(c.get("duration") or 0) for c in conversations)
    wpms = [float(c["wpm"]) for c in done if c.get("wpm") is not None]
    avg_wpm = round(sum(wpms) / len(wpms), 1) if wpms else None

    # Weakness from most frequent Voice Memory pattern or filler/pace heuristics
    common_weakness = "Not enough data yet — keep listening to build Voice Memory."
    if patterns:
        top = patterns[0]
        common_weakness = f"{top.get('label') or top.get('key')} (seen {top.get('frequency')}×)."
    elif done:
        high_filler = [c for c in done if (c.get("filler_rate") or 0) > 0.04]
        fast = [c for c in done if (c.get("wpm") or 0) > 155]
        if fast:
            common_weakness = "Speaking too fast while explaining — especially in longer conversations."
        elif high_filler:
            common_weakness = "Filler words under pressure — pause instead of filling silence."

    improved = "Keep practicing — deltas appear after a few sessions."
    pause_vals = [float(c["pause_quality"]) for c in done if c.get("pause_quality") is not None]
    if len(pause_vals) >= 2 and pause_vals[-1] > pause_vals[0]:
        delta = round((pause_vals[-1] - pause_vals[0]) * 100)
        improved = f"Pause Quality (+{delta}% across today's conversations)."
    elif len(wpms) >= 2 and wpms[-1] < wpms[0] - 5:
        improved = f"Speaking rate control (avg WPM {wpms[0]:.0f} → {wpms[-1]:.0f})."

    roi = "Pause one second before introducing technical concepts."
    if avg_wpm and avg_wpm > 150:
        roi = "Mark a 0.6–0.8s pause after each claim; target 130–140 WPM on technical sections."
    elif patterns and "filler" in (patterns[0].get("key") or ""):
        roi = "Replace fillers with a silent breath — practice Filler Fast (60s)."

    from . import lab_coach

    catalog = lab_coach.exercise_catalog()
    lab_recs = lab_coach.recommend_labs_from_memory(patterns, catalog)
    if avg_wpm and avg_wpm > 155:
        extra = lab_coach.recommend_labs_from_events(
            [],
            {"wpm": avg_wpm},
            catalog=catalog,
            limit=1,
        )
        keys = {r["key"] for r in lab_recs}
        lab_recs = extra + [r for r in lab_recs if r["key"] not in keys]
    lab_recs = lab_recs[:3]

    # Pull first coach insight from latest ready conversation
    latest_coach = None
    for c in reversed(done):
        if c.get("coach_summary"):
            latest_coach = (c["coach_summary"] or "").split("\n")[0][:220]
            break

    summary = {
        "session_duration_sec": session_duration,
        "session_duration_label": _fmt_duration(session_duration),
        "meaningful_conversations": len(conversations),
        "analyzed_conversations": len(done),
        "speaking_time_sec": speaking_time,
        "speaking_time_label": _fmt_duration(speaking_time),
        "average_wpm": avg_wpm,
        "most_common_weakness": common_weakness,
        "most_improved_skill": improved,
        "highest_roi_recommendation": roi,
        "lab_recs": lab_recs,
        "latest_coach_line": latest_coach,
        "verdict_status": "pending",
        "verdict": {
            "status": "pending",
            "headline": "Complete today's Voice Labs drill to unlock your Founder Voice Verdict.",
            "why": (
                "Smart Session collected how you speak in real discussions. "
                "Record today's exercise to get your final verdict."
            ),
            "listening_clips": len(done),
            "exercise_required": True,
            "cta": "Voice Labs → today's drill → record.",
        },
        "device_label": parent.get("device_label"),
        "conversations": [
            {
                "id": c["id"],
                "title": c.get("title"),
                "created_at": c.get("created_at"),
                "duration": c.get("duration"),
                "status": c.get("status"),
                "wpm": c.get("wpm"),
                "conversation_index": c.get("conversation_index"),
            }
            for c in conversations
        ],
    }

    with connect() as conn:
        conn.execute(
            """
            UPDATE listening_sessions
            SET summary_json=?, conversation_count=?, speaking_time_sec=?, status=?, ended_at=COALESCE(ended_at, ?)
            WHERE id=?
            """,
            (
                dumps(summary),
                len(conversations),
                speaking_time,
                "ended",
                utc_now(),
                listening_id,
            ),
        )
        conn.commit()

    return summary
