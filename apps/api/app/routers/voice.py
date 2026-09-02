"""The coach's voice: one endpoint that speaks a line, one that writes the script.

Split on purpose. The web app needs the whole script up front so it can show
the words while they are being said, highlight the line in flight, and still
render the review when there is no voice at all. Audio is then fetched a line
at a time, which is what makes the first sentence start in under a second
instead of after the whole review has been synthesised.
"""

from __future__ import annotations

import hashlib
from collections import OrderedDict
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field

from .. import workspace
from ..rate_limit import allow
from ..services import spoken_coach, tts

router = APIRouter(prefix="/voice", tags=["voice"])

# A finished session's script never changes, but the report page asks for it on
# every visit and rewriting it costs a DeepSeek call each time. Keyed on the
# coaching itself, so re-analysing a session produces a new key rather than
# serving the old verdict.
_SCRIPTS: OrderedDict[str, list[dict[str, Any]]] = OrderedDict()
_SCRIPT_LIMIT = 128


def _script_key(
    session_id: str, session: dict[str, Any], events: list[dict[str, Any]], purpose: str
) -> str:
    stamp = f"{session.get('coach_summary') or ''}|{len(events)}|{session.get('status')}|{purpose}"
    digest = hashlib.sha256(stamp.encode("utf-8")).hexdigest()[:16]
    return f"{workspace.get_workspace() or 'default'}:{session_id}:{digest}"


class SpeakBody(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    voice: str = ""


@router.get("/status")
def voice_status() -> dict[str, Any]:
    """Whether this server can speak, and with whose voice."""
    return tts.status()


@router.get("/brief")
def voice_brief(seconds: int = 45, name: str = "") -> dict[str, Any]:
    """The lines spoken before the clock starts on a timed pitch."""
    seconds = max(15, min(180, seconds))
    return {"seconds": seconds, "lines": spoken_coach.brief_lines(seconds, name[:40])}


@router.post("/speak")
async def speak(request: Request, body: SpeakBody) -> Response:
    """One spoken line as audio.

    A 503 here is not an error the visitor should see: it means no provider is
    configured, and the browser speaks the same text itself.
    """
    client = request.client.host if request.client else "unknown"
    # A review is a dozen lines and a founder may replay it. Generous per
    # minute, still short of anything that could drain a paid TTS balance.
    if not allow(f"tts:{client}", limit=90, window_sec=60):
        raise HTTPException(429, "Too many voice requests. Wait a moment.")

    result = await tts.synthesize(body.text, body.voice)
    if result is None:
        raise HTTPException(503, "No speech provider is configured on this server.")
    audio, mime = result
    return Response(
        content=audio,
        media_type=mime,
        headers={
            "Cache-Control": "private, max-age=86400",
            "Content-Length": str(len(audio)),
        },
    )


@router.get("/script/{session_id}")
async def voice_script(session_id: str, purpose: str = "") -> dict[str, Any]:
    """The spoken review of one finished session.

    `purpose` is what the speaker said they were practising for. It only
    changes the closing line, but the closing line is the one that says what to
    do next, and "before you're in front of the class" is not advice you give
    someone raising a seed round.
    """
    # Imported here rather than at module scope: routers/sessions.py pulls in
    # the analysis stack, and importing it eagerly from a sibling router makes
    # startup order matter for no reason.
    from .sessions import get_session

    detail = get_session(session_id)
    session = detail.get("session") or {}
    status = str(session.get("status") or "")
    if status in ("pending", "analyzing"):
        return {"status": status, "lines": [], "voice": tts.status()}
    if status == "error":
        return {
            "status": "error",
            "lines": [
                {
                    "id": "error",
                    "kind": "close",
                    "text": "That recording didn't make it through analysis. Try the take again.",
                }
            ],
            "voice": tts.status(),
        }

    events = detail.get("events") or []
    purpose = (purpose or "").strip().lower()[:32]
    key = _script_key(session_id, session, events, purpose)
    cached = _SCRIPTS.get(key)
    if cached is not None:
        _SCRIPTS.move_to_end(key)
        return {"status": "ready", "lines": cached, "voice": tts.status()}

    lines = spoken_coach.build_script(
        session,
        detail.get("metrics") or {},
        events,
        detail.get("lab_recs") or [],
        purpose=purpose,
    )
    lines = await spoken_coach.humanize(lines)
    _SCRIPTS[key] = lines
    while len(_SCRIPTS) > _SCRIPT_LIMIT:
        _SCRIPTS.popitem(last=False)
    return {"status": "ready", "lines": lines, "voice": tts.status()}


@router.get("/conversation/{session_id}")
async def voice_conversation(session_id: str, purpose: str = "") -> dict[str, Any]:
    """The spoken review as an exchange, for the page that can listen back.

    Deliberately not the same thing as `/script`. The report page plays a list
    of lines with nobody on the other end, so it gets the linear version. The
    talk page can stop in the middle and wait for an answer, so it gets the
    parts separately: what to say first, what to ask, what to correct, and what
    to ask for a second time.
    """
    from .sessions import get_session

    detail = get_session(session_id)
    session = detail.get("session") or {}
    status = str(session.get("status") or "")
    if status in ("pending", "analyzing"):
        return {"status": status, "lines": []}
    if status == "error":
        return {
            "status": "error",
            "lines": [
                {
                    "id": "error",
                    "kind": "close",
                    "text": "That recording didn't make it through analysis. Try the take again.",
                }
            ],
        }

    out = spoken_coach.build_conversation(
        session,
        detail.get("metrics") or {},
        detail.get("events") or [],
        purpose=(purpose or "").strip().lower()[:32],
    )
    return {"status": "ready", **out}


class RetryBody(BaseModel):
    before_id: str = Field(min_length=1, max_length=64)
    after_id: str = Field(min_length=1, max_length=64)
    key: str = Field(default="", max_length=32)


@router.post("/retry-reaction")
async def voice_retry_reaction(body: RetryBody) -> dict[str, Any]:
    """How the second attempt went, said rather than tabulated."""
    from .sessions import get_session

    before = get_session(body.before_id).get("metrics") or {}
    after = get_session(body.after_id).get("metrics") or {}
    return {"lines": spoken_coach.build_retry_reaction(before, after, body.key)}
