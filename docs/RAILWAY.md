# Railway

EmailFlare is set up for Railway in two ways:

1. Deploy from this repository using the included `railway.json` and root `Dockerfile`
2. Deploy from the published image `ghcr.io/0xdps/emailflare:latest`

The simplest path is the repo-based deploy because Railway will build directly from the repository and use the included healthcheck settings.

## What is already configured

The repo ships with:

- `railway.json` at the repository root
- a production Dockerfile that bundles backend, admin, and embedded mesahub
- a healthcheck on `/health`

## Required variables

Set these in Railway:

- `ADMIN_TOKEN`
- `SESSION_SECRET`
- `MESAHUB_URL`
- `CF_API_TOKEN` *(required for production sending; not needed if using test API keys only)*
- `CF_ACCOUNT_ID` *(required for production sending; not needed if using test API keys only)*

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

---

## Testing emails on Railway without Cloudflare credentials

EmailFlare has built-in test mode: **test API keys** route all sends through SMTP instead of the Cloudflare Email Sending API.

To test on Railway without real email delivery:

1. Add a [Mailpit](https://mailpit.axllent.org) service to your Railway project (or use [Mailtrap](https://mailtrap.io) or any SMTP catcher)
2. Set these env vars on the EmailFlare service:
   ```text
   SMTP_HOST=<mailpit service hostname or external host>
   SMTP_PORT=1025
   ```
3. Create a **test** API key from the admin UI (Keys page)
4. Send using that key — emails are intercepted by Mailpit / your SMTP catcher, never delivered to real recipients

`CF_API_TOKEN` and `CF_ACCOUNT_ID` are not required when using test API keys only.

## Railway template section

This repo is template-ready in structure, but Railway templates are published through Railway's template system rather than only by committing `railway.json`.

The recommended public documentation flow is:

- link users to this repository
- point them to this guide and the root `railway.json`
- publish the repo to Railway Templates later if you want a marketplace entry