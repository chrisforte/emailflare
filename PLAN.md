# EmailFlair — Implementation Plan

## Overview

EmailFlair is a minimal self-hosted email sending platform backed exclusively by the Cloudflare Email Sending API. No AWS SES, no SMTP, no message queues — just a clean HTTP API and a simple admin UI.

---

## Architecture

```
┌──────────────────────────────────────────┐
│  Edge (Caddy)                            │
│  /api/*  /v1/*  →  backend:3000          │
│  /*              →  admin:80 (or :5173)  │
└──────────────────────────────────────────┘
         │                     │
    ┌────▼──────┐         ┌────▼──────┐
    │  Backend  │         │  Admin    │
    │  Hono     │         │  React +  │
    │  Node.js  │         │  Vite     │
    └────┬──────┘         └───────────┘
         │
    ┌────▼─────────────────────┐
    │  Data: sqlite-hub/client │
    │  (mesahub.app remote     │
    │   SQLite — zero ops)     │
    └──────────────────────────┘
         │
    ┌────▼─────────────────┐
    │  Cloudflare Email    │
    │  Sending API         │
    └──────────────────────┘
```

## Stack

| Layer        | Technology                                      |
|--------------|-------------------------------------------------|
| API server   | [Hono](https://hono.dev) + `@hono/node-server` |
| Validation   | `zod` + `@hono/zod-validator`                  |
| Auth (admin) | `jose` — HS256 JWT, 7-day expiry               |
| Auth (API)   | SHA-256 hashed keys, `emailflair_` prefix      |
| Data         | `@sqlite-hub/client` → mesahub.app             |
| Email send   | Cloudflare Email Sending API                   |
| Email render | `@react-email/render` + React                  |
| IDs          | `nanoid`                                       |
| Admin UI     | React 19 + Vite + Tailwind CSS + TanStack Router |
| Edge proxy   | Caddy 2-alpine                                 |
| Containers   | Docker Compose (prod + dev)                    |

---

## Database Schema (SQLite via sqlite-hub)

All tables are bootstrapped at startup via `CREATE TABLE IF NOT EXISTS` — no migration framework needed.

### `domains`
| column              | type    | notes                         |
|---------------------|---------|-------------------------------|
| id                  | TEXT PK | nanoid                        |
| name                | TEXT    | e.g. `mail.example.com`       |
| cf_zone_id          | TEXT    | Cloudflare Zone ID            |
| cf_subdomain_id     | TEXT    | CF sending subdomain tag/ID   |
| dkim_selector       | TEXT    | from CF after provisioning    |
| return_path_domain  | TEXT    | from CF after provisioning    |
| verified            | INTEGER | 0/1                           |
| created_at          | TEXT    | ISO 8601                      |

### `templates`
| column    | type    | notes                                |
|-----------|---------|--------------------------------------|
| id        | TEXT PK |                                      |
| name      | TEXT    |                                      |
| subject   | TEXT    | supports `{{var}}` interpolation     |
| html_body | TEXT    | supports `{{var}}` interpolation     |
| text_body | TEXT    | optional plain-text version          |
| layout    | TEXT    | optional named layout                |
| domain_id | TEXT FK | optional domain scope                |
| created_at| TEXT    |                                      |
| updated_at| TEXT    |                                      |

### `api_keys`
| column     | type    | notes                               |
|------------|---------|-------------------------------------|
| id         | TEXT PK |                                     |
| name       | TEXT    |                                     |
| key_hash   | TEXT    | SHA-256 of raw key — never returned |
| key_prefix | TEXT    | first 18 chars for display          |
| scope      | TEXT    | `global` / `domain` / `multi`       |
| active     | INTEGER | 0/1                                 |
| created_at | TEXT    |                                     |

### `api_key_domains`
| column     | type    | notes                        |
|------------|---------|------------------------------|
| api_key_id | TEXT FK |                              |
| domain_id  | TEXT FK |                              |
| PRIMARY KEY | (api_key_id, domain_id) |            |

### `email_logs`
| column        | type    | notes                |
|---------------|---------|----------------------|
| id            | TEXT PK |                      |
| to_address    | TEXT    |                      |
| from_address  | TEXT    |                      |
| subject       | TEXT    |                      |
| status        | TEXT    | `sent` / `failed`    |
| cf_message_id | TEXT    | from CF response     |
| domain_id     | TEXT FK | optional             |
| template_id   | TEXT FK | optional             |
| api_key_id    | TEXT FK |                      |
| error         | TEXT    | null on success      |
| sent_at       | TEXT    | ISO 8601             |

### `admin_users`
| column        | type    | notes                     |
|---------------|---------|---------------------------|
| id            | TEXT PK |                           |
| email         | TEXT    | UNIQUE                    |
| password_hash | TEXT    | SHA-256                   |
| created_at    | TEXT    |                           |

---

## API Reference

### Public endpoints (no auth)
| Method | Path            | Description              |
|--------|-----------------|--------------------------|
| GET    | `/health`       | Health check             |
| POST   | `/auth/login`   | Admin login → JWT        |

### API key endpoints (`Authorization: Bearer emailflair_<key>`)
| Method | Path       | Description              |
|--------|------------|--------------------------|
| POST   | `/v1/send` | Send an email            |

### Admin endpoints (JWT required)
| Method | Path                        | Description              |
|--------|-----------------------------|--------------------------|
| GET    | `/api/auth/me`              | Current admin            |
| GET    | `/api/domains`              | List domains             |
| POST   | `/api/domains`              | Add domain (creates CF subdomain) |
| GET    | `/api/domains/:id`          | Get domain               |
| GET    | `/api/domains/:id/dns`      | Fetch CF DNS records     |
| POST   | `/api/domains/:id/verify`   | Re-check CF status       |
| DELETE | `/api/domains/:id`          | Delete domain            |
| GET    | `/api/templates`            | List templates           |
| POST   | `/api/templates`            | Create template          |
| GET    | `/api/templates/:id`        | Get template             |
| PUT    | `/api/templates/:id`        | Update template          |
| DELETE | `/api/templates/:id`        | Delete template          |
| GET    | `/api/keys`                 | List API keys            |
| POST   | `/api/keys`                 | Create API key (returns plaintext ONCE) |
| DELETE | `/api/keys/:id`             | Revoke API key           |
| GET    | `/api/logs`                 | Paginated email logs     |
| GET    | `/api/stats`                | Platform statistics      |

---

## Send payload (`POST /v1/send`)

```json
{
  "from": "hello@mail.example.com",
  "to": ["user@example.com"],
  "subject": "Hello!",
  "html": "<p>Hello {{name}}</p>",
  "templateId": "optional-template-id",
  "variables": { "name": "Alice" },
  "replyTo": "support@example.com"
}
```

- `templateId` takes precedence; `subject` from body overrides template subject if provided
- `{{var}}` in `html_body`, `text_body`, and `subject` are replaced with `variables`
- Domain-scoped keys are validated against the sender domain
- Each recipient is a separate CF API call; partial failures are returned per-recipient

---

## Environment Variables

See `.env.example` for full reference. Required at runtime:

| Variable             | Description                              |
|----------------------|------------------------------------------|
| `ADMIN_EMAIL`        | Seeded admin email                       |
| `ADMIN_PASSWORD`     | Seeded admin password                    |
| `JWT_SECRET`         | Random secret, min 32 chars             |
| `SQLITE_HUB_API_KEY` | sqlite-hub / mesahub.app API key        |
| `CF_API_TOKEN`       | Cloudflare API token (Email Sending)     |
| `CF_ACCOUNT_ID`      | Cloudflare account ID                    |

---

## Getting started

```bash
cp .env.example .env
# fill in .env values

just up        # start dev stack (hot-reload)
just health    # verify backend is up
just db-seed   # seed admin user
```

Admin UI: http://localhost:8090  
API: http://localhost:8090/api  
Send: `POST http://localhost:8090/v1/send`

---

## Project structure

```
emailflare/
├── services/
│   ├── backend/               # Hono API
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts       # app entrypoint
│   │       ├── env.ts         # env validation
│   │       ├── db.ts          # sqlite-hub + schema bootstrap
│   │       ├── seed.ts        # admin user seeding
│   │       ├── middleware/
│   │       │   ├── auth.ts    # JWT middleware
│   │       │   └── apiKey.ts  # API key middleware
│   │       ├── routes/
│   │       │   ├── auth.ts
│   │       │   ├── domains.ts
│   │       │   ├── templates.ts
│   │       │   ├── keys.ts
│   │       │   ├── logs.ts
│   │       │   ├── stats.ts
│   │       │   └── send.ts
│   │       ├── services/
│   │       │   └── cloudflare.ts
│   │       └── emails/
│   │           ├── render.ts
│   │           └── layouts/
│   │               ├── Welcome.tsx
│   │               ├── MagicLink.tsx
│   │               ├── Notification.tsx
│   │               └── OTP.tsx
│   └── admin/                 # React + Vite SPA
│       ├── Dockerfile
│       ├── package.json
│       ├── vite.config.ts
│       └── src/
│           ├── main.tsx
│           ├── api.ts         # axios + token handling
│           ├── components/
│           │   └── Layout.tsx
│           ├── lib/
│           │   └── utils.ts
│           ├── pages/
│           │   ├── Login.tsx
│           │   ├── Dashboard.tsx
│           │   ├── Domains.tsx
│           │   ├── Templates.tsx
│           │   ├── Keys.tsx
│           │   └── Logs.tsx
│           └── routes/        # TanStack Router file-based
│               ├── __root.tsx
│               ├── index.tsx
│               ├── login.tsx
│               ├── domains.tsx
│               ├── templates.tsx
│               ├── keys.tsx
│               └── logs.tsx
├── infra/
│   ├── Caddyfile              # prod proxy
│   └── Caddyfile.dev          # dev proxy (Vite)
├── compose.yaml               # production
├── compose.dev.yaml           # development (bind mounts)
├── justfile                   # dev commands
├── stacklane.yaml             # deployment descriptor
└── .env.example
```
