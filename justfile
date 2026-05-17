# EmailFlare · task runner
#
# Products:
#   email-api  — transactional email sending  (services/email-worker + services/email-server)
#   inbox      — hosted email inboxes         (services/inbox-worker  + services/inbox-server)
#
# Deployment targets per product:
#   CF Worker  — edge, zero-ops, D1 + KV (+ R2/DO/Queues for inbox)
#   Docker     — any VPS/VM, full control, embedded SQLite via MesaHub

ENV_FILE     := ".env.local"
INBOX_ENV    := ".env.inbox"
INBOX_DEV_ENV:= ".env.inbox.local"

# List all recipes
default:
    @just --list

# ============================================================================
# SHARED
# ============================================================================

# Install deps for all services (run after clone or adding a new service)
install:
    pnpm install --dir scripts
    pnpm install --dir services/emails
    cd services/emails && pnpm run build
    pnpm install --dir services/email-worker
    pnpm install --dir services/email-ui
    pnpm install --dir services/email-server
    pnpm install --dir services/inbox-worker
    pnpm install --dir services/inbox-ui
    pnpm install --dir services/inbox-server
    pnpm install --dir services/inbox-bridge

# Rebuild the shared emails package (run after editing services/emails/src/)
emails-build:
    cd services/emails && pnpm run build

# ============================================================================
# EMAIL API · DOCKER  (email-server + email-ui + Caddy + Mailpit)
# ============================================================================

# Start dev stack with hot reload (MesaHub + email-server + email-ui + Mailpit)
dev:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.dev.yaml up --build

# Start dev stack in the background
dev-bg:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.dev.yaml up --build -d

# Stop dev stack
dev-down:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.dev.yaml down

# Wipe dev stack volumes and rebuild (full reset)
dev-reset:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.dev.yaml down -v
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.dev.yaml up --build

# Tail logs from the dev stack (email-server + email-ui)
logs:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.dev.yaml logs -f backend admin

# Tail logs for a single dev service: just logs-svc mesahub
logs-svc service:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.dev.yaml logs -f {{service}}

# Start production container (uses ghcr.io/0xdps/emailflare:latest by default)
prod:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.yaml up --build -d

# Stop production container
prod-down:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.yaml down

# Wipe production data volume and rebuild
prod-reset:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.yaml down -v
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.yaml up --build -d

# Tail production logs
prod-logs:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.yaml logs -f

# Build the production Docker image without starting it
build:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.yaml build app

# Show running containers (dev + prod stacks)
status:
    #!/usr/bin/env bash
    echo "=== Email API dev stack ==="
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.dev.yaml ps 2>/dev/null || echo "(not running)"
    echo ""
    echo "=== Email API prod stack ==="
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.yaml ps 2>/dev/null || echo "(not running)"
    echo ""
    echo "=== Inbox Server stack ==="
    env -i PATH="$PATH" docker compose -f compose.inbox.yaml ps 2>/dev/null || echo "(not running)"

# Quick health + auth smoke-test (auto-detects dev or prod port via ENV_FILE)
smoke:
    #!/usr/bin/env bash
    set -euo pipefail
    [ -f {{ENV_FILE}} ] || { echo "{{ENV_FILE}} missing"; exit 1; }
    ADMIN_TOKEN=$(grep -E '^ADMIN_TOKEN=' {{ENV_FILE}} | head -n1 | cut -d= -f2-)
    PORT=${PORT:-8090}
    BASE_URL="http://localhost:$PORT"
    echo "Checking $BASE_URL ..."
    code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/health")
    [ "$code" = "200" ] || { echo "/health returned $code"; exit 1; }
    code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/auth/me" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    [ "$code" = "200" ] || { echo "/api/auth/me returned $code"; exit 1; }
    echo "smoke checks passed"

# Verify Docker is running and required env files exist
doctor:
    #!/usr/bin/env bash
    set -euo pipefail
    command -v docker >/dev/null 2>&1 || { echo "docker is required"; exit 1; }
    docker info >/dev/null 2>&1 || { echo "Docker daemon is not running"; exit 1; }
    [ -f {{ENV_FILE}} ] || { echo "{{ENV_FILE}} missing — copy .env.example and fill in values"; exit 1; }
    echo "doctor: all good"

# ============================================================================
# EMAIL API · CLOUDFLARE WORKER  (email-worker + email-ui on the edge)
# ============================================================================

# Authenticate wrangler with Cloudflare (opens browser)
worker-login:
    cd services/email-worker && npx wrangler login

# First-time setup: creates D1 + KV, runs migrations, sets secrets, deploys.
# Copy scripts/config.example.toml → scripts/config.toml before running.
worker-setup:
    node scripts/setup.mjs

# Apply pending D1 migrations and deploy the latest Worker code (atomic)
worker-update:
    cd services/email-worker && pnpm run cf:update

# Start local Worker dev server with local D1 + KV stubs
worker-dev:
    cd services/email-worker && pnpm dev

