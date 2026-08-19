"""Personalized Voice Improvement Program + daily missions."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from ..db import connect, dumps, utc_now
from . import voice_profile

GOALS: list[dict[str, str]] = [
    {"key": "executive_presence", "label": "Executive Presence"},
    {"key": "investor_pitch", "label": "Investor Pitch"},
    {"key": "ted_style", "label": "TED Style"},
    {"key": "podcast_host", "label": "Podcast Host"},
    {"key": "conference_speaker", "label": "Conference Speaker"},
    {"key": "sales_leader", "label": "Sales Leader"},
    {"key": "interview_excellence", "label": "Interview Excellence"},
    {"key": "teacher", "label": "Teacher"},
    {"key": "public_speaking", "label": "Public Speaking"},
    {"key": "daily_communication", "label": "Daily Communication"},
]

# Goal → preferred weakness keys (coaching priorities)
GOAL_FOCUS: dict[str, list[str]] = {
    "executive_presence": ["authority", "pause_control", "projection", "clarity", "monotone"],
    "investor_pitch": ["clarity", "technical_communication", "pause_control", "authority", "rush"],
    "ted_style": ["storytelling", "pitch_range", "pause_control", "speaking_energy"],
    "podcast_host": ["voice_warmth", "conversation_flow", "breathing_quality", "monotone"],
    "conference_speaker": ["projection", "articulation", "pause_control", "speaking_energy"],
    "sales_leader": ["persuasiveness", "trustworthiness", "clarity", "conversation_flow"],
    "interview_excellence": ["clarity", "confidence", "pause_control", "articulation"],
    "teacher": ["clarity", "technical_communication", "pause_control", "articulation"],
    "public_speaking": ["projection", "storytelling", "pause_control", "authority"],
    "daily_communication": ["clarity", "conversation_flow", "breathing_quality", "articulation"],
}

WEAKNESS_CATALOG: dict[str, dict[str, Any]] = {
    "weak_projection": {
        "title": "Weak projection",
        "metric": "projection",
        "threshold": 62,
        "exercise_key": "projection_support",
        "why": "Volume fades or relies on throat tension instead of breath support.",
        "expected": {"projection": 10, "authority": 6},
    },
    "low_resonance": {
        "title": "Low resonance",
        "metric": "voice_resonance",
        "threshold": 58,
        "exercise_key": "warmup_hum",
        "why": "Voice sounds thin; limited chest/face vibration reduces warmth and presence.",
        "expected": {"voice_resonance": 10, "voice_warmth": 8},
    },
    "poor_articulation": {
        "title": "Poor articulation",
        "metric": "articulation",
        "threshold": 70,
        "exercise_key": "consonant_finish",
        "why": "Consonants and endings drop, especially under speed.",
        "expected": {"articulation": 10, "clarity": 8},
    },
    "drop_technical_endings": {
        "title": "Mumbled technical words",
        "metric": "technical_communication",
        "threshold": 68,
        "exercise_key": "hard_word_ladder",
        "why": "Technical terms lose clarity when pace rises.",
        "expected": {"technical_communication": 12, "pronunciation": 10},
    },
    "rush": {
        "title": "Speaking too fast",
        "metric": "clarity",  # combined with pattern
        "threshold": 100,  # use patterns primarily
        "exercise_key": "executive_open",
        "why": "Speed spikes compress articulation and pause quality.",
        "expected": {"clarity": 8, "pause_control": 10},
        "pattern": "rush_on_intro",
    },
    "soft_delivery": {
        "title": "Speaking too softly",
        "metric": "projection",
        "threshold": 55,
        "exercise_key": "projection_support",
        "why": "Low projection forces listeners to work harder.",
        "expected": {"projection": 12, "authority": 7},
    },
    "monotone": {
        "title": "Monotone delivery",
        "metric": "monotone_level",
        "threshold": 55,  # higher = worse; flag if above
        "inverse": True,
        "exercise_key": "emphasis_keywords",
        "why": "Limited pitch variety flattens emphasis and engagement.",
        "expected": {"monotone_level": -12, "storytelling": 8},
    },
    "poor_breathing": {
        "title": "Poor breathing",
        "metric": "breathing_quality",
        "threshold": 60,
        "exercise_key": "breath_diaphragm",
        "why": "Shallow or mistimed breath leads to rushed phrase endings.",
        "expected": {"breathing_quality": 12, "pause_control": 6},
    },
    "weak_endings": {
        "title": "Weak sentence endings",
        "metric": "projection",
        "threshold": 65,
        "exercise_key": "consonant_finish",
        "why": "Energy and consonants drop at phrase ends.",
        "expected": {"articulation": 8, "authority": 6},
    },
    "low_energy": {
        "title": "Low vocal energy",
        "metric": "speaking_energy",
        "threshold": 55,
        "exercise_key": "chest_resonance",
        "why": "Delivery lacks forward energy without needing to shout.",
        "expected": {"speaking_energy": 10, "persuasiveness": 6},
    },
    "story_rhythm": {
        "title": "Poor storytelling rhythm",
        "metric": "storytelling",
        "threshold": 60,
        "exercise_key": "story_arc",
        "why": "Ideas run together without strategic pauses or emphasis.",
        "expected": {"storytelling": 12, "pause_control": 8},
    },
    "nervous_delivery": {
        "title": "Nervous delivery",
        "metric": "executive_presence",
        "threshold": 58,
        "exercise_key": "confidence_stance",
        "why": "Pace and volume wobble when stakes rise.",
        "expected": {"executive_presence": 10, "authority": 8},
        "pattern": "confidence_drop_qa",
    },
    "filler_overuse": {
        "title": "Filler overuse",
        "metric": "conversation_flow",
        "threshold": 70,
        "exercise_key": "filler_fast",
        "why": "Fillers replace silence while retrieving the next idea.",
        "expected": {"conversation_flow": 10, "authority": 5},
        "pattern": "filler_overuse",
    },
    "missing_pauses": {
        "title": "Missing pauses",
        "metric": "pause_control",
        "threshold": 62,
        "exercise_key": "strategic_pause",
        "why": "Dense sections lack recovery beats for the listener.",
        "expected": {"pause_control": 12, "clarity": 6},
        "pattern": "missing_pauses",
    },
}

# A mission is a headline, not a spec. Keep it short, human and speakable — the
# measurable half lives in MISSION_TARGETS so the UI can show it as a small pill
# instead of cramming "(target ~130-140 WPM)" into a display heading.
MISSIONS_BY_FOCUS = {
    "drop_technical_endings": "Land the last syllable.",
    "missing_pauses": "Leave a beat after each big idea.",
    "rush": "Slow down when it gets technical.",
    "weak_projection": "Project from breath, not volume.",
    "monotone": "Lift one word in every sentence.",
    "poor_breathing": "Breathe before the claim, not during it.",
    "filler_overuse": "Trade every filler for silence.",
    "poor_articulation": "Finish every consonant.",
    "nervous_delivery": "Deliver the ask slower than feels natural.",
    "story_rhythm": "Put a beat between problem, solution and traction.",
    "low_resonance": "Hum first, then keep that ease.",
    "low_energy": "Carry the energy to the last word.",
    "weak_endings": "Hold the volume to the end of the line.",
    "soft_delivery": "Speak to the far wall.",
}

# The measurable half of the mission. Shown beside the headline, never inside it.
MISSION_TARGETS = {
    "drop_technical_endings": "every technical word",
    "missing_pauses": "~1s after each idea",
    "rush": "~135 WPM",
    "weak_projection": "steady, never shouted",
    "monotone": "one keyword per sentence",
    "poor_breathing": "one planned breath per claim",
    "filler_overuse": "under 3 per minute",
    "poor_articulation": "t, d, k, s",
    "nervous_delivery": "10% slower",
    "story_rhythm": "3 beats, 3 pauses",
    "low_resonance": "30s hum first",
    "low_energy": "no fade-outs",
    "weak_endings": "same volume start to finish",
    "soft_delivery": "same volume start to finish",
}


def ensure_settings() -> dict[str, str]:
    with connect() as conn:
        row = conn.execute("SELECT * FROM voice_settings WHERE id=1").fetchone()
        if not row:
            conn.execute(
                "INSERT INTO voice_settings (id, goal_key, goal_label, updated_at) VALUES (1, ?, ?, ?)",
                ("executive_presence", "Executive Presence", utc_now()),
            )
            conn.commit()
            return {"goal_key": "executive_presence", "goal_label": "Executive Presence"}
        return {"goal_key": row["goal_key"], "goal_label": row["goal_label"]}


def set_goal(goal_key: str) -> dict[str, Any]:
    goal = next((g for g in GOALS if g["key"] == goal_key), None)
    if not goal:
        raise ValueError("Unknown goal")
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO voice_settings (id, goal_key, goal_label, updated_at) VALUES (1, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET goal_key=excluded.goal_key, goal_label=excluded.goal_label, updated_at=excluded.updated_at
            """,
            (goal["key"], goal["label"], utc_now()),
        )
        conn.commit()
    rebuild_training_plan()
    ensure_daily_mission(force=True)
    return get_program()


