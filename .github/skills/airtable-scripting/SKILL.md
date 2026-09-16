---
name: airtable-scripting
description: Use when interacting with Airtable as the source of truth for Zimb: schema design (Tickets, Claims, Users, Ledger), REST + Metadata API patterns, scripting automation runtime, or pagination/retry on 429. Last updated 2026-09.
---

# Airtable — Zimb source de vérité

## Stack cible

| Item | Valeur |
|---|---|
| Plan | Team (supports scripting) ou Business |
| Base ID | env.AIRTABLE_BASE_ID (`appXXXXXXXX`) |
| API key | PAT (Personal Access Token) avec scopes `data.records:read/write` + `schema.bases:read` |
| SDK Node | `airtable` ≥ 0.12.x |
| Tables | `Tickets`, `Claims`, `Users`, `Ledger`, `Audit_Log`, `SLA_Breaches` |
| Concurrency | Header `If-Match` (record revision) sur les writes |

## Doc officielle

- REST API : <https://airtable.com/developers/web/api/introduction>
- Metadata API : <https://airtable.com/developers/web/api/introduction>
- Scripting : <https://airtable.com/developers/scripting/api>
- Rate limits : <https://airtable.com/developers/web/api/rate-limits>
- Webhooks : <https://airtable.com/developers/web/api/webhooks-overview>

## Patterns Zimb

### Schéma de la base

| Table | Champs clés | Usage |
|---|---|---|
| `Tickets` | `id`, `status`, `bounty`, `urgency`, `languages`, `repo_url`, `claimed_by`, `delivered_at`, `validated_at`, `dispute_opened_at`, `sla_dispute_deadline`, `stripe_payment_intent_id`, `channel` | Source de vérité ticket |
| `Claims` | `ticket_id` (link), `senior_id` (link), `claimed_at`, `expires_at`, `status` | Lock & Timer |
| `Users` | `gh_login`, `gh_id`, `email`, `role`, `stripe_account_id`, `rating` | Comptes (client/senior/reviewer) |
| `Ledger` | `type`, `amount_cents`, `ticket_id`, `from`, `to`, `created_at` | Audit financier |
| `Audit_Log` | `event`, `ticket_id`, `actor`, `correlation_id`, `timestamp` | Traçabilité (rétention 24 mois) |
| `SLA_Breaches` | `ticket_id`, `detected_at`, `default_verdict` | Suivi des breaches |

### Client Node avec retry + pagination

```typescript
import Airtable from 'airtable';

const base = new Airtable({ apiKey: env.AIRTABLE_API_KEY }).base(env.AIRTABLE_BASE_ID);

// List avec retry sur 429
export async function listTickets(filterByFormula: string) {
  const all: Ticket[] = [];
  return new Promise((resolve, reject) => {
    base('Tickets')
      .select({
        filterByFormula,
        maxRecords: 100,
        pageSize: 50,
      })
      .eachPage(
        async (records, fetchNextPage) => {
          for (const r of records) all.push(r._rawJson as unknown as Ticket);
          fetchNextPage();
        },
        (err) => (err ? reject(err) : resolve(all))
      );
  });
}
```

### Write atomique avec If-Match (CT-LOCK-06)

```typescript
export async function updateTicketWithRevision(
  ticketRecordId: string,
  expectedRevision: string,
  fields: Partial<Ticket>
) {
  const res = await fetch(
    `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/Tickets/${ticketRecordId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
        'If-Match': expectedRevision, // ← concurrence-safe
      },
      body: JSON.stringify({ fields }),
    }
  );
  if (res.status === 412) throw new Error('Precondition failed — record was modified');
  if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
  return res.json();
}
```

### Scripting automation (pour cron côté Airtable)

```javascript
// Airtable Scripting console (dans une Automation)
// ⚠️ NE PAS utiliser pour le hot path (latence + rate limits)
// Utiliser plutôt le Worker Cloudflare pour les opérations critiques

const tickets = base.getTable('Tickets');
const query = await tickets.selectRecordsAsync({
  fields: ['id', 'status', 'delivered_at'],
  filter: `{status} = 'delivered'`,
});

const now = new Date();
for (const record of query.records) {
  const delivered = new Date(record.getCellValue('delivered_at'));
  const ageHours = (now - delivered) / 1000 / 60 / 60;
  if (ageHours > 24) {
    await tickets.updateRecordAsync(record, { status: 'auto_validated' });
    // Notifier le Worker via webhook pour capture Stripe
  }
}
```

### Webhook entrant (signature Airtable)

```typescript
// Airtable envoie un POST quand un record change
// Vérifier le header X-Airtable-Content-MAC
import crypto from 'node:crypto';

export async function verifyAirtableWebhook(request: Request, secret: string) {
  const signature = request.headers.get('X-Airtable-Content-MAC');
  const body = await request.text();
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature ?? ''), Buffer.from(expected));
}
```

## Pièges connus

| Piège | Solution |
|---|---|
| 5 req/sec par base | Implémenter un rate-limiter côté Worker (token bucket) |
| `filterByFormula` ne supporte pas `OR` imbriqué | Utiliser `AND(...)` + `NOT(...)`, ou plusieurs queries |
| Les linked records sont des IDs, pas des objets imbriqués | `table.select({ fields: ['claimed_by'] })` retourne un tableau d'IDs |
| `revision` change à chaque write | Stocker la dernière révision dans le record pour le `If-Match` suivant |
| Pagination via `offset` peut sauter des records créés en parallèle | Utiliser `eachPage` + snapshots Airtable si cohérence stricte |
| Scripting runtime = 30 sec max par automation | Pour les batches > 100 records, passer par le Worker |
| Airtable Formula = pas de variables, pas de boucles | Pré-calculer les valeurs côté Worker, écrire le résultat |
| Le PAT doit avoir `data.records:write` sur la base **spécifique**, pas tout le workspace | Vérifier les scopes avant le deploy |

## Checklist pré-codage

- [ ] Le PAT a-t-il les scopes minimaux nécessaires (pas plus) ?
- [ ] Les writes critiques utilisent-ils `If-Match` (pas d'écrasement silencieux) ?
- [ ] Le rate-limiter côté Worker respecte-t-il 5 req/s/base ?
- [ ] Les queries paginées utilisent-elles `eachPage` (pas un offset manuel) ?
- [ ] Les scripts Airtable sont-ils < 30 sec (sinon → Worker) ?
- [ ] Les webhooks Airtable vérifient-ils le HMAC ?

## Liens internes

- Schéma complet : [../../../SPECIFICATIONS.md §A](../../../SPECIFICATIONS.md)
- Tests E2E : [../../../recettes/](../../../recettes/) (tous utilisent Airtable)
- Variables d'env : [../../../packages/worker/dev.vars.example](../../../packages/worker/dev.vars.example)
