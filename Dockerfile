# ── Stage: build-core ────────────────────────────────────────────────────────
# Builds the mesahub-server Go binary (CGO required — uses sqlite3).
# Override MESAHUB_CORE_VERSION at build time to pin a specific tag or commit:
#   docker build --build-arg MESAHUB_CORE_VERSION=v0.2.0 .
FROM golang:1.24-alpine AS build-core
RUN apk add --no-cache gcc musl-dev sqlite-dev
ARG MESAHUB_CORE_VERSION=latest
RUN CGO_ENABLED=1 go install \
    github.com/0xdps/mesahub-core/cmd/server@${MESAHUB_CORE_VERSION}
RUN cp /go/bin/server /go/bin/mesahub-server

# ── Stage: build-backend ──────────────────────────────────────────────────────
FROM node:22-alpine AS build-backend
WORKDIR /app/backend

RUN npm install -g pnpm

COPY services/backend/package.json services/backend/pnpm-lock.yaml services/backend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY services/backend/ ./
RUN pnpm run build

# ── Stage: build-admin ────────────────────────────────────────────────────────
FROM node:22-alpine AS build-admin
WORKDIR /app/admin

RUN npm install -g pnpm

COPY services/admin/package.json services/admin/pnpm-lock.yaml services/admin/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY services/admin/ ./
RUN pnpm exec vite build

# ── Stage: prod (Caddy + Node + Mailpit) ─────────────────────────────────────
FROM caddy:2-alpine AS caddy-bin

FROM node:22-alpine AS prod
COPY --from=caddy-bin /usr/bin/caddy /usr/bin/caddy
RUN apk add --no-cache curl openssl
WORKDIR /app

# mesahub-server (for embedded mode — skipped if MESAHUB_URL points to external)
COPY --from=build-core /go/bin/mesahub-server /usr/local/bin/mesahub-server
RUN mkdir -p /data
VOLUME ["/data"]

# Install Mailpit binary
ARG TARGETARCH
RUN set -e; \
  MAILPIT_VERSION="v1.21.5"; \
  if [ "$TARGETARCH" = "arm64" ]; then ARCH="arm64"; else ARCH="amd64"; fi; \
  curl -fsSL "https://github.com/axllent/mailpit/releases/download/${MAILPIT_VERSION}/mailpit-linux-${ARCH}.tar.gz" \
    | tar -xz -C /usr/local/bin mailpit; \
  chmod +x /usr/local/bin/mailpit

RUN mkdir -p /usr/share/caddy

# Backend runtime
COPY --from=build-backend /app/backend/node_modules ./backend/node_modules
COPY --from=build-backend /app/backend/dist          ./backend/dist
COPY services/backend/package.json                   ./backend/

# Admin static files
COPY --from=build-admin /app/admin/dist /usr/share/caddy

COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 80
CMD ["/app/start.sh"]
