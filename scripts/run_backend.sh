#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
VENV_PYTHON="$BACKEND_DIR/.venv/bin/python"
ENV_FILE="$PROJECT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8000}"

cd "$BACKEND_DIR"
exec "$VENV_PYTHON" -m uvicorn main:app --host "$HOST" --port "$PORT"
