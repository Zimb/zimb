/**
 * Webhook receivers — M3.3 (GitHub) + M4 (Stripe)
 *
 * Spec: SPECIFICATIONS.md §6.3
 * Recette: recettes/03-github-access.md
 *
 * GitHub webhook flow:
 *   1. Verify signature (HMAC SHA256, X-Hub-Signature-256)
 *   2. Parse event
 *   3. Route by event type:
 *      - `ping`                  → pong
 *      - `push` on zimb/<id>     → log only (no state change in M3.3)
 *      - `pull_request` merged   → mark ticket delivered (safety net)
 *
 * Stripe webhook is still a stub (M4).
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';
import {
  extractTicketIdFromPrBranch,
  extractTicketIdFromPushRef,
  verifyGithubSignature,
} from '../services/webhookSignature';

const webhooks = new Hono<{ Bindings: Env }>();

webhooks.post('/stripe', (c) =>
  c.json(
    { ok: false, error: { code: 'not_implemented', message: 'POST /webhooks/stripe — implemented in M4' } },
    501
  )
);

/**
 * POST /webhooks/github
 * Headers:
 *   X-Hub-Signature-256: sha256=<hex>
 *   X-GitHub-Event: push | pull_request | ping | ...
 * Body: GitHub JSON event payload (raw, not pre-parsed)
 */
webhooks.post('/github', async (c) => {
  // 1. Read raw body (must be raw for HMAC, NOT c.req.json())
  const rawBody = await c.req.text();

  // 2. Verify signature
  const signature = c.req.header('x-hub-signature-256') ?? null;
  const isValid = await verifyGithubSignature(c.env.GITHUB_WEBHOOK_SECRET, rawBody, signature);
  if (!isValid) {
    console.warn('[webhooks/github] Invalid or missing signature');
    return c.json(
      { ok: false, error: { code: 'invalid_signature', message: 'X-Hub-Signature-256 mismatch' } },
      401
    );
  }

  // 3. Parse + route by event type
  let event: { [k: string]: unknown };
  try {
    event = JSON.parse(rawBody) as { [k: string]: unknown };
  } catch {
    return c.json(
      { ok: false, error: { code: 'bad_request', message: 'Invalid JSON' } },
      400
    );
  }

  const eventType = c.req.header('x-github-event') ?? 'unknown';

  switch (eventType) {
    case 'ping':
      return c.json({ ok: true, data: { pong: true } }, 200);

    case 'push': {
      const ref = String((event.ref as string | undefined) ?? '');
      const ticketId = extractTicketIdFromPushRef(ref);
      if (!ticketId) return c.json({ ok: true, data: { ignored: 'not a zimb branch' } }, 200);
      // For M3.3 we don't change ticket state on push — only on PR merge.
      console.log(`[webhooks/github] push on ${ticketId} (no state change)`);
      return c.json({ ok: true, data: { ticketId, event: 'push' } }, 200);
    }

    case 'pull_request': {
      const action = String((event.action as string | undefined) ?? '');
      const merged = Boolean((event.pull_request as { merged?: boolean } | undefined)?.merged);
      const branch = String(
        ((event.pull_request as { head?: { ref?: string } } | undefined)?.head?.ref) ?? ''
      );
      const ticketId = extractTicketIdFromPrBranch(branch);
      if (!ticketId) return c.json({ ok: true, data: { ignored: 'not a zimb branch' } }, 200);
      if (action === 'closed' && merged) {
        // TODO (M3.x): mark ticket as `delivered` if not already (idempotent)
        console.log(`[webhooks/github] PR merged for ${ticketId}`);
        return c.json({ ok: true, data: { ticketId, event: 'pr_merged' } }, 200);
      }
      return c.json({ ok: true, data: { ignored: `pr action=${action} merged=${merged}` } }, 200);
    }

    default:
      return c.json({ ok: true, data: { ignored: `event=${eventType}` } }, 200);
  }
});

export default webhooks;
