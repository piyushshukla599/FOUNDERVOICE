from __future__ import annotations

import logging
import os

# librosa/numpy and ctranslate2 (Whisper) each ship their own OpenMP runtime.
# On Windows, loading both aborts the process with "OMP: Error #15" and no
# Python traceback — the API simply vanishes mid-analysis. Allow the duplicate
# and cap worker threads so one analysis cannot saturate every core.
# Must run before anything imports numpy/librosa (the routers do, below).
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("OMP_NUM_THREADS", "4")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from . import ssl_fix  # noqa: F401 — patch SSL before any HTTPS clients
from . import legacy, workspace
from .config import get_settings
from .db import init_shared_db
from .middleware_security import RequestLogMiddleware
from .routers import contact, listening, memory, practice, sessions, voice
from .services import jobs, quota, tts

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)


class _DropClientDisconnects(logging.Filter):
    """Silence Windows proactor noise when a browser walks away mid-stream.

    Seeking or pausing an <audio> element aborts the range request. On Windows,
    asyncio then logs the resulting ConnectionResetError as an unhandled ERROR
    with a traceback, which looks alarming but means only that the client hung
    up. The response itself already completed.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        exc = record.exc_info[1] if record.exc_info else None
        if isinstance(exc, (ConnectionResetError, ConnectionAbortedError)):
            return False
        return "_call_connection_lost" not in record.getMessage()


logging.getLogger("asyncio").addFilter(_DropClientDisconnects())

settings = get_settings()
init_shared_db()

_adopted = legacy.adopt_legacy_data()
if _adopted:
    logging.getLogger("foundervoice.api").info(
        "Moved pre-workspace data into workspace %s; the first local visitor gets it.",
        _adopted,
    )

app = FastAPI(
    title="FounderVoice AI",
    version="1.0.0",
    redirect_slashes=False,
    docs_url="/api/docs" if settings.api_docs_enabled else None,
    redoc_url=None,
    openapi_url="/api/openapi.json" if settings.api_docs_enabled else None,
)
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    # Next.js falls over to 3001/3002 when 3000 is already taken.
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLogMiddleware)


@app.middleware("http")
async def workspace_middleware(request: Request, call_next):
    """Give every visitor their own database, keyed by a signed cookie.

    There are no accounts, so this is the only thing separating one person's
    recordings from another's. A cookie that is missing, malformed or forged
    gets a brand new workspace rather than a shared one.
    """
    workspace_id = workspace.from_cookie(request.cookies.get(workspace.COOKIE_NAME))
    is_new = workspace_id is None
    if is_new:
        # An install that predates workspaces has one waiting to be claimed,
        # but only by someone talking to uvicorn directly. Behind a proxy the
        # socket peer is the proxy itself, so an address check alone would
        # hand those recordings to whoever arrived first.
        host = request.client.host if request.client else None
        proxied = any(
            h in request.headers
            for h in ("x-forwarded-for", "x-forwarded-proto", "x-real-ip", "forwarded")
        ) or bool((settings.trusted_proxy_header or "").strip())
        workspace_id = legacy.offer(host, proxied=proxied) or workspace.mint()
    else:
        legacy.mark_claimed(workspace_id)

    # Only the app's own fetches may create a workspace. A subresource - an
    # <audio> element, an image, a PDF link - can reach the API without the
    # cookie when the site and the API are different sites, and answering one
    # of those with Set-Cookie replaced the visitor's workspace with an empty
    # one and lost their whole session list. Sec-Fetch-Dest is sent by every
    # browser that enforces SameSite in the first place, so its absence means
    # a non-browser client, which is free to have a workspace minted for it.
    dest = request.headers.get("sec-fetch-dest", "")
    may_mint = dest in ("", "empty", "document")

    token = workspace.set_workspace(workspace_id)
    try:
        response = await call_next(request)
    finally:
        # Background tasks run after this, and carry the workspace themselves
        # via workspace.bind() rather than relying on this context.
        workspace.reset_workspace(token)

    if is_new and may_mint:
        # The site and the API are different origins, so the cookie has to be
        # allowed on cross-origin requests. SameSite=None demands Secure, which
        # is fine in production and unavailable over plain http locally.
        same_site = (settings.workspace_cookie_samesite or "lax").strip().lower()
        if same_site not in {"lax", "strict", "none"}:
            same_site = "lax"
        # SameSite=None is only honoured on a Secure cookie, and a Secure
        # cookie is dropped entirely over plain http, which is how local
        # development is served.
        secure = request.url.scheme == "https"
        if same_site == "none" and not secure:
            same_site = "lax"
        response.set_cookie(
            workspace.COOKIE_NAME,
            workspace.to_cookie(workspace_id),
            max_age=60 * 60 * 24 * 365,
            httponly=True,
            secure=secure,
            samesite=same_site,
            path="/",
        )
    return response

app.include_router(sessions.router, prefix="/api")
app.include_router(listening.router, prefix="/api")
app.include_router(memory.router, prefix="/api")
app.include_router(practice.router, prefix="/api")
app.include_router(contact.router, prefix="/api")
app.include_router(voice.router, prefix="/api")


@app.get("/api/quota")
def quota_status(request: Request):
    """What this visitor has left. The web app gates its UI on this."""
    return {
        "enabled": settings.quota_enabled,
        "features": quota.snapshot(request),
        "upgrade_url": settings.upgrade_url,
    }


@app.get("/api/health")
def health():
    enhanced = bool(settings.deepseek_api_key and not settings.deepseek_api_key.startswith("sk-your"))
    _asr_provider = settings.asr_provider.strip().lower()
    return {
        "ok": True,
        "product": "FounderVoice AI",
        "version": "1.0.0",
        "ai_coach": settings.coach_mode,
        "ai_coach_ready": True,
        "ai_coach_enhanced": enhanced and settings.coach_mode == "enhanced",
        "deepseek_configured": enhanced,
        "asr_provider": _asr_provider,
        "asr_model": settings.groq_model if _asr_provider == "groq" else settings.whisper_model,
        "analysis_queue": jobs.queue_depth(),
        # False is not a broken install: the browser speaks the same script
        # with its own voice. It only tells the app which one it will hear.
        "coach_voice": tts.status(),
        "listening_light_analysis": settings.listening_light_analysis,
        # Truthful per deployment: audio only stays put when Whisper runs here.
        "privacy": "local-first" if _asr_provider == "local" else "hosted-asr",
        "quota_enabled": settings.quota_enabled,
        "free_limits": {
            "upload": settings.free_upload_limit,
            "practice": settings.free_practice_limit,
        },
    }
