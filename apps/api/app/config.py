from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


# apps/api/app/config.py -> the repo root is four levels up. A container that
# copies only ``app/`` sits shallower than that, and parents[3] raised
# IndexError at import time rather than anywhere useful, so fall back.
_PARENTS = Path(__file__).resolve().parents
ROOT = _PARENTS[3] if len(_PARENTS) > 3 else _PARENTS[-1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"
    # local = rule templates only (free). enhanced = DeepSeek when API key set.
    coach_mode: str = "local"
    # Smart Session clips: collect metrics only; full verdict after exercise.
    listening_light_analysis: bool = True

    # "local" loads faster-whisper in-process and needs ~2 GB of RAM.
    # "groq" calls a hosted Whisper instead, so the box stays small.
    asr_provider: str = "local"
    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_model: str = "whisper-large-v3-turbo"
    groq_timeout: float = 120.0

    whisper_model: str = "large-v3"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"

    # --- Coach voice (text to speech) -------------------------------------
    # The coach speaks its review as well as writing it, and by default that
    # costs nothing: "off" means the browser says the lines with its own
    # built-in voice — free, offline, no account, and on Edge/macOS/iOS a
    # neural voice that genuinely passes for a person.
    #
    # The hosted providers below are the paid upgrade, and they are opt-in for
    # exactly that reason: a key sitting in .env for ASR must never quietly
    # start billing for speech. Set TTS_PROVIDER=auto (or name one) to use
    # them. Only finished coaching text is sent — never audio, same line
    # AGENTS.md draws for DeepSeek.
    tts_provider: str = "off"
    tts_timeout: float = 45.0

    elevenlabs_api_key: str = ""
    # Rachel, the stock ElevenLabs voice. This single value is most of what
    # decides whether the coach sounds like someone you would take notes from,
    # so point it at a voice from your own library when you have one.
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"
    elevenlabs_model: str = "eleven_turbo_v2_5"

    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_tts_model: str = "gpt-4o-mini-tts"
    openai_tts_voice: str = "onyx"
    openai_tts_instructions: str = (
        "Speak like a calm, direct executive speech coach sitting across the table. "
        "Warm but unsentimental. Land the last word of each sentence."
    )

    # Reuses GROQ_API_KEY when one is already set for ASR.
    groq_tts_model: str = "playai-tts"
    groq_tts_voice: str = "Fritz-PlayAI"

    data_dir: str = str(ROOT / "data")
    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3001,http://127.0.0.1:3001,"
        "http://localhost:3002,http://127.0.0.1:3002,"
        "http://192.168.1.7:3000"
    )
    max_upload_bytes: int = 100 * 1024 * 1024  # 100 MB

    # Contact / feedback form → your inbox
    contact_to_email: str = "info@foundervoice.app"
    contact_from_email: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    # --- Free-tier quotas -------------------------------------------------
    # Whisper transcription and the practice chat are the costly paths; these
    # cap what one anonymous visitor can spend on a free host.
    quota_enabled: bool = True
    free_upload_limit: int = 10
    free_practice_limit: int = 2
    free_practice_turn_limit: int = 20
    # Counters roll rather than accumulate forever: a visitor gets the full
    # allowance again this many hours after their first use of a feature.
    quota_window_hours: int = 24
    # HMAC key for hashing client addresses. MUST be set in production, or
    # counters reset on every restart. Generate: python -c "import secrets;print(secrets.token_hex(32))"
    quota_secret: str = ""
    # Name the header your proxy sets, e.g. "cf-connecting-ip" behind Cloudflare
    # or "x-forwarded-for" behind a plain reverse proxy. Leave EMPTY when the
    # API is reachable directly — otherwise any caller can forge their identity.
    trusted_proxy_header: str = ""
    # Loopback/LAN callers are the operator, not the public.
    quota_exempt_private: bool = True
    # Where an exhausted visitor is sent to ask for more.
    upgrade_url: str = "/contact?interest=pro"

    # The workspace cookie is what separates one visitor's recordings from
    # another's. "lax" is correct when the API shares a registrable domain with
    # the site (foundervoice.app and api.foundervoice.app do), and is the safer
    # choice because it is not sent on cross-site writes. Set "none" only if
    # the API lives on an unrelated domain, where "lax" would drop the cookie
    # and hand every request a brand new workspace.
    workspace_cookie_samesite: str = "lax"


    # Production toggles
    api_docs_enabled: bool = True  # set API_DOCS_ENABLED=false in production if desired

    @property
    def data_root(self) -> Path:
        """Everything the server stores, across all visitors."""
        return Path(self.data_dir).resolve()

    @property
    def data_path(self) -> Path:
        """This visitor's own corner of it.

        Every derived path below hangs off this, so setting a workspace scopes
        the database, the audio, the transcripts and the reports in one move
        rather than in every query that touches them.
        """
        from .workspace import get_workspace

        workspace_id = get_workspace()
        if workspace_id:
            return self.data_root / "ws" / workspace_id
        return self.data_root

    @property
    def shared_db_path(self) -> Path:
        """Counters and leads, which must survive a visitor clearing cookies."""
        return self.data_root / "shared.db"

    @property
    def audio_dir(self) -> Path:
        return self.data_path / "audio"

    @property
    def transcripts_dir(self) -> Path:
        return self.data_path / "transcripts"

    @property
    def reports_dir(self) -> Path:
        return self.data_path / "reports"

    @property
    def models_dir(self) -> Path:
        # Model weights are shared: they are large, and identical per visitor.
        return self.data_root / "models"

    @property
    def db_path(self) -> Path:
        return self.data_path / "foundervoice.db"


@lru_cache
def get_settings() -> Settings:
    return Settings()
