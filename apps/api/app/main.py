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
from .config import get_settings
from .db import init_db
from .middleware_security import RequestLogMiddleware
from .routers import contact, listening, memory, practice, sessions
from .services import jobs, quota

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
init_db()

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

app.include_router(sessions.router, prefix="/api")
app.include_router(listening.router, prefix="/api")
app.include_router(memory.router, prefix="/api")
app.include_router(practice.router, prefix="/api")
app.include_router(contact.router, prefix="/api")


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
    return {
        "ok": True,
        "product": "FounderVoice AI",
        "version": "1.0.0",
        "ai_coach": settings.coach_mode,
        "ai_coach_ready": True,
        "ai_coach_enhanced": enhanced and settings.coach_mode == "enhanced",
        "deepseek_configured": enhanced,
        "whisper_model": settings.whisper_model,
        "analysis_queue": jobs.queue_depth(),
        "listening_light_analysis": settings.listening_light_analysis,
        "privacy": "local-first",
        "quota_enabled": settings.quota_enabled,
        "free_limits": {
            "upload": settings.free_upload_limit,
            "practice": settings.free_practice_limit,
        },
    }
