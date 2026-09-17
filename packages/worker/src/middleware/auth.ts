/**
 * Auth middleware — M3.1 (JWT enforced, no more X-Debug-Senior in prod).
 *
 * Path 1 — Bearer JWT (mandatory in staging/production):
 *   Authorization: Bearer <jwt>
 *   → verifies HS256 signature against JWT_SECRET, populates c.get('auth')
 *
 * Path 2 — Debug header (development only):
 *   X-Debug-Senior: <login>
 *   → stubbed identity, ONLY accepted when ENVIRONMENT === 'development'.
 *
 * The `requireRole(...)` helper mounts a downstream guard.
 */
import type { Context, MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';
import { verifySessionToken, type Role } from '../services/auth';

export const authMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const auth = c.req.header('authorization');
  const debugHeader = c.req.header('x-debug-senior');

  let userId: string;
  let ghLogin: string;
  let role: Role;

  // ── Path 1: JWT Bearer ───────────────────────────────────────
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    try {
      const claims = await verifySessionToken(c.env, token);
      userId = claims.sub;
      ghLogin = claims.gh_login;
      role = claims.role;
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'invalid_token';
      return c.json(
        { ok: false, error: { code: 'invalid_token', message: `Invalid JWT: ${reason}` } },
        401
      );
    }
  }
  // ── Path 2: Debug header (development only) ──────────────────
  else if (debugHeader && c.env.ENVIRONMENT === 'development') {
    console.warn(`[auth] DEBUG MODE — accepting X-Debug-Senior=${debugHeader}`);
    userId = `dev-${debugHeader}`;
    ghLogin = debugHeader;
    role = debugHeader.startsWith('senior-')
      ? 'senior'
      : debugHeader.startsWith('reviewer-')
      ? 'reviewer'
      : debugHeader.startsWith('admin-')
      ? 'admin'
      : 'client';
  }
  // ── Path 3: Anonymous (unauth endpoints) ─────────────────────
  else {
    userId = `anon-${crypto.randomUUID()}`;
    ghLogin = 'anonymous';
    role = 'client';
  }

  c.set('auth', { userId, ghLogin, role });
  c.set('correlationId', c.req.header('x-correlation-id') ?? crypto.randomUUID());

  await next();
};

/**
 * Role guard — call AFTER `authMiddleware` in the chain.
 *
 * Usage:
 *   app.use('/tickets/:id/claim', authMiddleware, requireRole('senior'));
 */
export function requireRole(...allowed: Role[]): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const { role } = c.get('auth');
    if (!allowed.includes(role)) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'forbidden',
            message: `Required role: ${allowed.join(' | ')}, got '${role}'`,
          },
        },
        403
      );
    }
    await next();
  };
}

export function getAuth(c: Context<{ Bindings: Env }>) {
  return c.get('auth');
}
