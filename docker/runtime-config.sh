#!/bin/sh
set -eu

CONFIG_PATH="/usr/share/nginx/html/config.js"
EXTRA_LOCATION_DIR="/etc/nginx/extra-locations"
OPENSUBTITLES_PROXY_CONFIG_PATH="$EXTRA_LOCATION_DIR/opensubtitles-proxy.conf"
ASSRT_PROXY_CONFIG_PATH="$EXTRA_LOCATION_DIR/assrt-proxy.conf"
ASSRT_FILE_PROXY_CONFIG_PATH="$EXTRA_LOCATION_DIR/assrt-file-proxy.conf"

escape_js() {
  printf '%s' "${1:-}" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

escape_nginx() {
  printf '%s' "${1:-}" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

OPENSUBTITLES_ENABLED="false"
if [ -n "${OPENSUBTITLES_API_KEY:-}" ]; then
  OPENSUBTITLES_ENABLED="true"
fi

ASSRT_ENABLED="false"
if [ -n "${ASSRT_TOKEN:-}" ]; then
  ASSRT_ENABLED="true"
fi

cat > "$CONFIG_PATH" <<EOF
window.__APP_CONFIG__ = {
  VITE_EMBY_SERVER_URL: "$(escape_js "${VITE_EMBY_SERVER_URL:-}")",
  VITE_DANMAKU_API_URL: "$(escape_js "${VITE_DANMAKU_API_URL:-}")",
  VITE_APP_VERSION: "$(escape_js "${VITE_APP_VERSION:-}")",
  VITE_APP_NAME: "$(escape_js "${VITE_APP_NAME:-}")",
  VITE_CLIENT_NAME: "$(escape_js "${VITE_CLIENT_NAME:-}")",
  VITE_ASSRT_ENABLED: "$(escape_js "${VITE_ASSRT_ENABLED:-$ASSRT_ENABLED}")",
  VITE_ASSRT_PROXY_URL: "$(escape_js "${VITE_ASSRT_PROXY_URL:-/api/assrt}")",
  VITE_OPENSUBTITLES_ENABLED: "$(escape_js "${VITE_OPENSUBTITLES_ENABLED:-$OPENSUBTITLES_ENABLED}")",
  VITE_OPENSUBTITLES_PROXY_URL: "$(escape_js "${VITE_OPENSUBTITLES_PROXY_URL:-/api/opensubtitles}")"
};
EOF

mkdir -p "$EXTRA_LOCATION_DIR"

if [ -n "${OPENSUBTITLES_API_KEY:-}" ]; then
  cat > "$OPENSUBTITLES_PROXY_CONFIG_PATH" <<EOF
location /api/opensubtitles/ {
  proxy_pass https://api.opensubtitles.com/api/v1/;
  proxy_ssl_server_name on;
  proxy_set_header Host api.opensubtitles.com;
  proxy_set_header Api-Key "$(escape_nginx "${OPENSUBTITLES_API_KEY:-}")";
  proxy_set_header User-Agent "$(escape_nginx "${OPENSUBTITLES_USER_AGENT:-Embience v1.0.0}")";
  proxy_set_header Accept "application/json";
}
EOF
else
  cat > "$OPENSUBTITLES_PROXY_CONFIG_PATH" <<EOF
location /api/opensubtitles/ {
  default_type application/json;
  return 503 '{"message":"OpenSubtitles 代理未配置，请设置 OPENSUBTITLES_API_KEY"}';
}
EOF
fi

if [ -n "${ASSRT_TOKEN:-}" ]; then
  cat > "$ASSRT_PROXY_CONFIG_PATH" <<EOF
location /api/assrt/sub/ {
  proxy_pass https://api.assrt.net/v1/sub/;
  proxy_ssl_server_name on;
  proxy_set_header Host api.assrt.net;
  proxy_set_header Authorization "Bearer $(escape_nginx "${ASSRT_TOKEN:-}")";
  proxy_set_header Accept "application/json";
}
EOF
else
  cat > "$ASSRT_PROXY_CONFIG_PATH" <<EOF
location /api/assrt/sub/ {
  default_type application/json;
  return 503 '{"message":"ASSRT 代理未配置，请设置 ASSRT_TOKEN"}';
}
EOF
fi

cat > "$ASSRT_FILE_PROXY_CONFIG_PATH" <<'EOF'
location ^~ /api/assrt/file/ {
  resolver 1.1.1.1 8.8.8.8 valid=30s ipv6=off;
  default_type application/octet-stream;

  # 从路径中提取目标 URL（/api/assrt/file/ 后面的完整内容含查询参数）
  if ($request_uri ~* "^/api/assrt/file/(.+)$") {
    set $proxy_target $1;
  }

  # 跟随重定向：把 3xx 响应的 Location 再次代理
  proxy_ssl_server_name on;
  proxy_pass $proxy_target;
  proxy_set_header Host "";
  proxy_set_header Referer "";

  # 拦截 3xx，通过 error_page 跟随重定向
  proxy_intercept_errors on;
  error_page 301 302 307 308 = @assrt_file_redirect;

  proxy_hide_header Access-Control-Allow-Origin;
  proxy_hide_header Access-Control-Allow-Credentials;
  add_header Access-Control-Allow-Origin * always;
}

location @assrt_file_redirect {
  resolver 1.1.1.1 8.8.8.8 valid=30s ipv6=off;
  set $redirect_target $upstream_http_location;
  proxy_ssl_server_name on;
  proxy_pass $redirect_target;
  proxy_set_header Host "";
  proxy_set_header Referer "";
  proxy_hide_header Access-Control-Allow-Origin;
  proxy_hide_header Access-Control-Allow-Credentials;
  add_header Access-Control-Allow-Origin * always;
}
EOF
