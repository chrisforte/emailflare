# EmailFlare Task Runner

ENV_FILE := ".env.local"

# Default recipe
default:
    @just --list

# ============================================================================
# DEVELOPMENT  (compose.dev.yaml — embedded mesahub, hot reload)
# ============================================================================

# Start full dev stack (mesahub + backend + admin + mailpit + edge)
dev:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.dev.yaml up --build

# Start dev stack in background
dev-bg:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.dev.yaml up --build -d

# Stop dev stack
dev-down:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.dev.yaml down

# Reset dev stack (wipe volumes and rebuild)
dev-reset:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.dev.yaml down -v
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.dev.yaml up --build

# Stream logs (backend + admin)
logs:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.dev.yaml logs -f backend admin

# Stream a single service log: just logs-svc mesahub
logs-svc service:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.dev.yaml logs -f {{service}}

# ============================================================================
# PRODUCTION  (compose.yaml — single bundled container)
# ============================================================================

# Start production container
prod:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.yaml up --build -d

# Stop production container
prod-down:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.yaml down

# Reset production (wipe data volume and rebuild)
prod-reset:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.yaml down -v
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.yaml up --build -d

# Stream production logs
prod-logs:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.yaml logs -f

# Build production image only (no start)
build:
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.yaml build app

# ============================================================================
# STATUS & SMOKE
# ============================================================================

# Show running containers for both stacks
status:
    #!/usr/bin/env bash
    echo "=== Dev stack ==="
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.dev.yaml ps 2>/dev/null || echo "(not running)"
    echo ""
    echo "=== Prod stack ==="
    env -i PATH="$PATH" docker compose --env-file {{ENV_FILE}} -f compose.yaml ps 2>/dev/null || echo "(not running)"

# Quick health + auth smoke check (auto-detects dev or prod port)
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

# Validate Docker is available and .env exists
doctor:
    #!/usr/bin/env bash
    set -euo pipefail
    command -v docker >/dev/null 2>&1 || { echo "docker is required"; exit 1; }
    docker info >/dev/null 2>&1 || { echo "Docker daemon is not running"; exit 1; }
    [ -f {{ENV_FILE}} ] || { echo "{{ENV_FILE}} missing — copy .env.example to .env.local and fill in values"; exit 1; }
    echo "doctor: all good"

