# EmailFlare Development & Production Task Runner

# Variables
PORTLESS_ALIAS := "emailflare"
PORTLESS_PROXY_PORT := "1355"
EDGE_INTERNAL_PORT := "80"

# Service names
EDGE_SERVICE := "edge"

# Default recipe
default:
    @just --list

# Validate local prerequisites and runtime contract.
doctor:
    #!/usr/bin/env bash
    set -euo pipefail
    command -v docker >/dev/null 2>&1 || { echo "docker is required"; exit 1; }
    docker info >/dev/null 2>&1 || { echo "Docker daemon is not running"; exit 1; }
    command -v just >/dev/null 2>&1 || { echo "just is required"; exit 1; }
    [ -f .env ] || { echo ".env missing"; exit 1; }
    npx portless --help >/dev/null 2>&1 || { echo "Portless not available via npx"; exit 1; }
    docker compose --env-file .env -f compose.yaml -f compose.dev.yaml config >/dev/null
    docker compose --env-file .env -f compose.yaml config >/dev/null
    echo "doctor: environment is ready"

# ============================================================================
# DEVELOPMENT RECIPES
# ============================================================================

# Start development environment with hot reload (Edge + Backend + Admin)
dev:
    #!/usr/bin/env bash
    set -euo pipefail

    [ -f .env ] || { echo ".env missing"; exit 1; }

    # Verify sqlite-hub is accessible
    if ! docker ps --format "{{{{.Names}}}}" | grep -q "^sqlite-hub-template$" 2>/dev/null; then
        echo "Warning: sqlite-hub-template container not running. Start it first with: just dev in sqlite-hub/"
    fi

    echo "Starting EmailFlare Development Environment"
    echo ""

    # Free Mailpit ports if already bound (e.g. leftover processes)
    for port in 2025 8026; do
        pid=$(lsof -ti tcp:$port 2>/dev/null || true)
        if [ -n "$pid" ]; then
            echo "Killing process on port $port (pid $pid)..."
            kill -9 $pid 2>/dev/null || true
        fi
    done

    echo "Starting containers (Docker will assign a random port)..."
    docker compose --env-file .env -f compose.yaml -f compose.dev.yaml up -d --build --force-recreate {{EDGE_SERVICE}}

    tries=0
    max_tries=90
    PORT=""
    while [ $tries -lt $max_tries ]; do
        PORT=$(docker compose --env-file .env -f compose.yaml -f compose.dev.yaml port {{EDGE_SERVICE}} {{EDGE_INTERNAL_PORT}} 2>/dev/null | awk -F: '{print $NF}')
        if [ -n "$PORT" ]; then
            break
        fi
        tries=$((tries + 1))
        sleep 1
    done

    if [ -z "$PORT" ]; then
        echo "Could not detect edge port. Check container status:"
        docker compose --env-file .env -f compose.yaml -f compose.dev.yaml ps
        exit 1
    fi

    echo ""
    echo "Services started successfully!"
    echo ""
    echo "Direct access:"
    echo "  -> http://localhost:$PORT"
    echo ""
    npx portless proxy start >/dev/null 2>&1 || true
    npx portless alias {{PORTLESS_ALIAS}} $PORT >/dev/null 2>&1 || true
    echo "Portless alias ready:"
    echo "  -> http://{{PORTLESS_ALIAS}}.localhost:{{PORTLESS_PROXY_PORT}}"
    echo ""

    health_tries=0
    health_max=120
    while [ $health_tries -lt $health_max ]; do
        if curl -sf "http://localhost:$PORT/health" >/dev/null 2>&1; then
            echo "Dev service is healthy"
            break
        fi
        health_tries=$((health_tries + 1))
        sleep 1
    done
    if [ $health_tries -ge $health_max ]; then
        echo "Dev service did not become healthy within timeout"
    fi

    cleanup() {
        docker compose --env-file .env -f compose.yaml -f compose.dev.yaml down --remove-orphans >/dev/null 2>&1 || true
        npx portless alias --remove {{PORTLESS_ALIAS}} >/dev/null 2>&1 || true
    }
    trap cleanup EXIT INT TERM

    echo "Streaming app logs (backend + admin)."
    echo "Use 'just logs-edge' if you need proxy logs."
    echo "Ctrl+C stops containers and removes Portless alias."
    docker compose --env-file .env -f compose.yaml -f compose.dev.yaml logs -f backend admin

# Start development in background (silent)
dev-bg:
    docker compose --env-file .env -f compose.yaml -f compose.dev.yaml up --build -d

