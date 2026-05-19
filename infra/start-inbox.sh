#!/bin/sh
set -e

# Start script for the emailflare inbox-server (standalone Node.js deployment).
# Handles optional embedded mesahub-server (mh://local/dbname) before
# launching the Node.js Hono server.

# Internal port that the Node.js server listens on (NOT the public Caddy port)
export INBOX_NODE_PORT="${INBOX_NODE_PORT:-3002}"
# Caddy listens on this public port (Railway injects PORT automatically)
export PORT="${PORT:-80}"

echo "=========================================="
echo "  EmailFlare Inbox Server — Starting"
echo "=========================================="

# ── [0] Mesahub: embedded or external ─────────────────────────────────────────
# MESAHUB_URL format: mh://[token@]host[:port]/dbname
# Use mh://local/dbname to start a bundled mesahub-server in this container.

MESAHUB_URL="${MESAHUB_URL:-}"
if [ -z "$MESAHUB_URL" ]; then
  echo "✗ MESAHUB_URL is required (e.g. mh://token@host/db or mh://local/db)"
  exit 1
fi

# Parse: strip scheme, split on / to get host-part and dbname
_INNER="${MESAHUB_URL#mh://}"
_DBNAME="${_INNER##*/}"
_HOSTPART="${_INNER%%/*}"
if echo "$_HOSTPART" | grep -q "@"; then
  _HOST="${_HOSTPART##*@}"
else
  _HOST="$_HOSTPART"
fi

if [ "$_HOST" = "local" ]; then
  # ── Embedded mode ───────────────────────────────────────────────────────────
  export MESAHUB_CORE_PORT="${MESAHUB_CORE_PORT:-3003}"
  _ADMIN_TOKEN="${MESAHUB_ADMIN_TOKEN:-$(openssl rand -hex 32)}"

  echo "[0/3] Starting bundled mesahub-server on :$MESAHUB_CORE_PORT (db: $_DBNAME)..."
  DATA_PATH="${DATA_PATH:-/data}" \
  ADMIN_TOKEN="$_ADMIN_TOKEN" \
  SESSION_SECRET="$(openssl rand -hex 32)" \
  FILE_TOKEN_SIGNING_SECRET="$(openssl rand -hex 32)" \
  PORT="$MESAHUB_CORE_PORT" \
    mesahub-server &
  MESAHUB_PID=$!

  max_attempts=30
  attempt=0
  until curl -sf "http://localhost:${MESAHUB_CORE_PORT}/api/health" > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
      echo "✗ mesahub-server failed to start after ${max_attempts}s"
      kill $MESAHUB_PID 2>/dev/null || true
      exit 1
    fi
    sleep 1
  done
  echo "✓ mesahub-server ready on :$MESAHUB_CORE_PORT"

  # Create the application DB (idempotent — 409 just means it already exists)
  curl -sf -X POST "http://localhost:${MESAHUB_CORE_PORT}/api/db" \
    -H "Authorization: Bearer $_ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${_DBNAME}\",\"slug\":\"${_DBNAME}\",\"owner\":\"system\"}" > /dev/null 2>&1 || true
  echo "✓ Database '${_DBNAME}' ready"

  # Rewrite MESAHUB_URL with the resolved token so the Node process can parse it
  export MESAHUB_URL="mh://${_ADMIN_TOKEN}@localhost:${MESAHUB_CORE_PORT}/${_DBNAME}"
else
  echo "[0/3] External mesahub at $_HOST (db: $_DBNAME) — skipping bundled server"
fi

# ── [1] Start Node.js inbox server ────────────────────────────────────────────
# Always use the container-absolute migrations path regardless of env vars
# injected by the hosting platform (e.g. Railway).
export MIGRATIONS_DIR="${MIGRATIONS_DIR:-/app/migrations}"
case "$MIGRATIONS_DIR" in
  /*) ;;  # already absolute — keep as-is
  *)  export MIGRATIONS_DIR=/app/migrations ;;  # relative path — override
esac

echo "[1/3] Starting inbox-server on :$INBOX_NODE_PORT..."
PORT="$INBOX_NODE_PORT" node /app/inbox-server/dist/index.js &
NODE_PID=$!

# Wait for inbox-server to be ready
max_attempts=30
attempt=0
until curl -sf "http://localhost:${INBOX_NODE_PORT}/health" > /dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ $attempt -eq $max_attempts ]; then
    echo "✗ inbox-server failed to start after ${max_attempts}s"
    kill $NODE_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done
echo "✓ inbox-server ready on :$INBOX_NODE_PORT"

# ── [2] Start Caddy ───────────────────────────────────────────────────────────
echo "[2/3] Starting Caddy on :$PORT..."
INBOX_NODE_PORT="$INBOX_NODE_PORT" \
PORT="$PORT" \
  caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &
CADDY_PID=$!

echo "✓ Caddy running on :$PORT"
echo ""
echo "=========================================="
echo "  EmailFlare Inbox Server ready on :$PORT"
echo "=========================================="

# ── Wait for any service to exit ──────────────────────────────────────────────
wait -n 2>/dev/null || wait
EXIT_CODE=$?
echo "A service exited with code $EXIT_CODE — shutting down"
kill $NODE_PID $CADDY_PID 2>/dev/null || true
[ -n "${MESAHUB_PID:-}" ] && kill $MESAHUB_PID 2>/dev/null || true
exit $EXIT_CODE
