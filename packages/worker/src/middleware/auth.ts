/**
 * Stub — to be implemented
 * Verifies the GitHub OAuth JWT and attaches AuthContext to the request.
 * Enforces RBAC: client | senior | reviewer | admin.
 */
import type { Context, MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';

export const authMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  // TODO: verify Bearer JWT signed with JWT_SECRET
  // For now: pass-through (stub)
  await next();
};