# Stop all development services
down:
    #!/usr/bin/env bash
    set -euo pipefail
    docker compose --env-file .env -f compose.yaml -f compose.dev.yaml down
    npx portless alias --remove {{PORTLESS_ALIAS}} >/dev/null 2>&1 || true

# View all logs (backend + admin)
logs:
    docker compose --env-file .env -f compose.yaml -f compose.dev.yaml logs -f backend admin

# View backend logs only
logs-backend:
    docker compose --env-file .env -f compose.yaml -f compose.dev.yaml logs -f backend

# View admin logs only
logs-admin:
    docker compose --env-file .env -f compose.yaml -f compose.dev.yaml logs -f admin

# View edge (Caddy) logs only
logs-edge:
    docker compose --env-file .env -f compose.yaml -f compose.dev.yaml logs -f edge

# Reset development environment (removes volumes and containers)
reset:
    docker compose --env-file .env -f compose.yaml -f compose.dev.yaml down -v
    docker compose --env-file .env -f compose.yaml -f compose.dev.yaml up --build

# ============================================================================
# PRODUCTION RECIPES
# ============================================================================

# Start production environment
prod:
    #!/usr/bin/env bash
    echo "Starting EmailFlare Production"
    echo ""
    echo "Starting containers (Docker will assign a random port)..."
    docker compose --env-file .env -f compose.yaml up --build -d
    sleep 3

    PORT=$(docker compose --env-file .env -f compose.yaml port {{EDGE_SERVICE}} {{EDGE_INTERNAL_PORT}} 2>/dev/null | awk -F: '{print $NF}')

    if [ -z "$PORT" ]; then
        echo "Could not detect production port. Check container status:"
        docker compose --env-file .env -f compose.yaml ps
        exit 1
    fi

    echo ""
    echo "Production started successfully!"
    echo ""
    echo "Direct access:"
    echo "  -> http://localhost:$PORT"
    echo ""
    echo "For a prettier URL, run: just setup-portless-prod"
    echo "Then access via: http://{{PORTLESS_ALIAS}}.localhost:{{PORTLESS_PROXY_PORT}}"
    echo ""

# Start production in background
prod-bg:
    docker compose --env-file .env -f compose.yaml up --build -d

# Stop production services
prod-down:
    docker compose --env-file .env -f compose.yaml down

# View production logs
prod-logs:
    docker compose --env-file .env -f compose.yaml logs -f

# Reset production environment (removes volumes)
prod-reset:
    docker compose --env-file .env -f compose.yaml down -v
    docker compose --env-file .env -f compose.yaml up --build

# ============================================================================
# BUILD RECIPES
# ============================================================================

# Build backend image
build-be:
    docker compose --env-file .env -f compose.yaml build backend

# Build admin image
build-admin:
    docker compose --env-file .env -f compose.yaml build admin

# Build all images
build:
    just build-be
    just build-admin

# ============================================================================
# PORTLESS INTEGRATION (Pretty URLs)
# ============================================================================

# One-time setup for Portless (starts daemon + creates alias)
setup-portless:
    #!/usr/bin/env bash
    PORT=$(docker compose --env-file .env -f compose.yaml -f compose.dev.yaml port {{EDGE_SERVICE}} {{EDGE_INTERNAL_PORT}} 2>/dev/null | awk -F: '{print $NF}')
    if [ -z "$PORT" ]; then
        echo "Edge container not running. Start dev environment first: just dev"
        exit 1
    fi
    echo "Setting up Portless..."
    echo "Detected edge on port: $PORT"
    npx portless proxy start 2>/dev/null || echo "Proxy already running"
    npx portless alias {{PORTLESS_ALIAS}} $PORT
    echo "Portless configured!"
    echo "  -> http://{{PORTLESS_ALIAS}}.localhost:{{PORTLESS_PROXY_PORT}}"
    echo "All requests route through Caddy:"
    echo "  /api/* /v1/* -> backend"
    echo "  /*           -> admin"

# Optional: configure Portless on port 80 (requires sudo) for bare emailflare.localhost
setup-portless-80:
    #!/usr/bin/env bash
    PORT=$(docker compose --env-file .env -f compose.yaml -f compose.dev.yaml port {{EDGE_SERVICE}} {{EDGE_INTERNAL_PORT}} 2>/dev/null | awk -F: '{print $NF}')
    if [ -z "$PORT" ]; then
        echo "Edge container not running. Start dev environment first: just dev"
        exit 1
    fi
    echo "Starting Portless proxy on port 80 (sudo required)..."
    sudo npx portless proxy stop 2>/dev/null || true
    sudo npx portless proxy start -p 80
    npx portless alias {{PORTLESS_ALIAS}} $PORT --force
    echo "Portless configured on :80 -> http://{{PORTLESS_ALIAS}}.localhost"