# Start Localflare sidecar for local Cloudflare bindings.
# Defaults to port 8790 to avoid colliding with wrangler dev on 8787.
# Usage: just localflare          # port 8790
#        just localflare 8787     # explicit override
localflare port='8790':
    cd services/email-worker && npx localflare --port {{port}}

# Update a Worker secret interactively.
# Usage: just worker-secret SECRET_NAME
worker-secret name:
    #!/usr/bin/env sh
    printf '{{name}}: '; stty -echo; read val; stty echo; echo
    echo "$val" | npx wrangler secret put {{name}} --cwd services/email-worker

# Upload a new Worker version for gradual traffic rollout.
# After this, use `wrangler versions deploy` to shift traffic percentage.
worker-rollout-upload:
    cd services/email-worker && pnpm run cf:rollout

# Tear down all Worker CF resources (Worker + D1 + KV). Safe to re-run.
remove-worker:
    #!/usr/bin/env bash
    set -euo pipefail

    WORKER_NAME="$(node -e 'const fs=require("node:fs"); const src=fs.readFileSync("services/email-worker/wrangler.jsonc", "utf8"); const cfg=Function(`"use strict"; return (${src});`)(); process.stdout.write(cfg.name ?? "");')"
    D1_NAME="$(node -e 'const fs=require("node:fs"); const src=fs.readFileSync("services/email-worker/wrangler.jsonc", "utf8"); const cfg=Function(`"use strict"; return (${src});`)(); process.stdout.write(cfg.d1_databases?.[0]?.database_name ?? "");')"
    KV_ID="$(node -e 'const fs=require("node:fs"); const src=fs.readFileSync("services/email-worker/wrangler.jsonc", "utf8"); const cfg=Function(`"use strict"; return (${src});`)(); process.stdout.write(cfg.kv_namespaces?.[0]?.id ?? "");')"

    echo "Removing Email API Worker resources..."

    if [ -n "${WORKER_NAME:-}" ]; then
        echo "  Worker: ${WORKER_NAME}"
        npx wrangler delete "${WORKER_NAME}" --force --cwd services/email-worker || true
    else
        echo "  Worker: skipped (name not found)"
    fi

    if [ -n "${D1_NAME:-}" ]; then
        echo "  D1: ${D1_NAME}"
        npx wrangler d1 delete "${D1_NAME}" --skip-confirmation --cwd services/email-worker || true
    else
        echo "  D1: skipped (database_name not found)"
    fi

    if [ -n "${KV_ID:-}" ]; then
        echo "  KV: ${KV_ID}"
        npx wrangler kv namespace delete --namespace-id "${KV_ID}" --skip-confirmation --cwd services/email-worker || true
    else
        echo "  KV: skipped (id not found)"
    fi

    echo "Done."

# ============================================================================
# INBOX · CLOUDFLARE WORKER  (inbox-worker + inbox-ui, D1 + R2 + KV + DO)
# ============================================================================

# First-time setup: creates D1, KV, R2, Queue, patches wrangler.jsonc,
# runs migrations, sets secrets, builds inbox-ui, deploys. Idempotent.
# Optionally copy scripts/config.example.toml → scripts/config.toml first.
inbox-deploy:
    node scripts/deploy-inbox.mjs

# Start local inbox Worker dev server.
# Builds inbox-ui once if dist/ is missing (wrangler needs the assets dir).
# For live UI editing run `just inbox-dev-ui` in a second terminal.
inbox-dev:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -d services/inbox-ui/dist ]; then
        echo "inbox-ui/dist missing — building first…"
        cd services/inbox-ui && pnpm install --frozen-lockfile && pnpm build
        cd "$OLDPWD"
    fi
    cd services/inbox-worker && npx wrangler dev

# Start inbox-ui Vite dev server (proxies /api and /v1 to wrangler dev on :8787)
inbox-dev-ui:
    cd services/inbox-ui && pnpm dev

# Apply pending D1 migrations, rebuild inbox-ui, and deploy the Worker
inbox-update:
    cd services/inbox-worker && npx wrangler d1 migrations apply emailflare --remote
    cd services/inbox-ui && pnpm build
    cd services/inbox-worker && npx wrangler deploy

# Build inbox-ui only (without deploying)
inbox-build-ui:
    cd services/inbox-ui && pnpm install --frozen-lockfile && pnpm build

# Update an inbox Worker secret interactively.
# Usage: just inbox-secret SESSION_SECRET
inbox-secret name:
    #!/usr/bin/env sh
    printf '{{name}}: '; stty -echo; read val; stty echo; echo
    echo "$val" | npx wrangler secret put {{name}} --cwd services/inbox-worker

# ============================================================================
# INBOX · NODE.JS SERVER  (inbox-server + inbox-ui + inbox-bridge + Caddy)
#
# Local dev:
#   just inbox-server-setup    (first time: copy env + install deps)
#   just inbox-server-local    (single command: server + UI, auto-starts Docker
#                               deps if MESAHUB_URL points to localhost)
#
# Production (Docker):
#   just inbox-server-up       (build + start full stack)
#   just inbox-server-logs     (tail logs)
#   just inbox-server-update   (rebuild + restart)
# ============================================================================

