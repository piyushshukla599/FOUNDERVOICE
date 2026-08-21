from __future__ import annotations

from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from ..config import get_settings
from .. import workspace
from ..db import connect, dumps, loads, row_to_dict, utc_now
from ..rate_limit import allow
from ..services import jobs, lab_coach, pipeline, quota, report_pdf, voice_memory

router = APIRouter(prefix="/sessions", tags=["sessions"])

MIME = {
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".flac": "audio/flac",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
}


@router.get("")
def list_sessions() -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT s.*, m.wpm, m.filler_count, m.clarity, m.confidence_est, m.executive_presence
            FROM sessions s
            LEFT JOIN metrics m ON m.session_id = s.id
            ORDER BY s.created_at DESC
            """
        ).fetchall()
    return [row_to_dict(r) for r in rows]


@router.get("/{session_id}")
def get_session(session_id: str) -> dict[str, Any]:
    with connect() as conn:
        session = row_to_dict(conn.execute("SELECT * FROM sessions WHERE id=?", (session_id,)).fetchone())
        if not session:
            raise HTTPException(404, "Session not found")
        metrics = row_to_dict(conn.execute("SELECT * FROM metrics WHERE session_id=?", (session_id,)).fetchone())
        events = [
            row_to_dict(r)
            for r in conn.execute(
                "SELECT * FROM events WHERE session_id=? ORDER BY start ASC", (session_id,)
            ).fetchall()
        ]
    transcript = loads(session.get("transcript_json"), {})
    payload = loads((metrics or {}).get("payload_json"), {}) if metrics else {}
    focus = loads(session.get("focus_json"), {}) or {}
    if metrics:
        metrics = {**metrics, "payload": payload}
        metrics.pop("payload_json", None)
    session["transcript"] = transcript
    session["focus"] = focus
    session.pop("transcript_json", None)
    session.pop("focus_json", None)
    parsed_events = []
    for e in events:
        assert e
        meta = loads(e.pop("meta_json", None), {}) or {}
        e["meta"] = meta
        for key in ("observation", "evidence", "impact", "expected_improvement", "weekly_trend"):
            if key in meta and key not in e:
                e[key] = meta[key]
        parsed_events.append(e)
    catalog = lab_coach.exercise_catalog()
    lab_recs = lab_coach.recommend_labs_from_events(
        parsed_events,
        metrics,
        skip_key=session.get("exercise_key") if session.get("mode") == "exercise" else None,
        catalog=catalog,
    )
    if session.get("mode") == "exercise" and session.get("exercise_key"):
        similar = lab_coach.similar_lab_recs(str(session.get("exercise_key")), catalog)
        seen = {r["key"] for r in similar}
        lab_recs = similar + [r for r in lab_recs if r.get("key") not in seen]
    if not lab_recs:
        memory = voice_memory.get_memory_snapshot()
        lab_recs = lab_coach.recommend_labs_from_memory(memory.get("top_patterns") or [], catalog)
    return {"session": session, "metrics": metrics, "events": parsed_events, "lab_recs": lab_recs}


@router.post("/upload")
async def upload_session(
    request: Request,
    background: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form("Untitled session"),
    mode: str = Form("free"),
    exercise_key: str = Form(""),
    exercise_title: str = Form(""),
    exercise_category: str = Form(""),
    exercise_description: str = Form(""),
    focus_note: str = Form(""),
) -> dict[str, Any]:
    client = request.client.host if request.client else "unknown"
    if not allow(f"upload:{client}", limit=40, window_sec=3600):
        raise HTTPException(429, "Upload rate limit reached. Try again later.")

    # The free tier's hard ceiling. Charged before a byte is written, so a
    # rejected visitor never costs us disk or a Whisper slot; refunded below if
    # the upload itself turns out to be unusable.
    quota_state = quota.consume(request, "upload")

    settings = get_settings()
    suffix = Path(file.filename or "audio.wav").suffix.lower() or ".wav"
    if suffix not in {".wav", ".mp3", ".m4a", ".flac", ".webm", ".ogg", ".mpeg", ".mp4"}:
        raise HTTPException(400, f"Unsupported format: {suffix}")

    if mode not in {"free", "pitch", "practice", "exercise", "listening"}:
        mode = "free"
    title = (title or "Untitled session").strip()[:200]
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
                    quota.refund(request, "upload")
                    mb = settings.max_upload_bytes / (1024 * 1024)
                    raise HTTPException(
                        413,
                        f"File is too large. Maximum allowed is {mb:.0f} MB.",
                    )
                out.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        dest.unlink(missing_ok=True)
        quota.refund(request, "upload")
        raise HTTPException(400, f"Upload failed: {exc}") from exc

    if size == 0:
        dest.unlink(missing_ok=True)
        quota.refund(request, "upload")
        raise HTTPException(400, "Empty file")

    focus = {
        "exercise_key": exercise_key or None,
        "exercise_title": exercise_title or None,
        "exercise_category": exercise_category or None,
        "exercise_description": exercise_description or None,
        "focus_note": focus_note or None,
        "full_evaluation": True,
        "note": "Runs the same full voice analysis as Record (pace, acoustics, professional presence, coach).",
    }

    with connect() as conn:
        conn.execute(
            """
            INSERT INTO sessions (id, created_at, title, mode, audio_path, status, exercise_key, focus_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                utc_now(),
                title,
                mode,
                str(dest),
                "pending",
                exercise_key or None,
                dumps(focus),
            ),
        )
        conn.commit()

    background.add_task(workspace.bind(_run_safe), session_id, mode)
    return {"session_id": session_id, "status": "pending", "mode": mode}