# Setup Portless for production
setup-portless-prod:
    #!/usr/bin/env bash
    PORT=$(docker compose --env-file .env -f compose.yaml port {{EDGE_SERVICE}} {{EDGE_INTERNAL_PORT}} 2>/dev/null | awk -F: '{print $NF}')
    if [ -z "$PORT" ]; then
        echo "Production container not running. Start prod first: just prod"
        exit 1
    fi
    npx portless proxy start 2>/dev/null || echo "Proxy already running"
    npx portless alias {{PORTLESS_ALIAS}} $PORT
    echo "Production alias set: http://{{PORTLESS_ALIAS}}.localhost:{{PORTLESS_PROXY_PORT}}"

# Remove Portless alias
remove-portless:
    #!/usr/bin/env bash
    npx portless alias --remove {{PORTLESS_ALIAS}} 2>/dev/null || true
    echo "Portless alias removed"

# List all Portless aliases
list-portless:
    npx portless list

# ============================================================================
# SMOKE CHECKS
# ============================================================================

# Quick smoke checks against running dev/prod service
smoke:
    #!/usr/bin/env bash
    set -euo pipefail
    [ -f .env ] || { echo ".env missing"; exit 1; }
    ADMIN_TOKEN=$(grep -E '^ADMIN_TOKEN=' .env | head -n1 | cut -d= -f2-)
    [ -n "$ADMIN_TOKEN" ] || { echo "ADMIN_TOKEN missing in .env"; exit 1; }

    DEV_PORT=$(docker compose --env-file .env -f compose.yaml -f compose.dev.yaml port {{EDGE_SERVICE}} {{EDGE_INTERNAL_PORT}} 2>/dev/null | awk -F: '{print $NF}' || true)
    PROD_PORT=$(docker compose --env-file .env -f compose.yaml port {{EDGE_SERVICE}} {{EDGE_INTERNAL_PORT}} 2>/dev/null | awk -F: '{print $NF}' || true)

    if [ -n "$DEV_PORT" ]; then
        BASE_URL="http://localhost:$DEV_PORT"
    elif [ -n "$PROD_PORT" ]; then
        BASE_URL="http://localhost:$PROD_PORT"
    else
        echo "No running service found. Start with just dev or just prod"
        exit 1
    fi

    echo "Running smoke checks against $BASE_URL"
    code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/health")
    [ "$code" = "200" ] || { echo "/health returned $code"; exit 1; }

    code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/me" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    [ "$code" = "200" ] || { echo "/api/me returned $code"; exit 1; }

    echo "smoke checks passed"

# ============================================================================
# STATUS & UTILITIES
# ============================================================================

# Show current port assignments
show-ports:
    #!/usr/bin/env bash
    echo "Current Port Assignments:"
    echo ""
    if docker ps --format "{{{{.Names}}}}" | grep -q "emailflare-edge"; then
        PORT=$(docker port emailflare-edge {{EDGE_INTERNAL_PORT}} 2>/dev/null | awk -F: '{print $NF}')
        echo "Development (Edge): http://localhost:$PORT"
        if npx portless list 2>/dev/null | grep -q "{{PORTLESS_ALIAS}}"; then
            echo "  -> http://{{PORTLESS_ALIAS}}.localhost:{{PORTLESS_PROXY_PORT}}"
        fi
    else
        echo "Development: (not running)"
    fi

# Show Docker container status
status:
    #!/usr/bin/env bash
    echo "Docker Containers:"
    echo ""
    echo "Development:"
    docker compose --env-file .env -f compose.yaml -f compose.dev.yaml ps 2>/dev/null || echo "  (not running)"
    echo ""
    echo "Production:"
    docker compose --env-file .env -f compose.yaml ps 2>/dev/null || echo "  (not running)"
    echo ""
    just show-ports
    echo ""
    echo "Portless Routes:"
    npx portless list 2>/dev/null || echo "  (none configured)"

# Clean up Docker resources (unused images, volumes, networks)
docker-clean:
    docker system prune -f

# ============================================================================
# UTILITY RECIPES
# ============================================================================

# Database seed
db-seed:
    docker compose --env-file .env -f compose.yaml -f compose.dev.yaml exec backend node -e "import('./dist/seed.js')"

# Show environment info
info:
    #!/usr/bin/env bash
    echo "Environment Information:"
    echo ""
    echo "Node.js:"; node --version
    echo "Docker:"; docker --version
    echo "Docker Compose:"; docker compose version

# Help - show all available commands
help:
    @just --list
