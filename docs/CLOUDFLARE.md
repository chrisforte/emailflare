# Cloudflare Workers Deployment

EmailFlare can be deployed as a Cloudflare Worker — no Docker, no servers. The Worker bundles the API and admin panel into a single edge deployment backed by D1 (SQLite) and KV.

## What gets deployed

| Resource | Purpose |
|---|---|
| **Worker** | Hono API + React admin SPA (static assets) |
| **D1 database** | Domains, templates, API keys, email logs |
| **KV namespace** | Rate limiting |
| **Worker Secrets** | Admin token, session secret, CF credentials |

## Requirements

- [Node.js](https://nodejs.org) 18+
- [pnpm](https://pnpm.io) 8+
- [just](https://github.com/casey/just) (task runner)
- A Cloudflare account

## 1. Install dependencies

```bash
just install
```

This installs `smol-toml` for the setup script, and all worker and admin dependencies.

## 2. Authenticate with Cloudflare

```bash
just worker-login
```

Opens a browser to complete the OAuth flow. Alternatively, set `CLOUDFLARE_API_TOKEN` in `scripts/config.toml` (see step 3).

## 3. Configure

```bash
cp scripts/config.example.toml scripts/config.toml
```

Edit `scripts/config.toml`:

```toml
[deploy]
# API token used by wrangler to create resources and deploy.
# Permissions needed: Workers Scripts (Edit), D1 (Edit), KV Storage (Edit),
#                     Workers Routes (Edit), Account Settings (Read)
cloudflare_api_token = "your-deploy-token"

# Leave blank — auto-detected from your account. Set if you have multiple accounts.
account_id = ""

# D1 database name. "emailflare" is the default.
database_name = "emailflare"

[secrets]
# Admin dashboard password (32+ chars recommended)
admin_token = "change-me"

# JWT signing secret (32+ chars). Generate: openssl rand -hex 32
session_secret = "change-me"

# Runtime Cloudflare token for sending email.
# Permissions: Email Routing (Edit), Zone (Read), DNS (Edit)
cf_api_token = "your-runtime-token"

# Your Cloudflare account ID
cf_account_id = "your-account-id"

# Leave blank on first run — fill in after deploy with the worker URL.
# e.g. https://emailflare-worker.YOUR-ACCOUNT.workers.dev
admin_origin = ""
```

`scripts/config.toml` is gitignored — your secrets stay local.

## 4. Run setup

```bash
just worker-setup
```

This single command:

1. Verifies Cloudflare authentication
2. Creates the D1 database (`emailflare`)
3. Creates the KV namespace (`emailflare-rate-limit`)
4. Patches `wrangler.jsonc` with the real resource IDs
5. Applies database migrations (schema + system email templates)
6. Sets all Worker secrets
7. Builds the admin panel
8. Deploys the Worker

The setup is idempotent — safe to re-run if anything fails.

## 5. Set ADMIN_ORIGIN (second run)

After the first deploy, the worker URL is printed in the output:

```
https://emailflare-worker.YOUR-ACCOUNT.workers.dev
```

Set `admin_origin` in `scripts/config.toml` to that URL, then re-run:

```bash
just worker-setup
```

This updates the `ADMIN_ORIGIN` secret so the admin panel's CORS and auth checks work correctly.

## Deploying updates

```bash
just worker-update
```

Applies any pending D1 migrations then redeploys the Worker atomically.

## Gradual rollout

To roll out a new version to a percentage of traffic:

```bash
# Upload a new version (applies migrations, does not shift traffic)
cd services/worker && pnpm run cf:rollout

# Send 10% of traffic to the new version
npx wrangler versions deploy --version-percentage <VERSION_ID>=10

# Full cutover when satisfied
npx wrangler versions deploy --version-percentage <VERSION_ID>=100
```

## Updating secrets

```bash
cd services/worker
echo "new-value" | npx wrangler secret put SECRET_NAME
```

## Local development

```bash
just worker-dev
```

Starts a local Worker dev server with a local D1 database and KV stubs. No secrets are required for local development.

## API token permissions reference

| Token | Required permissions |
|---|---|
| Deploy token (`deploy.cloudflare_api_token`) | Workers Scripts: Edit, D1: Edit, KV Storage: Edit, Workers Routes: Edit, Account Settings: Read |
| Runtime token (`secrets.cf_api_token`) | Email Routing: Edit, Zone: Read, DNS: Edit |

Create tokens at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens).
