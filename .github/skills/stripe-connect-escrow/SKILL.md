---
name: stripe-connect-escrow
description: Use when implementing Stripe Connect Express onboarding, the 7-day pre-auth escrow (capture_method manual), Quick Win capture+transfer with 20 percent application_fee, auto-validate 24h payout, dispute refunds, or any EUR-only payment flow at api.zimb.app. Last updated 2026-09.
---

# Stripe Connect — Zimb Escrow

## Stack cible

| Item | Valeur |
|---|---|
| Stripe account type | **Express** (pas Standard, pas Custom) |
| API version | `2024-XX` (celle de ton compte — vérifier Dashboard) |
| SDK | `stripe` npm ≥ 17.x |
| Currency | EUR uniquement en V1 |
| Commission | 20 % Zimb / 80 % senior |
| Idempotency | Header `Idempotency-Key` sur tous les POST |
| Escrow | `capture_method: 'manual'` → pré-auth 7 jours max |
| SLA dispute | **≤ 48 h** (contrainte Stripe 7 jours) |

## Doc officielle

- Stripe Connect Express : <https://stripe.com/docs/connect/express-accounts>
- `capture_method: manual` : <https://stripe.com/docs/payments/place-a-hold-on-a-payment-method>
- `transfers` + `application_fee_amount` : <https://stripe.com/docs/connect/destination-charges>
- Webhooks signature : <https://stripe.com/docs/webhooks/signatures>
- Disputes : <https://stripe.com/docs/disputes>
- Test cards : <https://stripe.com/docs/testing>

## Patterns Zimb

### Schéma du money flow

```
Client carte (pré-auth 50 €)
       │
       │ capture_method: manual, status: requires_capture
       ▼
Stripe balance (held, Zimb platform)
       │
       │ on Quick Win ! / auto-validate 24h :
       ├─► paymentIntents.capture(pi_xxx)   # capture les 50 €
       ├─► transfers.create({
       │     amount: 4000,                  # 80 % = 40 €
       │     destination: acct_senior,      # compte Connect Express
       │   })
       ├─► application_fee_amount: 1000    # 20 % = 10 € pour Zimb
       └─► Stripe fees déduits du share Zimb (1.5 % + 0.25 €)
```

### Pré-auth à la création (CT-PAY-01)

```typescript
import Stripe from 'stripe';
const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export async function createPreAuth(input: {
  amount: number;        // EUR cents (5000 = 50 €)
  ticketId: string;
  customerId: string;
  metadata: Record<string, string>;
}) {
  return stripe.paymentIntents.create(
    {
      amount: input.amount,
      currency: 'eur',
      capture_method: 'manual',         // ← clé de l'escrow
      customer: input.customerId,
      automatic_payment_methods: { enabled: true },
      metadata: { ticketId: input.ticketId, ...input.metadata },
    },
    {
      idempotencyKey: `preauth-${input.ticketId}`, // CT-INT-01
    }
  );
}
```

### Quick Win capture + transfer (CT-PAY-02)

```typescript
export async function quickWinCapture(input: {
  paymentIntentId: string;
  seniorStripeAccountId: string;
  amountCents: number;
  ticketId: string;
}) {
  // 1. Capture les fonds (toujours avant le transfer)
  await stripe.paymentIntents.capture(input.paymentIntentId, {
    // amount_to_capture: input.amountCents, // optional, defaults to full
  });

  // 2. Application fee + transfer (destination charge)
  await stripe.transfers.create(
    {
      amount: Math.floor(input.amountCents * 0.8),   // 80 % senior
      currency: 'eur',
      destination: input.seniorStripeAccountId,
      source_transaction: input.paymentIntentId,      // link to PI
      // NB: application_fee_amount est sur le PI capture, pas ici
    },
    {
      idempotencyKey: `transfer-${input.ticketId}`,
    }
  );

  // La commission 20 % reste automatiquement sur le compte Zimb
  // (déjà déduite lors de la capture via application_fee_amount sur le PI)
}
```

**⚠️ Note** : avec **destination charges**, `application_fee_amount` se met sur le `paymentIntents.create` ou `paymentIntents.capture`, **PAS** sur le `transfers.create`. Pour un payout Zimb qui n'est pas sur le PI, il faut utiliser **separate transfers + reversals**.

### Webhook signature verification

```typescript
export async function verifyStripeWebhook(request: Request, secret: string): Promise<Stripe.Event> {
  const signature = request.headers.get('stripe-signature');
  if (!signature) throw new Error('Missing stripe-signature header');

  const body = await request.text(); // RAW body, not JSON.parse!
  return stripe.webhooks.constructEvent(body, signature, secret);
}
```

### Cartes de test Stripe (toujours valides)

| Scénario | Numéro |
|---|---|
| Succès | `4242 4242 4242 4242` |
| 3D Secure | `4000 0027 6000 3184` |
| Refusée | `4000 0000 0000 0002` |
| Fonds insuffisants | `4000 0000 0000 9995` |
| Carte expirée | `4000 0000 0000 0069` |
| Disputed (chargeback) | `4000 0000 0000 0259` |

## Pièges connus

| Piège | Solution |
|---|---|
| Double capture sur double Quick Win ! | `Idempotency-Key` déterministe (`quickwin-${ticketId}`) |
| Le `paymentIntent.succeeded` arrive après le `transfer.created` | Écouter les DEUX events, ne pas coupler les promesses |
| Carte pré-autorisée expire au bout de 7 jours | **SLA dispute ≤ 48 h** (voir recettes/05-litiges-sla.md) |
| `customer` n'existe pas encore pour un nouveau client | Créer d'abord via `customers.create` puis `setup_intent` |
| Stripe Connect Express refuse un pays (ex: IN) | Utiliser une allowlist : `FR, BE, CH, LU, DE` (pays FR V1) |
| `application_fee_amount` arrondi à 0 sur petit montant | Minimum 1 centime — si bounty < 5 €, refuser en V1 |
| Webhook livré en retard > 5 min | Marquer le ticket `pending_capture` et alerter si > 10 min |
| `dispute.created` arrive AVANT `payment_intent.succeeded` | Toujours vérifier le statut actuel avec `paymentIntents.retrieve` AVANT de créditer le senior |

## Checklist pré-codage

- [ ] Tout POST a-t-il un `Idempotency-Key` ?
- [ ] L'arrondi 80/20 conserve-t-il 1 centime d'écart maximum ?
- [ ] Le webhook handler vérifie-t-il la signature AVANT de toucher au DB ?
- [ ] Le pré-auth est-il annulé automatiquement après 7 jours (CT-PAY-01b) ?
- [ ] Si litige, le SLA 48 h est-il armé dans le middleware ?
- [ ] Les fonds perdus sont-ils indemnisés par trésorerie Zimb (≤ 100 €) ?

## Liens internes

- Spec paiement : [../../../SPECIFICATIONS.md §5](../../../SPECIFICATIONS.md#5-modèle-économique--litiges)
- Tests E2E : [../../../recettes/04-validation-payout.md](../../../recettes/04-validation-payout.md), [../../../recettes/05-litiges-sla.md](../../../recettes/05-litiges-sla.md)
- Agent dédié : `Stripe Connect Paiements` (voir `.github/agents/`)
- Variables d'env : [../../../packages/worker/dev.vars.example](../../../packages/worker/dev.vars.example)