def _pattern_freq(patterns: list[dict[str, Any]], key: str) -> int:
    for p in patterns:
        if p and p.get("key") == key:
            return int(p.get("frequency") or 0)
    return 0


def detect_weaknesses(profile: dict[str, Any], patterns: list[dict[str, Any]]) -> list[dict[str, Any]]:
    scores = profile.get("scores") or {}
    found: list[dict[str, Any]] = []
    for key, cat in WEAKNESS_CATALOG.items():
        metric = cat["metric"]
        val = scores.get(metric)
        hit = False
        priority = 50
        if cat.get("inverse"):
            if val is not None and float(val) >= float(cat["threshold"]):
                hit = True
                priority = int(40 + float(val) / 2)
        elif cat.get("pattern"):
            freq = _pattern_freq(patterns, cat["pattern"])
            if freq >= 2 or (val is not None and float(val) < float(cat["threshold"])):
                hit = True
                priority = 50 + min(40, freq * 8)
        elif val is not None and float(val) < float(cat["threshold"]):
            hit = True
            priority = int(40 + (float(cat["threshold"]) - float(val)))

        # Soft delivery: low projection specifically
        if key == "soft_delivery" and val is not None and float(val) >= 55:
            hit = False

        if hit:
            found.append(
                {
                    "weakness_key": key,
                    "title": cat["title"],
                    "why": cat["why"],
                    "exercise_key": cat["exercise_key"],
                    "priority": priority,
                    "expected_gain": cat.get("expected") or {},
                    "metric": metric,
                    "metric_value": val,
                }
            )
    found.sort(key=lambda x: -x["priority"])
    return found


