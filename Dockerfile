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

# ── Stage: prod (Caddy + Node) ────────────────────────────────────────────────
FROM caddy:2-alpine AS caddy-bin

FROM node:22-alpine AS prod
COPY --from=caddy-bin /usr/bin/caddy /usr/bin/caddy
RUN apk add --no-cache curl
WORKDIR /app

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
