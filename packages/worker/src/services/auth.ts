/**
 * Auth service — JWT HS256 issuance & verification (M3.1)
 *
 * Spec: SPECIFICATIONS.md §6.3 (Auth middleware) + recettes/01-creation-ticket.md CT-VSC-01
 * Skill: .github/skills/cloudflare-workers-modern/SKILL.md (Hono + jose)
 *
 * Token shape:
 *   {
 *     sub:    userId (Airtable record id OR GitHub id)
 *     gh_login: string,
 *     role:   'client' | 'senior' | 'reviewer' | 'admin',
 *     iat:    number,
 *     exp:    number,   // iat + 24h
 *   }
 *
 * Storage: stateless (HS256). For revocation, see future KV-backed blocklist (out of M3).
 */
import { jwtVerify, SignJWT } from 'jose';

export type Role = 'client' | 'senior' | 'reviewer' | 'admin';

export const ROLES = ['client', 'senior', 'reviewer', 'admin'] as const;

export interface SessionClaims {
  sub: string;
  gh_login: string;
  role: Role;
  iat: number;
  exp: number;
}

export interface TokenPayload {
  sub: string;
  ghLogin: string;
  role: Role;
}

export const TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Signs a JWT with HS256 using the worker's JWT_SECRET.
 *
 * @param env - Worker bindings (must contain JWT_SECRET)
 * @param payload - { sub, ghLogin, role }
 * @returns Compact JWT string
 * @throws if JWT_SECRET is unset
 */
export async function signSessionToken(env: { JWT_SECRET: string }, payload: TokenPayload): Promise<string> {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  return await new SignJWT({ gh_login: payload.ghLogin, role: payload.role })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

/**
 * Verifies a JWT and returns its claims.
 *
 * @throws if signature is invalid, token is expired, or payload is malformed
 */
export async function verifySessionToken(
  env: { JWT_SECRET: string },
  token: string
): Promise<SessionClaims> {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });

  // Validate payload shape
  if (typeof payload.sub !== 'string') throw new Error('Invalid subject');
  if (typeof payload.gh_login !== 'string') throw new Error('Invalid gh_login claim');
  if (!isRole(payload.role)) throw new Error('Invalid role claim');

  return {
    sub: payload.sub,
    gh_login: payload.gh_login,
    role: payload.role,
    iat: Number(payload.iat ?? 0),
    exp: Number(payload.exp ?? 0),
  };
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}
