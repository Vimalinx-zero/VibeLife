from pathlib import Path
import os

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_ROOT / ".env"


def load_environment() -> None:
    load_dotenv(ENV_FILE)


def get_allowed_origins() -> list[str]:
    allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "").strip()
    if not allowed_origins_str:
        return []

    return [
        origin.strip().rstrip("/")
        for origin in allowed_origins_str.split(",")
        if origin.strip()
    ]


def get_allow_origin_regex() -> str | None:
    configured_regex = os.getenv("ALLOW_ORIGIN_REGEX", "").strip()
    if configured_regex:
        return configured_regex

    if get_allowed_origins():
        return None

    environment = os.getenv("ENVIRONMENT", "development").strip().lower()
    if environment != "production":
        return r"^https?://[^/]+(:\d+)?$"

    return None