def rebuild_training_plan() -> list[dict[str, Any]]:
    from . import voice_memory

    settings = ensure_settings()
    profile = voice_profile.get_voice_profile()
    memory = voice_memory.get_memory_snapshot()
    patterns = memory.get("top_patterns") or []
    weaknesses = detect_weaknesses(profile, patterns)

    focus = GOAL_FOCUS.get(settings["goal_key"], [])
    # Boost priority if weakness aligns with goal focus keywords
    for w in weaknesses:
        for f in focus:
            if f in w["weakness_key"] or f in (w.get("metric") or "") or f in w["title"].lower().replace(" ", "_"):
                w["priority"] += 15
            if f == "rush" and w["weakness_key"] == "rush":
                w["priority"] += 20
            if f == "monotone" and w["weakness_key"] == "monotone":
                w["priority"] += 20
            if f == "confidence" and w["weakness_key"] == "nervous_delivery":
                w["priority"] += 15
    weaknesses.sort(key=lambda x: -x["priority"])
    top = weaknesses[:8]

    with connect() as conn:
        conn.execute("DELETE FROM training_plan")
        for w in top:
            conn.execute(
                """
                INSERT INTO training_plan
                (weakness_key, title, why, exercise_key, priority, status, expected_gain_json, updated_at)
                VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
                """,
                (
                    w["weakness_key"],
                    w["title"],
                    w["why"],
                    w["exercise_key"],
                    w["priority"],
                    dumps(w["expected_gain"]),
                    utc_now(),
                ),
            )
        conn.commit()
    return top


