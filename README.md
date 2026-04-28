# EmailFlare

EmailFlare is a minimal self-hosted email sending platform built around Cloudflare Email Sending, a small admin UI, and SQLite-backed storage with the lowest practical infrastructure footprint.

Storage is powered by mesahub core, which acts as the embedded storage engine in the minimum-infra setup:

- https://github.com/0xdps/mesahub-core

It is designed for teams that want:

- a simple email API
- a small admin dashboard for domains, templates, keys, and logs
- one-container deployment for platforms like Railway
- self-hosting with Docker and embedded SQLite storage instead of a separate database service

## What ships in this repo

- `services/backend`: Hono API for admin, keys, templates, stats, and email send operations
- `services/admin`: React admin app
- `Dockerfile`: production image that bundles backend, admin, embedded mesahub, and Mailpit
- `compose.yaml`: single-container self-host / production-style setup
- `compose.dev.yaml`: local development stack with hot reload
- `railway.json`: Railway service config for repo-based deploys

## Quick start

### Run locally with Docker

```bash
cp .env.example .env.local
# fill in Cloudflare token/account values

just prod
```

Open `http://localhost:8090`.

### Published Docker image

GitHub Actions publishes the production image to:

```text
ghcr.io/0xdps/emailflare:latest
```

Version tags are also published for tagged releases.

## Self-hosting

The default self-host path keeps infrastructure intentionally small:

- SQLite storage through embedded mesahub powered by mesahub core
- no separate Postgres or Redis service
- one Docker image for the app stack
- one persistent volume mounted at `/data`

Read the full guide in [docs/SELF_HOSTING.md](./docs/SELF_HOSTING.md).

## Railway

This repo includes a root `railway.json` and can be deployed either:

- directly from the GitHub repository with Railway reading the included Dockerfile and config
- from the published GHCR image on platforms that prefer image-based deploys

Read the Railway guide in [docs/RAILWAY.md](./docs/RAILWAY.md).

## Open source

- License: [MIT](./LICENSE)
- Contributing guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Security policy: [SECURITY.md](./SECURITY.md)

## Minimum required environment

Required runtime variables are documented in `.env.example`. The key ones are:

- `ADMIN_TOKEN`
- `SESSION_SECRET`
- `MESAHUB_URL`
- `CF_API_TOKEN`
- `CF_ACCOUNT_ID`

For the minimum-infra path, keep:

```text
MESAHUB_URL=mh://local/emailflare
```

That enables embedded SQLite-backed storage inside the app deployment.

Under the hood, the embedded storage path uses mesahub core:

- https://github.com/0xdps/mesahub-core