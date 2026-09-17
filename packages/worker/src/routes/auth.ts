/**
 * Auth routes — M3.1
 *
 * POST /auth/github   — exchange a GitHub OAuth `code` for a Zimb JWT
 * GET  /auth/me       — echo the current auth context (debug)
 *
 * Spec: SPECIFICATIONS.md §6.3
 *
 * GitHub OAuth flow:
 *   1. Browser → /auth/github?code=XXXXX (after GitHub redirect)
 *   2. Worker POSTs to https://github.com/login/oauth/access_token
 *      { client_id, client_secret, code }
 *   3. Receives { access_token }
 *   4. GETs https://api.github.com/user (login, id, email)
 *   5. Issues a Zimb JWT (signSessionToken)
 *   6. Returns { token, user: { id, login, role } }
 *
 * NOTE: the GH client_id / client_secret live in wrangler.toml as
 * `[vars]` (public) and as `wrangler secret` (private) respectively.
 * For M3.1 dev, we accept a stub `gh_login` when `ENVIRONMENT=development`.
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { signSessionToken, type Role, type TokenPayload } from '../services/auth';

const auth = new Hono<{ Bindings: Env }>();

interface GithubAccessTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GithubUser {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
}

/**
 * POST /auth/github
 * Body: { code: string }      (production)
 * Body: { devLogin: string }  (development shortcut, ENV=development only)
 */
auth.post('/github', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    code?: string;
    devLogin?: string;
  };

  // ── Development shortcut ─────────────────────────────────────
  if (c.env.ENVIRONMENT === 'development' && body.devLogin) {
    const payload: TokenPayload = {
      sub: `dev-${body.devLogin}`,
      ghLogin: body.devLogin,
      role: body.devLogin.startsWith('senior-')
        ? 'senior'
        : body.devLogin.startsWith('reviewer-')
        ? 'reviewer'
        : body.devLogin.startsWith('admin-')
        ? 'admin'
        : 'client',
    };
    const token = await signSessionToken(c.env, payload);
    return c.json(
      { ok: true, data: { token, user: payload } },
      200
    );
  }

  // ── Production OAuth flow ────────────────────────────────────
  if (!body.code) {
    return c.json(
      { ok: false, error: { code: 'bad_request', message: 'Missing `code` field' } },
      400
    );
  }

  // Exchange code → access_token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: c.env.GITHUB_APP_ID,
      client_secret: c.env.GITHUB_PRIVATE_KEY ?? '',
      code: body.code,
    }),
  });
  if (!tokenRes.ok) {
    return c.json(
      { ok: false, error: { code: 'oauth_exchange_failed', message: 'GitHub rejected the code' } },
      502
    );
  }
  const tokenData = (await tokenRes.json()) as GithubAccessTokenResponse;
  if (!tokenData.access_token) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'oauth_exchange_failed',
          message: tokenData.error_description ?? 'No access_token returned',
        },
      },
      400
    );
  }

  // Fetch user profile
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': 'zimb-worker',
      Accept: 'application/vnd.github+json',
    },
  });
  if (!userRes.ok) {
    return c.json(
      { ok: false, error: { code: 'oauth_user_fetch_failed', message: `GitHub /user returned ${userRes.status}` } },
      502
    );
  }
  const ghUser = (await userRes.json()) as GithubUser;

  // Resolve role — for now, default 'client'. Seniors/reviewers are upgraded
  // by an admin via /auth/role (out of M3.1 scope).
  const role: Role = 'client';

  const payload: TokenPayload = {
    sub: String(ghUser.id),
    ghLogin: ghUser.login,
    role,
  };
  const token = await signSessionToken(c.env, payload);

  return c.json({ ok: true, data: { token, user: payload } }, 200);
});

/**
 * GET /auth/me — echo the current auth context.
 * Useful for the Flutter app to verify a JWT on startup.
 */
auth.get('/me', async (c) => {
  const { userId, ghLogin, role } = c.get('auth');
  return c.json({ ok: true, data: { userId, ghLogin, role } }, 200);
});

export default auth;
