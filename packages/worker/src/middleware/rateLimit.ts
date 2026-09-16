/**
 * Stub — to be implemented
 * Per-IP rate limiting via RATE_LIMIT_KV (100 req/min default).
 * See recettes/07-securite-rgpd.md CT-SEC-06.
 */
import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';

export const rateLimitMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  // TODO: check RATE_LIMIT_KV bucket for c.req.header('cf-connecting-ip')
  // For now: pass-through (stub)
  await next();
};
