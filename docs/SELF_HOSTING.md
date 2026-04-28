# Self-hosting

EmailFlare is intentionally optimized for minimum infrastructure.

The default self-host deployment uses:

- one application container
- embedded mesahub with SQLite-backed storage
- one mounted volume at `/data`
- Cloudflare Email Sending as the outbound delivery provider

You do not need Postgres, Redis, or a separate database service for the default setup.

## Requirements

- Docker with Compose support
- a Cloudflare account with Email Sending enabled
- a Cloudflare API token with the required email sending permissions

## 1. Create your environment file

```bash
cp .env.example .env.local
```

Set at least:

```text
ADMIN_TOKEN=<openssl rand -hex 32>
SESSION_SECRET=<openssl rand -hex 32>
MESAHUB_URL=mh://local/emailflare
CF_API_TOKEN=<cloudflare token>
CF_ACCOUNT_ID=<cloudflare account id>
```

Notes:

- `MESAHUB_URL=mh://local/emailflare` keeps storage embedded and local to the deployment
- data persists in the Docker volume mounted at `/data`
- keep `ADMIN_TOKEN` and `SESSION_SECRET` at 32+ characters

## 2. Start the production-style stack

```bash
docker compose --env-file .env.local -f compose.yaml up --build -d
```

Or with `just`:

```bash
just prod
```

## 3. Verify the deployment

```bash
curl http://localhost:8090/health
```

Then open:

- app: `http://localhost:8090`
- Mailpit UI: `http://localhost:8090/mailpit/`

## 4. Persist data

The production compose file stores app data in the `app-data` Docker volume.

Back it up with standard Docker volume backup procedures or by snapshotting the host storage where Docker volumes live.

## 5. Updating

If you are running from source:

```bash
git pull
docker compose --env-file .env.local -f compose.yaml up --build -d
```

If you are running from the published image, pull the new tag and redeploy the container with the same mounted `/data` volume.

## Optional: external mesahub

If you want to move storage out of the app container later, replace `MESAHUB_URL` with an external mesahub URL.

The minimum-infra recommendation remains the embedded local setup until you have a reason to split services.