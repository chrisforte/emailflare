# Railway

EmailFlare is set up for Railway in two ways:

1. Deploy from this repository using the included `railway.json` and root `Dockerfile`
2. Deploy from the published image `ghcr.io/0xdps/emailflare:latest`

The simplest path is the repo-based deploy because Railway will build directly from the repository and use the included healthcheck settings.

## What is already configured

The repo ships with:

- `railway.json` at the repository root
- a production Dockerfile that bundles backend, admin, Mailpit, and embedded mesahub
- a healthcheck on `/health`

## Required variables

Set these in Railway:

- `ADMIN_TOKEN`
- `SESSION_SECRET`
- `MESAHUB_URL`
- `CF_API_TOKEN`
- `CF_ACCOUNT_ID`

For the minimum-infra Railway setup, use:

```text
MESAHUB_URL=mh://local/emailflare
```

Also attach a persistent volume mounted at:

```text
/data
```

That keeps the embedded SQLite-backed data durable across deploys.

## Recommended Railway flow

1. Create a new Railway project from the GitHub repository
2. Let Railway detect the root `railway.json`
3. Add the required environment variables
4. Attach a volume at `/data`
5. Deploy and wait for `/health` to pass

## Using the published image instead

If you prefer image-based deploys on Railway or another platform, use:

```text
ghcr.io/0xdps/emailflare:latest
```

Keep the same environment variables and mount `/data` as a persistent volume.

## Railway template section

This repo is template-ready in structure, but Railway templates are published through Railway's template system rather than only by committing `railway.json`.

The recommended public documentation flow is:

- link users to this repository
- point them to this guide and the root `railway.json`
- publish the repo to Railway Templates later if you want a marketplace entry