def _mission_payload(row) -> dict[str, Any]:
    """Shape a stored mission for the client.

    The title is re-read from MISSIONS_BY_FOCUS rather than trusted from the
    row, so a copy change lands immediately instead of waiting for tomorrow's
    mission — rows written by an older build carry the old wording.
    """
    focus = row["focus_key"] or ""
    return {
        "date": row["mission_date"],
        "title": MISSIONS_BY_FOCUS.get(focus) or row["title"],
        "target": MISSION_TARGETS.get(focus),
        "focus_key": focus,
        "exercise_key": row["exercise_key"],
        "why": row["why"],
        "completed": bool(row["completed"]),
    }


def ensure_daily_mission(force: bool = False) -> dict[str, Any]:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    with connect() as conn:
        row = conn.execute("SELECT * FROM daily_missions WHERE mission_date=?", (today,)).fetchone()
        if row and not force:
            return _mission_payload(row)

        plan = conn.execute(
            "SELECT * FROM training_plan WHERE status='active' ORDER BY priority DESC LIMIT 1"
        ).fetchone()
        if not plan:
            rebuild_training_plan()
            plan = conn.execute(
                "SELECT * FROM training_plan WHERE status='active' ORDER BY priority DESC LIMIT 1"
            ).fetchone()

        if plan:
            focus = plan["weakness_key"]
            title = MISSIONS_BY_FOCUS.get(focus, f"Today: practice {plan['title'].lower()}.")
            exercise_key = plan["exercise_key"]
            why = plan["why"]
        else:
            focus = "missing_pauses"
            title = MISSIONS_BY_FOCUS["missing_pauses"]
            exercise_key = "strategic_pause"
            why = "One habit at a time builds automatic executive delivery."

        conn.execute(
            """
            INSERT INTO daily_missions (mission_date, title, focus_key, exercise_key, why, completed)
            VALUES (?, ?, ?, ?, ?, 0)
            ON CONFLICT(mission_date) DO UPDATE SET
              title=excluded.title, focus_key=excluded.focus_key,
              exercise_key=excluded.exercise_key, why=excluded.why
            """,
            (today, title, focus, exercise_key, why),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM daily_missions WHERE mission_date=?", (today,)).fetchone()

    return _mission_payload(row)


def complete_mission() -> dict[str, Any]:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    with connect() as conn:
        conn.execute(
            "UPDATE daily_missions SET completed=1, completed_at=? WHERE mission_date=?",
            (utc_now(), today),
        )
        conn.commit()
    return ensure_daily_mission()


def get_program() -> dict[str, Any]:
    settings = ensure_settings()
    profile = voice_profile.get_voice_profile()
    with connect() as conn:
        plan_rows = conn.execute(
            "SELECT * FROM training_plan WHERE status='active' ORDER BY priority DESC"
        ).fetchall()
        exercises = {
            r["key"]: dict(r)
            for r in conn.execute("SELECT * FROM exercises").fetchall()
        }
    plan = []
    for r in plan_rows:
        item = dict(r)
        item["expected_gain"] = __import__("json").loads(item.pop("expected_gain_json") or "{}")
        ex = exercises.get(item.get("exercise_key") or "")
        item["exercise"] = {
            "key": ex["key"],
            "title": ex["title"],
            "category": ex["category"],
            "description": ex["description"],
            "duration_sec": ex["duration_sec"],
        } if ex else None
        plan.append(item)

    if not plan:
        rebuild_training_plan()
        with connect() as conn:
            plan_rows = conn.execute(
                "SELECT * FROM training_plan WHERE status='active' ORDER BY priority DESC"
            ).fetchall()
        plan = []
        for r in plan_rows:
            item = dict(r)
            item["expected_gain"] = __import__("json").loads(item.pop("expected_gain_json") or "{}")
            ex = exercises.get(item.get("exercise_key") or "")
            item["exercise"] = {
                "key": ex["key"],
                "title": ex["title"],
                "category": ex["category"],
                "description": ex["description"],
                "duration_sec": ex["duration_sec"],
            } if ex else None
            plan.append(item)

    mission = ensure_daily_mission()
    return {
        "goal": settings,
        "goals": GOALS,
        "profile": profile,
        "plan": plan,
        "mission": mission,
        "philosophy": (
            "We do not change your natural voice or accent. "
            "We train breathing, resonance, articulation, pacing, projection, emphasis, and confidence "
            "so you sound like the strongest version of yourself."
        ),
    }
