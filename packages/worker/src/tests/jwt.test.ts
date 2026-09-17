/**
 * Unit tests for the JWT auth service (M3.1).
 *
 * Covers:
 *   - Round-trip sign + verify
 *   - Reject expired token (manually crafted with iat in the past)
 *   - Reject tampered signature
 *   - Reject wrong algorithm (alg=none attack)
 *   - Reject unknown / missing role claim
 *   - isRole() guard
 */
import { describe, it, expect } from 'vitest';
import { SignJWT } from 'jose';
import {
  ROLES,
  TOKEN_TTL_SECONDS,
  isRole,
  signSessionToken,
  verifySessionToken,
  type Role,
} from '../services/auth';

const ENV = { JWT_SECRET: 'test-secret-do-not-use-in-prod-0123456789' };

describe('signSessionToken', () => {
  it('returns a 3-part JWT string', async () => {
    const token = await signSessionToken(ENV, { sub: 'u-1', ghLogin: 'alice', role: 'client' });
    expect(token.split('.')).toHaveLength(3);
  });

  it('embeds sub, gh_login, role in payload', async () => {
    const token = await signSessionToken(ENV, { sub: 'u-42', ghLogin: 'bob', role: 'senior' });
    const claims = await verifySessionToken(ENV, token);
    expect(claims.sub).toBe('u-42');
    expect(claims.gh_login).toBe('bob');
    expect(claims.role).toBe('senior');
  });

  it('rejects if JWT_SECRET is empty', async () => {
    await expect(
      signSessionToken({ JWT_SECRET: '' }, { sub: 'u-1', ghLogin: 'a', role: 'client' })
    ).rejects.toThrow(/JWT_SECRET/);
  });
});

describe('verifySessionToken', () => {
  it('round-trips a freshly signed token', async () => {
    const token = await signSessionToken(ENV, { sub: 'u-1', ghLogin: 'alice', role: 'reviewer' });
    const claims = await verifySessionToken(ENV, token);
    expect(claims.role).toBe<Role>('reviewer');
  });

  it('sets exp ~24h after iat', async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await signSessionToken(ENV, { sub: 'u-1', ghLogin: 'a', role: 'client' });
    const claims = await verifySessionToken(ENV, token);
    expect(claims.exp - claims.iat).toBe(TOKEN_TTL_SECONDS);
    expect(claims.iat).toBeGreaterThanOrEqual(before);
  });

  it('rejects a tampered token', async () => {
    const token = await signSessionToken(ENV, { sub: 'u-1', ghLogin: 'alice', role: 'client' });
    const tampered = token.slice(0, -2) + 'AA';
    await expect(verifySessionToken(ENV, tampered)).rejects.toThrow();
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signSessionToken(
      { JWT_SECRET: 'attacker-secret' },
      { sub: 'u-1', ghLogin: 'evil', role: 'admin' }
    );
    await expect(verifySessionToken(ENV, token)).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    // Forge a token that expired 10s ago
    const secret = new TextEncoder().encode(ENV.JWT_SECRET);
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({ gh_login: 'a', role: 'client' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject('u-1')
      .setIssuedAt(now - 100)
      .setExpirationTime(now - 10)
      .sign(secret);

    await expect(verifySessionToken(ENV, token)).rejects.toThrow();
  });

  it('rejects an alg=none forgery attempt', async () => {
    // Header { alg: "none" } base64url-encoded
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ sub: 'u-1', gh_login: 'evil', role: 'admin', iat: 0, exp: 9_999_999_999 })
    ).toString('base64url');
    const forged = `${header}.${payload}.`;

    await expect(verifySessionToken(ENV, forged)).rejects.toThrow();
  });

  it('rejects a token with an invalid role claim', async () => {
    const secret = new TextEncoder().encode(ENV.JWT_SECRET);
    const token = await new SignJWT({ gh_login: 'a', role: 'super-admin' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject('u-1')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);

    await expect(verifySessionToken(ENV, token)).rejects.toThrow(/Invalid role/);
  });

  it('rejects a token with a missing gh_login claim', async () => {
    const secret = new TextEncoder().encode(ENV.JWT_SECRET);
    const token = await new SignJWT({ role: 'client' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject('u-1')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);

    await expect(verifySessionToken(ENV, token)).rejects.toThrow(/gh_login/);
  });
});

describe('isRole', () => {
  it.each(ROLES)('accepts %s', (r) => {
    expect(isRole(r)).toBe(true);
  });

  it.each(['root', 'SUPERADMIN', '', null, undefined, 42, {}])('rejects %p', (v) => {
    expect(isRole(v)).toBe(false);
  });
});
