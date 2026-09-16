# `@zimb/worker` — Cloudflare Worker (api.zimb.app)

> Backend middleware for Zimb.app — orchestrates the VS Code extension, Flutter Web app, Airtable, Stripe Connect, and the GitHub App `@zimb-bot`.

## Stack

- **Runtime**: Cloudflare Workers (V8 isolate)
- **Router**: [Hono](https://hono.dev/) v4
- **Language**: TypeScript strict
- **Tests**: Vitest
- **Linter**: ESLint + TypeScript ESLint
- **Deploy**: Wrangler

## Local development

```bash
# 1. Install dependencies (from monorepo root)
npm install

# 2. Copy secrets template
cp .dev.vars.example .dev.vars
# → fill in Stripe test keys, Airtable PAT, GitHub App private key, etc.

# 3. Start local dev server (binds to http://localhost:8787)
npm run dev -w @zimb/worker
```

## Routes

See [SPECIFICATIONS.md](../../SPECIFICATIONS.md) §3.4 for the full reference.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | none | Health check |
| POST | `/tickets` | client | Create a ticket |
| GET | `/tickets` | any | List tickets (filtered) |
| POST | `/tickets/:id/claim` | senior | Claim a ticket (atomic, CT-LOCK-02) |
| POST | `/tickets/:id/deliver` | senior | Mark as delivered |
| POST | `/tickets/:id/validate` | client | Quick Win ! (capture + transfer) |
| POST | `/tickets/:id/dispute` | client | Open a dispute |
| POST | `/tickets/:id/review` | reviewer | Reviewer verdict |
| GET | `/me/tickets` | any | Current user's tickets |
| GET | `/track/:ticketId` | none | Public client tracking |
| POST | `/webhooks/stripe` | Stripe sig | Stripe webhook receiver |
| POST | `/webhooks/github` | GH sig | GitHub webhook receiver |

## Cron jobs

Configured in `wrangler.toml` via `[triggers]`. See `src/cron/index.ts`.

| Frequency | Job | Reference |
|---|---|---|
| Every 1 min | `expire-claims` | CT-LOCK-03 |
| Every 1 hour | `auto-validate` | CT-PAY-03 |
| Every 30 min | `sla-escalation` | CT-SLA-01/02/03 |

## Testing

```bash
npm test -w @zimb/worker
npm run test:watch -w @zimb/worker
```

## Deploy

```bash
# Staging
npm run deploy:staging -w @zimb/worker

# Production (requires manual approval)
npm run deploy:production -w @zimb/worker
```

## Project structure

```
src/
├── index.ts               # Hono app + cron handler
├── routes/
│   ├── tickets.ts         # CRUD tickets
│   ├── claims.ts          # Atomic claim with timestamp race
│   ├── webhooks.ts        # Stripe + GitHub receivers
│   ├── me.ts              # Current user endpoints
│   └── track.ts           # Public client tracking
├── middleware/
│   ├── auth.ts            # JWT verification + RBAC
│   └── rateLimit.ts       # KV-based rate limiting
├── services/              # Business logic (HTTP-free)
├── adapters/              # External API clients (delegate to specialized agents)
├── durable-objects/
│   ├── KanbanSession.ts   # WebSocket broadcast hub
│   └── OfflineBuffer.ts   # 30-min event replay for reconnect
├── cron/
│   └── index.ts           # Cron job dispatcher
└── types/
    ├── env.ts             # Cloudflare bindings
    └── ticket.ts          # Domain models
```
