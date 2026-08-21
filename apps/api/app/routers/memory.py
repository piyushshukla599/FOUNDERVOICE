from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..config import get_settings
from ..db import connect, row_to_dict, utc_now
from ..services import filler_lexicon, lab_coach, training_program, voice_memory, voice_profile

router = APIRouter(tags=["memory"])


@router.get("/memory")
def memory() -> dict[str, Any]:
    snap = voice_memory.get_memory_snapshot()
    snap["voice_profile"] = voice_profile.get_voice_profile()
    return snap


@router.get("/dashboard")
def dashboard() -> dict[str, Any]:
    snap = voice_memory.get_memory_snapshot()
    series = voice_memory.dashboard_series()
    snap["voice_profile"] = voice_profile.get_voice_profile()
    return {**snap, **series}


@router.get("/voice-program")
def voice_program() -> dict[str, Any]:
    return training_program.get_program()


class GoalBody(BaseModel):
    goal_key: str


@router.post("/voice-goal")
def set_voice_goal(body: GoalBody) -> dict[str, Any]:
    try:
        return training_program.set_goal(body.goal_key)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post("/daily-mission/complete")
def complete_daily_mission() -> dict[str, Any]:
    return training_program.complete_mission()


@router.get("/exercises")
def list_exercises() -> dict[str, Any]:
    with connect() as conn:
        exercises = [row_to_dict(r) for r in conn.execute("SELECT * FROM exercises ORDER BY level, category").fetchall()]
        completions = [
            row_to_dict(r)
            for r in conn.execute(
                "SELECT * FROM exercise_completions ORDER BY completed_at DESC LIMIT 80"
            ).fetchall()
        ]
        done_keys = {
            r["exercise_key"]
            for r in conn.execute("SELECT DISTINCT exercise_key FROM exercise_completions").fetchall()
        }
        counts = {
            r["exercise_key"]: r["n"]
            for r in conn.execute(
                "SELECT exercise_key, COUNT(*) AS n FROM exercise_completions GROUP BY exercise_key"
            ).fetchall()
        }

    for e in exercises:
        e["level"] = int(e.get("level") or 1)
        e["times_completed"] = int(counts.get(e["key"], 0))
        e["completed"] = e["key"] in done_keys
        e["why"] = ""

    unique_l1 = sum(1 for e in exercises if e["level"] == 1 and e["completed"])
    unique_l2 = sum(1 for e in exercises if e["level"] == 2 and e["completed"])
    # All labs choosable — levels are a map, not a lock. Recommend from Voice Memory.
    unlocked = {"1": True, "2": True, "3": True}
    xp = sum(int(e["level"]) * max(1, e["times_completed"]) for e in exercises if e["times_completed"])

    program = training_program.get_program()
    plan_keys = {p.get("exercise_key") for p in program.get("plan") or []}
    memory = voice_memory.get_memory_snapshot()
    patterns = memory.get("top_patterns") or []
    pattern_keys = {p["key"] for p in patterns}
    catalog = {e["key"]: e for e in exercises}
    for e in exercises:
        e["why"] = lab_coach.why_this_lab(e, pattern_keys, patterns)
        lab_coach.attach_sound(e)

    recommended = [e for e in exercises if e.get("key") in plan_keys]
    memory_recs = lab_coach.recommend_labs_from_memory(patterns, catalog)
    if not recommended:
        rec_keys = {r["key"] for r in memory_recs}
        recommended = [e for e in exercises if e.get("key") in rec_keys]
    if not recommended:
        recommended = [e for e in exercises if e.get("target_pattern") in pattern_keys]
    if not recommended:
        recommended = [e for e in exercises if e["level"] == 1][:3]
    by_key = {r["key"]: r for r in memory_recs}
    for e in recommended:
        lab_coach.attach_sound(e)
        if e["key"] in by_key:
            e["sound"] = by_key[e["key"]].get("sound") or e.get("sound")
            e["fix_line"] = by_key[e["key"]].get("fix_line") or e.get("fix_line")
    # Mission exercise first
    mission_key = (program.get("mission") or {}).get("exercise_key")
    if mission_key:
        mission_ex = next((e for e in exercises if e.get("key") == mission_key), None)
        if mission_ex:
            recommended = [mission_ex] + [e for e in recommended if e.get("key") != mission_key]
    return {
        "exercises": exercises,
        "recommended": recommended[:6],
        "completions": completions,
        "streak": voice_memory.streak_days(),
        "mission": program.get("mission"),
        "plan": program.get("plan"),
        "goal": program.get("goal"),
        "hard_words": (program.get("profile") or {}).get("hard_words") or [],
        "philosophy": program.get("philosophy"),
        "levels": {
            "unlocked": unlocked,
            "unique_l1": unique_l1,
            "unique_l2": unique_l2,
            "xp": xp,
            "next_unlock": None,
            "note": "Pick any lab. Recommended ones match your overall Voice Memory.",
        },
    }


