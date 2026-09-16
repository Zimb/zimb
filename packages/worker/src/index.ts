/**
 * Zimb API Worker — entry point
 *
 * Hosted at: api.zimb.app
 * Stack: Hono router + Cloudflare Workers + Airtable + Stripe + GitHub
 *
 * Routes (see SPECIFICATIONS.md §3.4):
 *   POST   /tickets
 *   GET    /tickets
 *   POST   /tickets/:id/claim
 *   POST   /tickets/:id/deliver
 *   POST   /tickets/:id/validate
 *   POST   /tickets/:id/dispute
 *   POST   /tickets/:id/review
 *   GET    /me/tickets
 *   GET    /track/:ticketId
 *   GET    /webhooks/stripe
 *   GET    /webhooks/github
 *
 * Cron triggers (see wrangler.toml):
 *   every 1 min  — timer expiry (CT-LOCK-03)
 *   every 1 hour — auto-validate 24h (CT-PAY-03)
 *   every 30 min — SLA escalation (CT-SLA-01/02/03)
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import type { Env } from './types/env';
import tickets from './routes/tickets';
import claims from './routes/claims';
import webhooks from './routes/webhooks';
import me from './routes/me';
import track from './routes/track';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';

export { KanbanSession } from './durable-objects/KanbanSession';
export { OfflineBuffer } from './durable-objects/OfflineBuffer';

const app = new Hono<{ Bindings: Env }>();

// ─── Global middleware ───────────────────────────────────────────
app.use('*', logger());
app.use('*', secureHeaders());
app.use(
  '*',
  cors({
    origin: [
      'https://app.zimb.app',
      'https://zimb.app',
      'http://localhost:5173', // landing dev
      'http://localhost:3000', // extension dev
    ],
    credentials: true,
  })
);

// ─── Health check (unauthenticated) ──────────────────────────────
app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'zimb-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  })
);

// ─── Public routes ───────────────────────────────────────────────
app.route('/track', track);

// ─── Webhooks (signature-verified, no JWT) ──────────────────────
app.route('/webhooks', webhooks);

// ─── Authenticated routes ────────────────────────────────────────
app.use('/tickets/*', authMiddleware);
app.use('/tickets/*', rateLimitMiddleware);
app.use('/me/*', authMiddleware);
app.use('/me/*', rateLimitMiddleware);
app.route('/tickets', tickets);
app.route('/me', me);

// ─── Claims (nested under /tickets) ─────────────────────────────
app.use('/tickets/:id/claim', authMiddleware);
app.use('/tickets/:id/claim', rateLimitMiddleware);
app.route('/tickets/:id/claim', claims);

// ─── 404 ─────────────────────────────────────────────────────────
app.notFound((c) =>
  c.json({ ok: false, error: { code: 'not_found', message: 'Route not found' } }, 404)
);

// ─── Error handler ───────────────────────────────────────────────
app.onError((err, c) => {
  console.error('[unhandled]', err);
  return c.json(
    { ok: false, error: { code: 'internal_error', message: 'Internal server error' } },
    500
  );
});

export default app;

// ─── Cron handler ────────────────────────────────────────────────
export const scheduled: ExportedHandlerScheduledHandler<Env> = async (event, env, ctx) => {
  const cron = event.cron;
  console.log(`[cron] Triggered: ${cron}`);

  // Lazy import to keep cold-start fast
  const { runCronJobs } = await import('./cron/index');
  ctx.waitUntil(runCronJobs(cron, env));
};
