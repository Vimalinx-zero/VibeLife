#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$PROJECT_DIR/frontend"
ENV_FILE="$PROJECT_DIR/.env"
ORIGINAL_HOST="${HOST-}"
ORIGINAL_PORT="${PORT-}"
ORIGINAL_FRONTEND_HOST="${FRONTEND_HOST-}"
ORIGINAL_FRONTEND_PORT="${FRONTEND_PORT-}"
ORIGINAL_NPM_BIN="${NPM_BIN-}"
ORIGINAL_VITE_BIN="${VITE_BIN-}"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [ -n "$ORIGINAL_HOST" ]; then
  HOST="$ORIGINAL_HOST"
fi

if [ -n "$ORIGINAL_PORT" ]; then
  PORT="$ORIGINAL_PORT"
fi

if [ -n "$ORIGINAL_FRONTEND_HOST" ]; then
  FRONTEND_HOST="$ORIGINAL_FRONTEND_HOST"
fi

if [ -n "$ORIGINAL_FRONTEND_PORT" ]; then
  FRONTEND_PORT="$ORIGINAL_FRONTEND_PORT"
fi

if [ -n "$ORIGINAL_NPM_BIN" ]; then
  NPM_BIN="$ORIGINAL_NPM_BIN"
fi

if [ -n "$ORIGINAL_VITE_BIN" ]; then
  VITE_BIN="$ORIGINAL_VITE_BIN"
fi

BACKEND_HOST="${HOST:-127.0.0.1}"
BACKEND_PORT="${PORT:-8000}"
HOST="${FRONTEND_HOST:-127.0.0.1}"
PORT="${FRONTEND_PORT:-5173}"
NPM_BIN="${NPM_BIN:-npm}"
VITE_BIN="${VITE_BIN:-$FRONTEND_DIR/node_modules/.bin/vite}"

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

exec "$VITE_BIN" preview --host "$HOST" --port "$PORT" --strictPort
