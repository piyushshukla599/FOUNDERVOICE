from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import ssl_fix  # noqa: F401 — patch SSL before any HTTPS clients
from .config import get_settings
from .db import init_db
from .middleware_security import RequestLogMiddleware
from .routers import contact, listening, memory, practice, sessions

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

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


@app.get("/api/health")
def health():
    enhanced = bool(settings.deepseek_api_key and not settings.deepseek_api_key.startswith("sk-your"))
    return {
        "ok": True,
        "product": "FounderVoice AI",
        "version": "1.0.0",
        "ai_coach": "AI Executive Coach",
        "ai_coach_ready": True,
        "ai_coach_enhanced": enhanced,
        "deepseek_configured": enhanced,
        "whisper_model": settings.whisper_model,
        "privacy": "local-first",
    }
