#!/bin/sh
set -e

# Node listens on this internal port — must NOT equal $PORT
export BACKEND_PORT=${BACKEND_PORT:-3001}
# Caddy listens on this public port — Railway injects PORT automatically
export PORT=${PORT:-80}

echo "=========================================="
echo "  EmailFlare — Starting Services"
echo "=========================================="

echo "[1/3] Starting backend on port $BACKEND_PORT..."
PORT=$BACKEND_PORT node /app/backend/dist/index.js &
BACKEND_PID=$!

echo "[2/3] Waiting for backend to be ready..."
max_attempts=30
attempt=0
until curl -sf http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ $attempt -eq $max_attempts ]; then
    echo "✗ Backend failed to start after ${max_attempts}s"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done
echo "✓ Backend ready on port $BACKEND_PORT"

echo "[3/3] Starting Caddy on port $PORT..."

cat > /tmp/Caddyfile <<EOF
{
  auto_https off
  admin off
}

:$PORT {
  handle /health {
    reverse_proxy localhost:${BACKEND_PORT}
  }

  handle /api/* {
    reverse_proxy localhost:${BACKEND_PORT}
  }

  handle /v1/* {
    reverse_proxy localhost:${BACKEND_PORT}
  }

  handle /assets/* {
    header Cache-Control "public, max-age=31536000"
    file_server
  }

  handle {
    root * /usr/share/caddy
    try_files {path} /index.html
    file_server
  }
}
EOF

caddy fmt --overwrite /tmp/Caddyfile
caddy run --config /tmp/Caddyfile
