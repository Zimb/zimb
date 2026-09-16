# `@zimb/worker` — Cloudflare Worker (api.zimb.app)

> Backend middleware for Zimb.app — orchestrates the VS Code extension, Flutter Web app, Airtable, Stripe Connect, and the GitHub App `@zimb-bot`.

## Current status: M2 ✅

Implemented routes:
- ✅ `POST /tickets` (M1) — create a ticket, persists to Airtable
- ✅ `GET /tickets` — list tickets (filterable by status)
- ✅ `GET /tickets/:id` — ticket detail
- ✅ `POST /tickets/:id/claim` (M2) — atomic claim with concurrency guard
- ✅ `*/1 * * * *` cron (M2) — expire stale claims and reset tickets

Stubbed routes (returning 501 Not Implemented):
- ⏳ `POST /tickets/:id/deliver` (M3)
- ⏳ `POST /tickets/:id/validate` (M4 — Stripe)
- ⏳ `POST /tickets/:id/dispute` (M5)

## Stack

- **Runtime**: Cloudflare Workers (V8 isolate, `nodejs_compat`)
- **Router**: Hono v4
- **Language**: TypeScript strict (no implicit any, no unchecked indexed access)
- **Validation**: Zod
- **Tests**: Vitest
- **Linter**: ESLint + TypeScript ESLint
- **Deploy**: Wrangler

## Local development

```bash
# 1. Install dependencies (from monorepo root)
npm install

# 2. Copy secrets template
cp .dev.vars.example .dev.vars
# → fill in AIRTABLE_API_KEY + AIRTABLE_BASE_ID (mandatory for M1+M2)
# → STRIPE_*, GITHUB_*, JWT_SECRET, RESEND_* can stay empty for M1+M2

# 3. Start local dev server (binds to http://localhost:8787)
npm run dev -w @zimb/worker
```

## Quick smoke test (M2)

With the dev server running and an empty Airtable base:

```bash
# Health check
curl http://localhost:8787/health

# Create a ticket (no Stripe, no auth middleware active yet)
curl -X POST http://localhost:8787/tickets \
  -H "Content-Type: application/json" \
  -H "X-Zimb-Client: web" \
  -d '{
    "title": "CORS error on /users endpoint",
    "description": "GET /users returns CORS preflight error blocking the request",
    "bounty": 5000,
    "urgency": "high",
    "languages": ["TypeScript"],
    "repoUrl": "https://github.com/my-org/my-repo",
    "channel": "web"
  }'
# → 201 Created, body: { ok: true, data: { id: "T-0001", status: "open", ... } }

# List open tickets
curl http://localhost:8787/tickets?status=open

# Claim it
curl -X POST http://localhost:8787/tickets/T-0001/claim
# → 200 OK, body: { ok: true, data: { ticket: { status: "claimed", ... }, claim: { expiresAt: "..." }, timerSeconds: 2700 } }

# Try to claim again (same senior) → 409 already_claimed_by_you
# Try from another senior → 409 already_claimed

# Wait 45 min (or manually set expires_at in Airtable) → cron resets ticket to open
```

## Routes implemented (M1+M2)

### `POST /tickets`

Creates a new ticket. Body validated with Zod (see `src/services/ticketValidation.ts`).

- `Idempotency-Key` header → safe to retry on network failure (CT-INT-01)
- Validates: title (5-200 chars), description (20-5000), bounty (1000-50000 cents), urgency, languages (1-8), GitHub repoUrl, channel
- Returns 400 with detailed validation errors if payload invalid
- Returns 201 with the created ticket

### `POST /tickets/:id/claim`

Atomically claims a ticket for the authenticated senior. Concurrency-safe.

- Returns `404` if ticket not found
- Returns `409 already_claimed` if another senior holds it (CT-LOCK-02)
- Returns `409 already_claimed_by_you` if same senior tries to claim again (CT-LOCK-05)
- Returns `409 invalid_state` if ticket is not in `open` status
- On success: ticket → `claimed`, claim created, returns 200 with `timerSeconds: 2700`

### `GET /tickets` and `GET /tickets/:id`

- List: `?status=open&limit=50` (default status: `open`, max limit: 100)
- Detail: returns full ticket object

## Cron jobs

| Frequency | Job | Status |
|---|---|---|
| `*/1 * * * *` (every 1 min) | `expire-claims` | ✅ M2 |
| `0 * * * *` (every 1 hour) | `auto-validate` | ⏳ M4 |
| `*/30 * * * *` (every 30 min) | `sla-escalation` | ⏳ M5 |

## Tests

```bash
# Run all tests
npm test -w @zimb/worker

# Watch mode
npm run test:watch -w @zimb/worker

# Coverage
npm test -w @zimb/worker -- --coverage
```

Current test coverage:
- `src/services/ticketValidation.test.ts` — schema validation (24 tests)
- `src/cron/index.test.ts` — cron dispatcher (6 tests)

## Deploy

```bash
# Staging (auto-deploys on push to main)
npm run deploy:staging -w @zimb/worker

# Production (requires manual approval)
npm run deploy:production -w @zimb/worker
```

## Project structure

```
src/
├── index.ts                          # Hono app + cron handler (M0)
├── types/{env,ticket}.ts             # Bindings + domain models
├── adapters/
│   └── airtable.ts                   # Typed Airtable wrapper (M2)
├── services/
│   ├── ticketValidation.ts           # Zod schemas + helpers (M1)
│   └── ticketValidation.test.ts      # 24 unit tests
├── routes/
│   ├── tickets.ts                    # POST /tickets, GET /tickets, GET /:id (M1)
│   ├── claims.ts                     # POST /tickets/:id/claim (M2)
│   ├── webhooks.ts                   # Stub — M4 (Stripe) + M3 (GitHub)
│   ├── me.ts                         # Stub — M3
│   └── track.ts                      # Stub — M3
├── middleware/
│   ├── auth.ts                       # Stub (pass-through) — M3
│   └── rateLimit.ts                  # Stub (pass-through) — M3
├── durable-objects/
│   ├── KanbanSession.ts              # Stub — M3 (WebSocket broadcast)
│   └── OfflineBuffer.ts              # Stub — M3 (30-min replay)
└── cron/
    ├── index.ts                      # expire-claims (M2)
    └── index.test.ts                 # 6 unit tests
```

## What's NOT in M1+M2 (and when it arrives)

| Feature | Milestone | Notes |
|---|---|---|
| Stripe pre-auth | M4 | Requires real Stripe Connect test accounts |
| GitHub repo creation | M3 | Requires GitHub App setup |
| WebSocket broadcast | M3 | Durable Object + hibernation |
| JWT auth middleware | M3 | Currently stub (pass-through) |
| Rate limiting | M3 | Currently stub |
| Dispute flow | M5 | SLA 48h escalation |

## Next milestone: M3

Target: `POST /tickets/:id/deliver`, GitHub repo creation + invite, JWT auth, WebSocket broadcast, Flutter UI receives real data.
