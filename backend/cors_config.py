from __future__ import annotations

DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:43173",
    "http://127.0.0.1:43173",
    "http://localhost:43174",
    "http://127.0.0.1:43174",
    "http://localhost:49173",
    "http://127.0.0.1:49173",
)


def get_allowed_origins(config_value: str | None) -> list[str]:
    configured = [origin.strip() for origin in (config_value or "").split(",") if origin.strip()]
    seen: set[str] = set()
    ordered: list[str] = []

    for origin in [*DEFAULT_ALLOWED_ORIGINS, *configured]:
        if origin in seen:
            continue
        seen.add(origin)
        ordered.append(origin)

    return ordered
