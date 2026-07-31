from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"

    whisper_model: str = "large-v3"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"

    data_dir: str = str(ROOT / "data")
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.7:3000"
    max_upload_bytes: int = 100 * 1024 * 1024  # 100 MB

    # Contact / feedback form → your inbox
    contact_to_email: str = ""
    contact_from_email: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    # Production toggles
    api_docs_enabled: bool = True  # set API_DOCS_ENABLED=false in production if desired

    @property
    def data_path(self) -> Path:
        return Path(self.data_dir).resolve()

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
        return self.data_path / "models"

    @property
    def db_path(self) -> Path:
        return self.data_path / "foundervoice.db"


@lru_cache
def get_settings() -> Settings:
    return Settings()