async def _run_safe(session_id: str, mode: str) -> None:
    try:
        await jobs.run_analysis(lambda: pipeline.run_pipeline(session_id, mode))
    except Exception as exc:  # noqa: BLE001 — never crash the server from background work
        with connect() as conn:
            conn.execute(
                "UPDATE sessions SET status=?, error=? WHERE id=?",
                ("error", str(exc), session_id),
            )
            conn.commit()


@router.post("/{session_id}/reanalyze")
async def reanalyze(session_id: str, background: BackgroundTasks) -> dict[str, Any]:
    with connect() as conn:
        row = conn.execute("SELECT mode FROM sessions WHERE id=?", (session_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Session not found")
        mode = row["mode"]
        conn.execute("UPDATE sessions SET status=?, error=NULL WHERE id=?", ("pending", session_id))
        conn.commit()
    background.add_task(workspace.bind(_run_safe), session_id, mode)
    return {"session_id": session_id, "status": "pending"}


def _playable(session_id: str, recorded: Path) -> Path | None:
    """The file to hand a browser for this session, or None if nothing is left.

    Preference order matters more than it looks. The browser records through
    MediaRecorder, which writes a *live* WebM: the Segment and Cluster sizes
    are "unknown", there is no Cues index, and there is no Duration element.
    Chrome will play that file, but it reports ``duration`` as Infinity and
    ignores assignments to ``currentTime`` - so the scrubber is dead and every
    "listen to this moment" link in the report silently does nothing. The
    analysis pipeline already writes a mono 16k WAV beside it, and a WAV
    carries its length in the header, so serving that gives a seekable player
    for free. It is also, literally, the audio the coaching was based on.

    Falling back to a same-named file in the current audio directory covers
    the case where the stored path is absolute and the data directory has
    since moved - which it does, the first time a workspace is adopted.
    """
    settings = get_settings()
    wav = settings.audio_dir / f"{session_id}.wav"
    if wav.exists():
        return wav
    if recorded.name and recorded.exists():
        return recorded
    if recorded.name:
        moved = settings.audio_dir / recorded.name
        if moved.exists():
            return moved
    for candidate in sorted(settings.audio_dir.glob(f"{session_id}.*")):
        return candidate
    return None


@router.get("/{session_id}/audio")
def get_audio(session_id: str):
    with connect() as conn:
        row = conn.execute("SELECT audio_path FROM sessions WHERE id=?", (session_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Session not found")
    path = _playable(session_id, Path(row["audio_path"] or ""))
    if path is None:
        raise HTTPException(404, "Audio missing")
    media = MIME.get(path.suffix.lower(), "application/octet-stream")
    # inline, not attachment: this URL is the <audio> source on the report
    # page, and naming it as a download is at best a lie to the browser.
    return FileResponse(path, media_type=media, content_disposition_type="inline")


@router.get("/{session_id}/report")
def get_report(session_id: str):
    path = report_pdf.generate_pdf(session_id)
    return FileResponse(path, filename=f"foundervoice-{session_id}.pdf", media_type="application/pdf")


@router.delete("/{session_id}")
def delete_session(session_id: str) -> dict[str, str]:
    with connect() as conn:
        row = conn.execute("SELECT audio_path FROM sessions WHERE id=?", (session_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Session not found")
        conn.execute("DELETE FROM events WHERE session_id=?", (session_id,))
        conn.execute("DELETE FROM metrics WHERE session_id=?", (session_id,))
        conn.execute("DELETE FROM sessions WHERE id=?", (session_id,))
        conn.commit()
    path = Path(row["audio_path"])
    if path.exists():
        path.unlink(missing_ok=True)
    return {"status": "deleted"}
