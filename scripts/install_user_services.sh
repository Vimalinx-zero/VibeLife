#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SYSTEMD_USER_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/vibelife-local"
BACKEND_SERVICE_NAME="vibelife-local-backend.service"
FRONTEND_SERVICE_NAME="vibelife-local-frontend.service"
NPM_BIN="$(command -v npm)"
NODE_BIN="$(command -v node)"
NODE_BIN_DIR="$(dirname "$NODE_BIN")"
SYSTEM_PATH="$NODE_BIN_DIR:/usr/local/bin:/usr/bin:/bin"

mkdir -p "$SYSTEMD_USER_DIR" "$STATE_DIR"

cat > "$SYSTEMD_USER_DIR/$BACKEND_SERVICE_NAME" <<EOF
[Unit]
Description=VibeLife Local Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_DIR
Environment=PYTHONUNBUFFERED=1
ExecStart=/usr/bin/bash $PROJECT_DIR/scripts/run_backend.sh
Restart=on-failure
RestartSec=3
StandardOutput=append:$STATE_DIR/backend.log
StandardError=append:$STATE_DIR/backend.log

[Install]
WantedBy=default.target
EOF

cat > "$SYSTEMD_USER_DIR/$FRONTEND_SERVICE_NAME" <<EOF
[Unit]
Description=VibeLife Local Frontend
After=$BACKEND_SERVICE_NAME
Requires=$BACKEND_SERVICE_NAME

[Service]
Type=simple
WorkingDirectory=$PROJECT_DIR
Environment=PATH=$SYSTEM_PATH
Environment=NPM_BIN=$NPM_BIN
ExecStart=/usr/bin/bash $PROJECT_DIR/scripts/run_frontend_preview.sh
Restart=on-failure
RestartSec=3
StandardOutput=append:$STATE_DIR/frontend.log
StandardError=append:$STATE_DIR/frontend.log

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now "$BACKEND_SERVICE_NAME" "$FRONTEND_SERVICE_NAME"

echo "Installed:"
echo "  $BACKEND_SERVICE_NAME"
echo "  $FRONTEND_SERVICE_NAME"
echo "Logs:"
echo "  $STATE_DIR/backend.log"
echo "  $STATE_DIR/frontend.log"