# First-time setup: copy env template + install all inbox-server deps
inbox-server-setup:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f .env.inbox.local ]; then
        cp .env.inbox.example .env.inbox.local
        echo "✓ Created .env.inbox.local"
        echo "  Edit it to set MESAHUB_URL, CF_API_TOKEN, R2 credentials, etc."
    else
        echo "✓ .env.inbox.local already exists"
    fi
    echo ""
    echo "[1/2] Installing emails package..."
    cd services/emails && pnpm install && pnpm run build
    echo ""
    echo "[2/2] Installing inbox-server..."
    cd services/inbox-server && pnpm install
    echo ""
    echo "Done. Run: just inbox-server-local"

# Start Node.js server + inbox-ui — Ctrl-C stops all.
# If MESAHUB_URL in .env.inbox.local points to localhost, also starts
# Docker deps (MesaHub + Redis). Otherwise uses your external MESAHUB_URL.
inbox-server-local:
    #!/usr/bin/env bash
    set -euo pipefail
    [ -f .env.inbox.local ] || { echo "Run 'just inbox-server-setup' first"; exit 1; }

    set -a; . .env.inbox.local; set +a

    USE_DOCKER=false
    if echo "${MESAHUB_URL:-}" | grep -qE 'localhost|127\.0\.0\.1'; then
        USE_DOCKER=true
    fi

    cleanup() {
        echo ""
        echo "Stopping..."
        kill "$SERVER_PID" "$UI_PID" 2>/dev/null || true
        if [ "$USE_DOCKER" = "true" ]; then
            docker compose -f compose.inbox.dev.yaml down
        fi
    }
    trap cleanup EXIT INT TERM

    STEP=1
    if [ "$USE_DOCKER" = "true" ]; then
        echo "[$STEP/3] Starting local MesaHub + Redis..."
        MESAHUB_ADMIN_TOKEN="${MESAHUB_ADMIN_TOKEN:-inbox-dev-token}" \
          docker compose -f compose.inbox.dev.yaml up --build -d
        echo "  MesaHub  http://localhost:3003"
        echo "  Redis    localhost:6379"
        STEP=2
    else
        echo "  Using external MesaHub: ${MESAHUB_URL}"
        STEP=1
    fi

    echo "[$STEP/2] Starting inbox-server on :${INBOX_SERVER_PORT:-3002}..."
    ( cd services/inbox-server && NODE_ENV=development npx tsx watch src/index.ts ) &
    SERVER_PID=$!
    STEP=$((STEP+1))

    echo "[$STEP/2] Starting inbox-ui..."
    ( cd services/inbox-ui && VITE_BACKEND_PORT="${INBOX_SERVER_PORT:-3002}" pnpm dev ) &
    UI_PID=$!

    echo ""
    echo "  inbox-server  http://localhost:${INBOX_SERVER_PORT:-3002}"
    echo "  inbox-ui      http://localhost:5174"
    echo ""
    echo "Press Ctrl-C to stop everything."
    wait "$SERVER_PID" "$UI_PID"

# Wipe local MesaHub + Redis volumes and restart (full local reset)
inbox-server-reset:
    docker compose -f compose.inbox.dev.yaml down -v
    just inbox-server-local

# Build TypeScript (emails package first, then inbox-server)
inbox-server-build:
    cd services/emails && pnpm install && pnpm run build
    cd services/inbox-server && pnpm run build

# Start inbox-server in production mode (requires prior build + env vars)
inbox-server-start:
    #!/usr/bin/env bash
    [ -f .env.inbox.local ] && { set -a; . .env.inbox.local; set +a; }
    cd services/inbox-server && NODE_ENV=production node dist/index.js

# Start inbox production stack (Node.js + Redis + Caddy — full Docker build)
inbox-server-up:
    env -i PATH="$PATH" docker compose --env-file {{INBOX_ENV}} -f compose.inbox.yaml up --build -d

# Stop inbox production stack
inbox-server-down:
    env -i PATH="$PATH" docker compose -f compose.inbox.yaml down

# Rebuild and restart the inbox production stack
inbox-server-update:
    env -i PATH="$PATH" docker compose --env-file {{INBOX_ENV}} -f compose.inbox.yaml up --build -d

# Tail logs from the inbox production stack
inbox-server-logs:
    env -i PATH="$PATH" docker compose -f compose.inbox.yaml logs -f

# First-time standalone deploy: R2 bucket + inbox-bridge CF Worker
deploy-inbox-standalone:
    node scripts/deploy-inbox-standalone.mjs

# Update an inbox-bridge Worker secret interactively.
# Usage: just inbox-bridge-secret WEBHOOK_SECRET
inbox-bridge-secret name:
    #!/usr/bin/env sh
    printf '{{name}}: '; stty -echo; read val; stty echo; echo
    echo "$val" | npx wrangler secret put {{name}} --cwd services/inbox-bridge

# ============================================================================
# LANDING PAGE  (services/landing/ — Astro, deployed to Cloudflare Pages)
# ============================================================================

# Start landing page dev server
web:
    cd services/landing && pnpm dev
