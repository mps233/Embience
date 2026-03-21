#!/bin/sh
set -eu

CONFIG_PATH="/usr/share/nginx/html/config.js"

escape_js() {
  printf '%s' "${1:-}" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

cat > "$CONFIG_PATH" <<EOF
window.__APP_CONFIG__ = {
  VITE_EMBY_SERVER_URL: "$(escape_js "${VITE_EMBY_SERVER_URL:-}")",
  VITE_DANMAKU_API_URL: "$(escape_js "${VITE_DANMAKU_API_URL:-}")",
  VITE_APP_VERSION: "$(escape_js "${VITE_APP_VERSION:-}")",
  VITE_APP_NAME: "$(escape_js "${VITE_APP_NAME:-}")",
  VITE_CLIENT_NAME: "$(escape_js "${VITE_CLIENT_NAME:-}")"
};
EOF
