/**
 * Cloudflare Worker bindings (env vars + Durable Objects + KV)
 */
export interface Env {
  // ── Vars ─────────────────────────────────────────────────────
  ENVIRONMENT: 'development' | 'staging' | 'production';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';

  // ── Secrets ──────────────────────────────────────────────────
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  AIRTABLE_API_KEY: string;
  AIRTABLE_BASE_ID: string;
  GITHUB_APP_ID: string;
  GITHUB_PRIVATE_KEY: string;
  GITHUB_WEBHOOK_SECRET: string;
  JWT_SECRET: string;
  RESEND_API_KEY: string;

  // ── Durable Objects ──────────────────────────────────────────
  KANBAN_SESSION: DurableObjectNamespace;
  OFFLINE_BUFFER: DurableObjectNamespace;

  // ── KV namespaces ───────────────────────────────────────────
  IDEMPOTENCY_KV: KVNamespace;
  RATE_LIMIT_KV: KVNamespace;
}

/**
 * Standard API response envelope (see SPECIFICATIONS.md §6.2)
 */
export type ApiResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

/**
 * Auth context attached to every authenticated request
 */
export interface AuthContext {
  userId: string;
  ghLogin: string;
  role: 'client' | 'senior' | 'reviewer' | 'admin';
  stripeAccountId?: string;
}

/**
 * Hono variables type extension
 */
declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
    correlationId: string;
  }
}
