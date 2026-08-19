from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from ..db import connect, dumps, loads, row_to_dict, utc_now


PATTERN_RULES = [
    {
        "key": "rush_on_intro",
        "label": "You rush during introductions",
        "match": lambda e, m: e["kind"] == "too_fast" and (e.get("start") or 0) < 25,
    },
    {
        "key": "filler_overuse",
        "label": "Filler words show up often",
        "match": lambda e, m: e["kind"] == "filler",
    },
    {
        "key": "drop_technical_endings",
        "label": "Technical words often sound unclear",
        "match": lambda e, m: e["kind"] == "pronunciation_issue",
    },
    {
        "key": "monotone",
        "label": "Delivery trends monotone",
        "match": lambda e, m: e["kind"] == "monotone",
    },
    {
        "key": "missing_pauses",
        "label": "You skip pauses in dense sections",
        "match": lambda e, m: e["kind"] == "missing_pause",
    },
    {
        "key": "confidence_drop_qa",
        "label": "Confidence dips show up in delivery",
        "match": lambda e, m: e["kind"] in ("too_quiet_variable", "long_pause") and (m.get("confidence_est") or 100) < 55,
    },
]


def update_voice_memory(session_id: str, events: list[dict[str, Any]], metrics: dict[str, Any]) -> list[dict[str, Any]]:
    touched = []
    with connect() as conn:
        for rule in PATTERN_RULES:
            hits = [e for e in events if rule["match"](e, metrics)]
            if not hits:
                continue
            row = conn.execute("SELECT * FROM patterns WHERE key = ?", (rule["key"],)).fetchone()
            now = utc_now()
            if row:
                freq = int(row["frequency"]) + len(hits)
                evidence = loads(row["evidence_json"], []) or []
                evidence.append({"session_id": session_id, "count": len(hits), "at": now})
                evidence = evidence[-20:]
                prev = int(row["frequency"])
                trend = (freq - prev) / max(prev, 1)
                conn.execute(
                    """
                    UPDATE patterns SET frequency=?, trend=?, last_seen=?, evidence_json=?, label=?
                    WHERE key=?
                    """,
                    (freq, trend, now, dumps(evidence), rule["label"], rule["key"]),
                )
            else:
                conn.execute(
                    """
                    INSERT INTO patterns (key, label, frequency, trend, last_seen, evidence_json)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        rule["key"],
                        rule["label"],
                        len(hits),
                        1.0,
                        now,
                        dumps([{"session_id": session_id, "count": len(hits), "at": now}]),
                    ),
                )
            touched.append(rule["key"])
        conn.commit()
    return touched


def get_memory_snapshot() -> dict[str, Any]:
    with connect() as conn:
        patterns = [row_to_dict(r) for r in conn.execute(
            "SELECT * FROM patterns ORDER BY frequency DESC LIMIT 10"
        ).fetchall()]
        sessions = conn.execute(
            """
            SELECT s.id, s.created_at, s.duration, s.mode, m.wpm, m.filler_count, m.clarity,
                   m.confidence_est, m.pause_quality, m.executive_presence, m.fundraising_readiness, m.filler_rate
            FROM sessions s
            LEFT JOIN metrics m ON m.session_id = s.id
            WHERE s.status = 'ready'
            ORDER BY s.created_at DESC
            LIMIT 60
            """
        ).fetchall()
        rows = [row_to_dict(r) for r in sessions]

    def window(days: int) -> list[dict[str, Any]]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        out = []
        for r in rows:
            try:
                ts = datetime.fromisoformat(r["created_at"].replace("Z", "+00:00"))
            except Exception:  # noqa: BLE001
                continue
            if ts >= cutoff:
                out.append(r)
        return out

    def avg(items: list[dict[str, Any]], key: str) -> float | None:
        vals = [float(i[key]) for i in items if i.get(key) is not None]
        return round(sum(vals) / len(vals), 2) if vals else None

    summary = {}
    for days in (7, 30, 60):
        w = window(days)
        summary[f"{days}d"] = {
            "sessions": len(w),
            "wpm": avg(w, "wpm"),
            "filler_count": avg(w, "filler_count"),
            "filler_rate": avg(w, "filler_rate"),
            "clarity": avg(w, "clarity"),
            "confidence_est": avg(w, "confidence_est"),
            "pause_quality": avg(w, "pause_quality"),
            "executive_presence": avg(w, "executive_presence"),
            "fundraising_readiness": avg(w, "fundraising_readiness"),
        }

    insights = []
    if summary["60d"]["wpm"] and summary["7d"]["wpm"]:
        delta = summary["7d"]["wpm"] - summary["60d"]["wpm"]
        insights.append(
            f"Average speaking speed moved from {summary['60d']['wpm']} WPM (60d) to {summary['7d']['wpm']} WPM (7d) ({delta:+.1f})."
        )
    if patterns:
        insights.append(f"Top recurring pattern: {patterns[0]['label']} (x{patterns[0]['frequency']}).")

    return {
        "top_patterns": patterns,
        "windows": summary,
        "recent_sessions": rows[:12],
        "insights": insights,
    }


def dashboard_series() -> dict[str, Any]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT s.created_at, m.wpm, m.filler_count, m.clarity, m.confidence_est,
                   m.pause_quality, m.pitch_stability, m.executive_presence, m.fundraising_readiness,
                   m.grammar_score, m.vocabulary_diversity
            FROM sessions s
            JOIN metrics m ON m.session_id = s.id
            WHERE s.status = 'ready'
            ORDER BY s.created_at ASC
            """
        ).fetchall()
    series = [row_to_dict(r) for r in rows]
    return {"series": series}


def streak_days() -> int:
    with connect() as conn:
        rows = conn.execute(
            "SELECT DISTINCT substr(completed_at, 1, 10) AS d FROM exercise_completions ORDER BY d DESC"
        ).fetchall()
    if not rows:
        return 0
    days = [r["d"] for r in rows]
    streak = 0
    cur = datetime.now(timezone.utc).date()
    for d in days:
        day = datetime.fromisoformat(d).date()
        if day == cur or day == cur - timedelta(days=streak):
            if day == cur - timedelta(days=streak):
                streak += 1
                continue
            if day == cur and streak == 0:
                streak = 1
                continue
        break
    return streak