@router.post("/exercises/{key}/complete")
def complete_exercise(key: str, notes: str = "") -> dict[str, Any]:
    with connect() as conn:
        ex = conn.execute("SELECT * FROM exercises WHERE key=?", (key,)).fetchone()
        if not ex:
            return {"error": "not found"}
        conn.execute(
            "INSERT INTO exercise_completions (exercise_key, completed_at, notes) VALUES (?, ?, ?)",
            (key, utc_now(), notes),
        )
        conn.commit()
    return {"status": "ok", "streak": voice_memory.streak_days()}


class FreshStartBody(BaseModel):
    confirm: str = Field(description='Must be exactly "DELETE" to proceed')


class FillerBody(BaseModel):
    phrase: str = Field(min_length=1, max_length=40)


class FillersSetBody(BaseModel):
    phrases: list[str] = Field(default_factory=list)


@router.get("/fillers")
def get_fillers() -> dict[str, Any]:
    return filler_lexicon.get_lexicon()


@router.post("/fillers")
def add_filler(body: FillerBody) -> dict[str, Any]:
    try:
        return filler_lexicon.add_filler(body.phrase)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.delete("/fillers/{phrase}")
def delete_filler(phrase: str) -> dict[str, Any]:
    return filler_lexicon.remove_filler(phrase)


@router.put("/fillers")
def replace_fillers(body: FillersSetBody) -> dict[str, Any]:
    return filler_lexicon.set_custom(body.phrases)


@router.post("/fresh-start")
def fresh_start(body: FreshStartBody) -> dict[str, Any]:
    """Wipe sessions, Voice Memory, practice history, and local media files."""
    settings = get_settings()
    # This deletes everything the caller can see, which is now everything in
    # their own workspace and nothing else: connect() opens a database chosen
    # by their cookie, and the audio lives under the same directory.
    if body.confirm != "DELETE":
        raise HTTPException(400, 'Type confirm: "DELETE" to wipe all data.')

    deleted = {"sessions": 0, "files": 0}

    with connect() as conn:
        rows = conn.execute("SELECT audio_path FROM sessions").fetchall()
        deleted["sessions"] = conn.execute("SELECT COUNT(*) AS c FROM sessions").fetchone()["c"]
        conn.execute("DELETE FROM events")
        conn.execute("DELETE FROM metrics")
        conn.execute("DELETE FROM practice_turns")
        conn.execute("DELETE FROM exercise_completions")
        conn.execute("DELETE FROM patterns")
        conn.execute("DELETE FROM sessions")
        conn.execute("DELETE FROM listening_sessions")
        conn.execute("DELETE FROM voice_profile")
        conn.execute("DELETE FROM training_plan")
        conn.execute("DELETE FROM daily_missions")
        conn.execute("DELETE FROM voice_settings")
        conn.commit()

    for row in rows:
        # A session whose upload failed has no audio_path, and Path("") is
        # Path("."), which exists. That turned a wipe into an attempt to
        # unlink the working directory.
        raw = (row["audio_path"] or "").strip()
        if not raw:
            continue
        path = Path(raw)
        if path.is_file():
            path.unlink(missing_ok=True)
            deleted["files"] += 1

    for folder in (settings.audio_dir, settings.transcripts_dir, settings.reports_dir):
        if not folder.exists():
            continue
        for f in folder.iterdir():
            if f.is_file() and f.name != ".gitkeep":
                f.unlink(missing_ok=True)
                deleted["files"] += 1

    return {
        "status": "ok",
        "message": "All user data deleted. Fresh start ready. Custom filler words were kept.",
        "deleted": deleted,
    }
