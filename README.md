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
- `Dockerfile`: production image that bundles backend, admin, and embedded mesahub
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

Deploy EmailFlare to Railway in one click:

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/emailflare)

The template pre-configures secrets, embedded storage, and a persistent `/data` volume. You only need to supply `CF_API_TOKEN` and `CF_ACCOUNT_ID`.

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