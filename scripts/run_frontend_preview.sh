#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$PROJECT_DIR/frontend"
ENV_FILE="$PROJECT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

BACKEND_HOST="${HOST:-127.0.0.1}"
BACKEND_PORT="${PORT:-8000}"
HOST="${FRONTEND_HOST:-127.0.0.1}"
PORT="${FRONTEND_PORT:-5173}"
NPM_BIN="${NPM_BIN:-npm}"

cd "$FRONTEND_DIR"

needs_build() {
  if [ ! -f "$FRONTEND_DIR/dist/index.html" ]; then
    return 0
  fi

  if find "$FRONTEND_DIR/src" "$FRONTEND_DIR/public" \
      "$FRONTEND_DIR/index.html" "$FRONTEND_DIR/package.json" \
      "$FRONTEND_DIR/package-lock.json" "$FRONTEND_DIR/tsconfig.json" \
      "$FRONTEND_DIR/tsconfig.node.json" "$FRONTEND_DIR/eslint.config.js" \
      "$FRONTEND_DIR/postcss.config.js" "$FRONTEND_DIR/tailwind.config.js" \
      "$ENV_FILE" \
      -newer "$FRONTEND_DIR/dist/index.html" -print -quit 2>/dev/null | grep -q .; then
    return 0
  fi

  return 1
}

if needs_build; then
  VITE_API_PORT="$BACKEND_PORT" \
  VITE_API_BASE_URL="http://$BACKEND_HOST:$BACKEND_PORT" \
  "$NPM_BIN" run build >/dev/null
fi

exec "$NPM_BIN" run preview -- --host "$HOST" --port "$PORT" --strictPort
