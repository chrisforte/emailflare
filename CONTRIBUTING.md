# Contributing

## Development setup

```bash
cp .env.example .env.local
just dev
```

The default local stack uses Docker and embedded mesahub so contributors do not need to provision extra infrastructure.

## Before opening a pull request

- keep changes focused
- update docs when behavior or setup changes
- build the affected app before submitting
- include screenshots for visible UI changes

Useful commands:

```bash
just dev
just dev-down
just build
cd services/admin && pnpm build
cd services/backend && pnpm build
cd services/landing && pnpm build
```

## Scope

Good contributions include:

- deployment and self-hosting improvements
- admin UX improvements
- email template and API quality improvements
- docs and examples

Open an issue or draft PR first for larger changes that affect architecture or deployment flows.