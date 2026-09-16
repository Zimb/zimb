/**
 * Stub — to be implemented per SPECIFICATIONS.md §6.3
 * Receivers for Stripe + GitHub webhooks with signature verification.
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';

const webhooks = new Hono<{ Bindings: Env }>();

webhooks.post('/stripe', (c) =>
  c.json(
    { ok: false, error: { code: 'not_implemented', message: 'POST /webhooks/stripe — TODO' } },
    501
  )
);

webhooks.post('/github', (c) =>
  c.json(
    { ok: false, error: { code: 'not_implemented', message: 'POST /webhooks/github — TODO' } },
    501
  )
);

export default webhooks;
