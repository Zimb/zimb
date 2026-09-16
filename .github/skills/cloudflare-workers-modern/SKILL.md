---
name: cloudflare-workers-modern
description: Use when implementing or debugging api.zimb.app (Cloudflare Worker). Covers Hono v4 router, modern Durable Objects API (RpcTarget + hibernation), Cron Triggers, KV, Workflows, and edge-aware TypeScript patterns. Last updated 2026-09.
---

# Cloudflare Workers — Zimb API

## Stack cible

| Item | Version | Notes |
|---|---|---|
| Runtime | Workers (V8 isolate) | Pas Node.js, mais `nodejs_compat` activé |
| Router | Hono 4.x | `<https://hono.dev>` |
| Secrets | `wrangler secret put` | Jamais en clair dans `wrangler.toml` |
| Cron | `wrangler.toml` `triggers.crons` | Expressions cron standard |
| Durable Objects | Nouvelle API `RpcTarget` | Hibernation activée par défaut en 2024 |
| KV | `wrangler.toml` `kv_namespaces` | Cache + idempotency keys |
| TypeScript | 5.6 strict | `noUncheckedIndexedAccess: true` |

## Doc officielle

- Workers : <https://developers.cloudflare.com/workers/>
- Durable Objects (API moderne) : <https://developers.cloudflare.com/durable-objects/>
- Cron Triggers : <https://developers.cloudflare.com/workers/configuration/cron-triggers/>
- Hono : <https://hono.dev/docs/>
- Wrangler CLI : <https://developers.cloudflare.com/workers/wrangler/>

## Patterns Zimb

### Structure du projet Worker

```
packages/worker/
├── src/
│   ├── index.ts                # Hono app + scheduled handler
│   ├── routes/                 # 1 fichier par resource
│   ├── middleware/             # auth, rateLimit
│   ├── services/               # Business logic (HTTP-free)
│   ├── adapters/               # External API clients
│   ├── durable-objects/        # KanbanSession, OfflineBuffer
│   ├── cron/index.ts           # Dispatcher
│   └── types/{env,ticket}.ts   # Bindings + domain models
├── wrangler.toml               # Bindings + cron
├── dev.vars.example            # Template secrets dev
└── package.json
```

### Hono app pattern (déjà dans `src/index.ts`)

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

export const app = new Hono<{ Bindings: Env }>()
  .use('*', secureHeaders())
  .use('*', cors({ origin: ['https://app.zimb.app', 'https://zimb.app'] }))
  .get('/health', (c) => c.json({ ok: true, ts: Date.now() }))
  // ... routes
  .notFound((c) => c.json({ ok: false, error: { code: 'not_found' } }, 404));

export default app;

export const scheduled: ExportedHandlerScheduledHandler<Env> = async (event, env, ctx) => {
  ctx.waitUntil(runCronJobs(event.cron, env));
};
```

### Durable Object moderne (hibernation)

```typescript
export class KanbanSession extends DurableObject<Env> {
  private sessions = new Map<string, WebSocket>(); // connectionId → ws

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    // Hibernation: restore WebSockets after Worker restart
    state.getWebSockets().forEach((ws) => {
      const id = ws.deserializeAttachment() as string;
      this.sessions.set(id, ws);
    });
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected websocket', { status: 400 });
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const connectionId = crypto.randomUUID();

    server.serializeAttachment(connectionId);
    this.sessions.set(connectionId, server);

    server.accept();
    server.addEventListener('message', (event) => {
      // handle ping/pong, etc.
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  async broadcast(event: { type: string; [k: string]: unknown }) {
    const payload = JSON.stringify(event);
    for (const ws of this.sessions.values()) {
      ws.send(payload);
    }
  }
}
```

### Cron dispatch (1 min / 1 h / 30 min)

```typescript
// wrangler.toml
[triggers]
crons = ["*/1 * * * *", "0 * * * *", "*/30 * * * *"]

// src/cron/index.ts
export async function runCronJobs(cron: string, env: Env) {
  if (cron === '*/1 * * * *') return expireClaims(env);
  if (cron === '0 * * * *') return autoValidate24h(env);
  if (cron === '*/30 * * * *') return slaEscalation(env);
}
```

## Pièges connus

| Piège | Solution |
|---|---|
| `setTimeout`/`setInterval` ne survit pas à un restart | Utiliser Cron Triggers OU `DurableObject.alarm()` |
| Une connexion WebSocket coupée garde le DO en mémoire | Activer `autoResponse` ou `server.serializeAttachment()` pour hibernation |
| `await fetch(...)` côté Worker ne suit pas les redirects par défaut | `fetch(url, { redirect: 'follow' })` |
| Les secrets sont **lisibles uniquement** depuis le code du Worker, pas depuis `wrangler.toml` | Utiliser `wrangler secret put NAME` |
| `nodejs_compat` activé ≠ on a accès à tout Node.js | `node:fs` n'est PAS dispo, `node:crypto` oui. Vérifier la liste : <https://developers.cloudflare.com/workers/runtime/nodejs-reference/> |
| Hono `c.req.json()` peut throw sur body invalide | Toujours wrapper dans try/catch ou utiliser zod pour parser |
| Les erreurs 5xx côté Stripe/GitHub peuvent être temporaires | Implémenter un retry avec backoff exponentiel (max 3 tentatives) |
| `wrangler dev` ne simule pas parfaitement les Cron Triggers | Tester les crons en staging via `wrangler tail` + invocation manuelle |

## Checklist pré-codage

- [ ] La route utilise-t-elle `c.json<T>()` (jamais `return new Response(JSON.stringify(...))`) ?
- [ ] Les secrets sont-ils dans `dev.vars` (jamais hardcodés) ?
- [ ] L'`Env` interface a-t-elle toutes les clés de `wrangler.toml` ?
- [ ] Le code est-il compatible avec l'isolate V8 (pas de `Buffer`, pas de `node:fs`) ?
- [ ] Si WebSocket : utilise-t-on `serializeAttachment` pour hibernation ?
- [ ] Le cron handler est-il idempotent (peut tourner 2× sans dommage) ?
- [ ] Les webhooks vérifient-ils la signature AVANT tout traitement ?

## Deploy

```bash
# Staging
wrangler deploy --env staging

# Production (avec confirmation manuelle)
wrangler deploy --env production
```

CI : voir `.github/workflows/ci.yml` — job `deploy-worker` automatique sur push `main` (avec secrets GitHub).

## Liens internes

- Spec middleware : [../../../SPECIFICATIONS.md](../../../SPECIFICATIONS.md#6-middleware--api-apizimbapp)
- Routes détaillées : [../../../SPECIFICATIONS.md §3.4](../../../SPECIFICATIONS.md)
- Tests E2E : [../../../recettes/](../../../recettes/)
- Agent dédié : `Backend Middleware` (voir `.github/agents/`)
