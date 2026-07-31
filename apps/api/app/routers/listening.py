from __future__ import annotations

from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from ..config import get_settings
from ..db import connect, dumps, loads, row_to_dict, utc_now
from ..services import listening_summary, pipeline

router = APIRouter(prefix="/listening", tags=["listening"])


class StartListeningBody(BaseModel):
    title: str = "Work session"
    device_label: str | None = None
    speech_start_sec: float = Field(default=3.5, ge=1.0, le=15.0)
    silence_end_sec: float = Field(default=4.0, ge=1.5, le=30.0)
    min_conversation_sec: float = Field(default=8.0, ge=3.0, le=120.0)
    min_speech_ratio: float = Field(default=0.2, ge=0.05, le=0.9)


@router.get("/active")
def get_active_listening() -> dict[str, Any]:
    with connect() as conn:
        row = conn.execute(
            "SELECT id FROM listening_sessions WHERE status='active' ORDER BY created_at DESC LIMIT 1"
        ).fetchone()
    if not row:
        return {"active": False}
    data = get_listening(row["id"])
    return {"active": True, **data}


@router.get("")
def list_listening() -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM listening_sessions ORDER BY created_at DESC LIMIT 50"
        ).fetchall()
    out = []
    for r in rows:
        d = row_to_dict(r)
        assert d
        d["settings"] = loads(d.pop("settings_json", None), {})
        d["summary"] = loads(d.pop("summary_json", None), None)
        out.append(d)
    return out


@router.post("/start")
def start_listening(body: StartListeningBody) -> dict[str, Any]:
    listening_id = str(uuid4())
    settings = {
        "speech_start_sec": body.speech_start_sec,
        "silence_end_sec": body.silence_end_sec,
        "min_conversation_sec": body.min_conversation_sec,
        "min_speech_ratio": body.min_speech_ratio,
    }
    with connect() as conn:
        # Only one active listening session at a time
        active = conn.execute(
            "SELECT id FROM listening_sessions WHERE status='active' LIMIT 1"
        ).fetchone()
        if active:
            raise HTTPException(409, f"Already listening: {active['id']}")
        conn.execute(
            """
            INSERT INTO listening_sessions
            (id, created_at, title, status, settings_json, device_label)
            VALUES (?, ?, ?, 'active', ?, ?)
            """,
            (listening_id, utc_now(), body.title, dumps(settings), body.device_label),
        )
        conn.commit()
    return {"id": listening_id, "status": "active", "settings": settings}


@router.get("/{listening_id}")
def get_listening(listening_id: str) -> dict[str, Any]:
    with connect() as conn:
        parent = row_to_dict(
            conn.execute("SELECT * FROM listening_sessions WHERE id=?", (listening_id,)).fetchone()
        )
        if not parent:
            raise HTTPException(404, "Listening session not found")
        conversations = [
            row_to_dict(r)
            for r in conn.execute(
                """
                SELECT s.id, s.created_at, s.title, s.duration, s.status, s.mode,
                       s.conversation_index, s.error, s.coach_summary,
                       m.wpm, m.clarity, m.confidence_est, m.executive_presence, m.filler_count
                FROM sessions s
                LEFT JOIN metrics m ON m.session_id = s.id
                WHERE s.listening_session_id=?
                ORDER BY s.conversation_index ASC, s.created_at ASC
                """,
                (listening_id,),
            ).fetchall()
        ]
    parent["settings"] = loads(parent.pop("settings_json", None), {})
    parent["summary"] = loads(parent.pop("summary_json", None), None)
    analyzing = any(c and c.get("status") in ("pending", "analyzing") for c in conversations)
    return {
        "listening": parent,
        "conversations": conversations,
        "analyzing": analyzing,
    }


@router.post("/{listening_id}/conversations")
async def upload_conversation(
    listening_id: str,
    background: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(""),
    conversation_index: int = Form(0),
    duration_hint: float = Form(0),
) -> dict[str, Any]:
    settings = get_settings()
    with connect() as conn:
        parent = conn.execute(
            "SELECT id, status FROM listening_sessions WHERE id=?", (listening_id,)
        ).fetchone()
        if not parent:
            raise HTTPException(404, "Listening session not found")
        if parent["status"] != "active":
            raise HTTPException(400, "Listening session already ended")

    suffix = Path(file.filename or "conversation.wav").suffix.lower() or ".wav"
    if suffix not in {".wav", ".mp3", ".m4a", ".flac", ".webm", ".ogg", ".mpeg", ".mp4"}:
        raise HTTPException(400, f"Unsupported format: {suffix}")

    session_id = str(uuid4())
    dest = settings.audio_dir / f"{session_id}{suffix}"
    dest.parent.mkdir(parents=True, exist_ok=True)

    size = 0
    try:
        with dest.open("wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > settings.max_upload_bytes:
                    out.close()
                    dest.unlink(missing_ok=True)
                    mb = settings.max_upload_bytes / (1024 * 1024)
                    raise HTTPException(413, f"File is too large. Maximum allowed is {mb:.0f} MB.")
                out.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        dest.unlink(missing_ok=True)
        raise HTTPException(400, f"Upload failed: {exc}") from exc

    if size == 0:
        dest.unlink(missing_ok=True)
        raise HTTPException(400, "Empty file")

    auto_title = title.strip() or f"Conversation {conversation_index or 1}"
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO sessions
            (id, created_at, title, mode, audio_path, status, listening_session_id, conversation_index, duration)
            VALUES (?, ?, ?, 'listening', ?, 'pending', ?, ?, ?)
            """,
            (
                session_id,
                utc_now(),
                auto_title,
                str(dest),
                listening_id,
                conversation_index or None,
                duration_hint or 0,
            ),
        )
        conn.execute(
            """
            UPDATE listening_sessions
            SET conversation_count = conversation_count + 1,
                speaking_time_sec = speaking_time_sec + ?
            WHERE id=?
            """,
            (duration_hint or 0, listening_id),
        )
        conn.commit()

    background.add_task(_run_safe, session_id)
    return {"session_id": session_id, "status": "pending", "title": auto_title}


@router.post("/{listening_id}/end")
def end_listening(listening_id: str) -> dict[str, Any]:
    with connect() as conn:
        parent = row_to_dict(
            conn.execute("SELECT * FROM listening_sessions WHERE id=?", (listening_id,)).fetchone()
        )
        if not parent:
            raise HTTPException(404, "Listening session not found")
        conn.execute(
            "UPDATE listening_sessions SET ended_at=COALESCE(ended_at, ?), status='ended' WHERE id=?",
            (utc_now(), listening_id),
        )
        conn.commit()

    summary = listening_summary.build_listening_summary(listening_id)
    return {"id": listening_id, "status": "ended", "summary": summary}


async def _run_safe(session_id: str) -> None:
    try:
        await pipeline.run_pipeline(session_id, "listening")
    except Exception as exc:  # noqa: BLE001
        with connect() as conn:
            conn.execute(
                "UPDATE sessions SET status=?, error=? WHERE id=?",
                ("error", str(exc), session_id),
            )
            conn.commit()
