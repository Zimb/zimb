/**
 * Auth middleware — M1+M2 stub.
 *
 * In M1+M2, we accept EITHER:
 *   1. A real Bearer JWT (signed with JWT_SECRET) → real user
 *   2. An `X-Debug-Senior: <login>` header → for local smoke tests only
 *      (rejected in production by checking ENVIRONMENT !== 'development')
 *
 * In M3, replace this with proper GitHub OAuth JWT verification (see
 * recipes/01-creation-ticket.md CT-VSC-01).
 */
import type { Context, MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';
import { jwtVerify } from 'jose';

export const authMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const auth = c.req.header('authorization');
  const debugSenior = c.req.header('x-debug-senior');

  let userId: string | undefined;
  let ghLogin: string | undefined;
  let role: 'client' | 'senior' | 'reviewer' | 'admin' | undefined;

  // Path 1: real JWT Bearer (preferred in production)
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    try {
      const secret = new TextEncoder().encode(c.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      userId = String(payload.sub);
      ghLogin = String(payload.gh_login ?? '');
      role = (payload.role as 'client' | 'senior' | 'reviewer' | 'admin') ?? 'client';
    } catch {
      return c.json({ ok: false, error: { code: 'invalid_token', message: 'Invalid JWT' } }, 401);
    }
  }
  // Path 2: debug header (only in development)
  else if (debugSenior && c.env.ENVIRONMENT === 'development') {
    userId = debugSenior;
    ghLogin = debugSenior;
    role = debugSenior.startsWith('senior-') ? 'senior' : 'client';
  }
  // Anonymous: use a generated ID (for unauth endpoints)
  else {
    userId = `anon-${crypto.randomUUID()}`;
    ghLogin = 'anonymous';
    role = 'client';
  }

  c.set('auth', { userId, ghLogin, role });
  c.set('correlationId', c.req.header('x-correlation-id') ?? crypto.randomUUID());

  await next();
};
