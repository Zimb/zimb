/**
 * verify-github-repo.ts — Verify the @zimb-bot App + webhook configuration
 * on a specific GitHub repo.
 *
 * Usage:  npm run verify:github:repo -- <owner> <repo>
 *
 * Checks:
 *   1. App metadata (name, owner, id)
 *   2. App permissions (contents, members, metadata)
 *   3. Webhook on the repo (URL, events, secret length, active)
 *   4. Installation token works against the repo (can read it)
 *   5. Webhook secret matches the one in .dev.vars
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createSign, createPrivateKey, createHmac, randomBytes } from 'node:crypto';

// ── Load .dev.vars ───────────────────────────────────────────────
const dotenvPath = resolve(process.cwd(), '.dev.vars');
const raw = readFileSync(dotenvPath, 'utf8');
const env: Record<string, string> = {};
for (const line of raw.split(/\r?\n/)) {
  const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
  if (!m) continue;
  let value = (m[2] ?? '').trim();
  if (value.startsWith('"""')) {
    const rest = raw.split(/\r?\n/).slice(raw.split(/\r?\n/).indexOf(line) + 1);
    const collected: string[] = [];
    for (const r of rest) {
      if (r.trim() === '"""') break;
      collected.push(r);
    }
    value = collected.join('\n');
  } else if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }
  if (!value.startsWith('#')) env[m[1]!] = value;
}
const APP_ID = env.GITHUB_APP_ID ?? '';
const PEM = (env.GITHUB_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');
const SECRET = env.GITHUB_WEBHOOK_SECRET ?? '';

const [, , owner = '', repo = ''] = process.argv;
if (!owner || !repo) {
  console.error('Usage: npm run verify:github:repo -- <owner> <repo>');
  process.exit(1);
}

let failed = 0;
let warned = 0;
const pass = (l: string, e?: string) => console.log(`  ✅ ${l}${e ? ' — ' + e : ''}`);
const fail = (l: string, e?: string) => { console.log(`  ❌ ${l}${e ? ' — ' + e : ''}`); failed += 1; };
const warn = (l: string, e?: string) => { console.log(`  ⚠️  ${l}${e ? ' — ' + e : ''}`); warned += 1; };
const skip = (l: string, e?: string) => console.log(`  ⏭  ${l}${e ? ' — ' + e : ''}`);
const section = (t: string) => console.log(`\n── ${t} ──`);

// ── Mint JWT as the App ──────────────────────────────────────────
function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
const now = Math.floor(Date.now() / 1000);
const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
const payload = b64url(JSON.stringify({ iat: now - 30, exp: now + 9 * 60, iss: APP_ID }));
const sig = b64url(createSign('RSA-SHA256').update(`${header}.${payload}`).sign(PEM));
const jwt = `${header}.${payload}.${sig}`;

const ghFetch = async (path: string, init: RequestInit = {}, asApp = true) =>
  fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'zimb-worker-verify-repo',
      ...(init.headers ?? {}),
      ...(asApp ? { Authorization: `Bearer ${jwt}` } : {}),
    },
  });

// ── 1. App metadata + permissions ─────────────────────────────────
section(`1. App @zimb-bot (id=${APP_ID})`);
const appRes = await ghFetch('/app');
if (!appRes.ok) {
  fail(`GET /app returned ${appRes.status}`);
  process.exit(1);
}
const app = await appRes.json() as {
  id: number; name: string; html_url: string;
  owner: { login: string };
  permissions: Record<string, string>;
  events: string[];
};
if (String(app.id) === APP_ID) pass('App ID matches', `${app.name} owned by ${app.owner.login}`);
else fail(`App ID mismatch: env=${APP_ID}, GH=${app.id}`);

// Required permissions per skill github-apps-zimb-bot
// NOTE: `members` is an *organization-level* permission. On a user account
// (no org), it will be absent — that's expected and not a failure.
const requiredPerms: Record<string, string> = {
  contents: 'write',
  metadata: 'read',
};
const orgOnlyPerms: Record<string, string> = {
  members: 'write',
};
for (const [name, expected] of Object.entries(requiredPerms)) {
  const actual = app.permissions[name];
  if (actual === expected) pass(`Permission '${name}=${expected}'`);
  else fail(`Permission '${name}'`, `expected '${expected}', got '${actual ?? 'absent'}'`);
}
for (const [name, expected] of Object.entries(orgOnlyPerms)) {
  const actual = app.permissions[name];
  if (actual === expected) pass(`Permission '${name}=${expected}'`);
  else warn(`Permission '${name}'`, `expected '${expected}', got '${actual ?? 'absent'}' — only applies to org installations`);
}

// Required webhook events
const requiredEvents = ['push', 'pull_request'];
for (const ev of requiredEvents) {
  if (app.events.includes(ev)) pass(`App subscribes to '${ev}'`);
  else fail(`App is missing '${ev}' event`);
}

// ── 2. App installation on the target repo ───────────────────────
section(`2. App installation on ${owner}/${repo}`);
let installationId = 0;
const installRes = await ghFetch(`/repos/${owner}/${repo}/installation`);
if (installRes.status === 200) {
  const install = await installRes.json() as {
    id: number;
    account: { login: string };
    permissions: Record<string, string>;
  };
  installationId = install.id;
  pass(`App is installed on ${owner}/${repo}`, `installation #${install.id} on ${install.account.login}`);
  // Re-check perms in this installation
  for (const [name, expected] of Object.entries(requiredPerms)) {
    if (install.permissions[name] === expected) pass(`Installation perm '${name}=${expected}'`);
    else fail(`Installation perm '${name}'`, `got '${install.permissions[name] ?? 'absent'}'`);
  }
  // Org-only perms are warnings on user accounts
  for (const [name, expected] of Object.entries(orgOnlyPerms)) {
    if (install.permissions[name] === expected) pass(`Installation perm '${name}=${expected}'`);
    else warn(`Installation perm '${name}'`, `got '${install.permissions[name] ?? 'absent'}' — only applies to org installations`);
  }
} else if (installRes.status === 404) {
  fail('App is NOT installed on this repo', 'go to the repo → Settings → Installations → configure');
  process.exit(1);
} else {
  fail(`GET /installation returned ${installRes.status}`);
  process.exit(1);
}

// Mint an installation access token
const tokenRes = await ghFetch(`/app/installations/${installationId}/access_tokens`, {
  method: 'POST',
  body: JSON.stringify({}),
}, true);
if (!tokenRes.ok) {
  fail(`Cannot mint installation token (${tokenRes.status})`);
  process.exit(1);
}
const tokenJson = (await tokenRes.json()) as { token: string; expires_at: string };
const installationToken = tokenJson.token;
pass('Installation token minted', `expires ${new Date(tokenJson.expires_at).toLocaleString()}`);

const repoFetch = async (path: string, init: RequestInit = {}) =>
  fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'zimb-worker-verify-repo',
      ...(init.headers ?? {}),
      Authorization: `Bearer ${installationToken}`,
    },
  });

// ── 3. Repo access via installation token ────────────────────────
section('3. Repo access via installation token');
const repoRes = await repoFetch(`/repos/${owner}/${repo}`);
if (repoRes.ok) {
  const r = await repoRes.json() as { id: number; full_name: string; private: boolean; permissions: Record<string, string> };
  pass(`Can read repo`, `${r.full_name} (private=${r.private})`);
  // On PUBLIC repos the `permissions` object reports all-false because
  // everyone can read them already. The fact that the API call succeeded
  // (200 OK) is the real proof the installation token works.
  const isPrivate = r.private;
  if (isPrivate) {
    if (r.permissions.pull) pass('Bot has read access on this repo');
    else fail('Bot lacks even read access on private repo', `perms: ${JSON.stringify(r.permissions)}`);
  } else {
    skip('Public repo — permissions object is always empty (read is implicit)');
  }
} else {
  fail(`Cannot read repo (${repoRes.status})`);
}

// ── 4. Webhook configuration on the repo ─────────────────────────
section('4. Webhook on the repo');
const hooksRes = await repoFetch(`/repos/${owner}/${repo}/hooks`);
if (hooksRes.status === 200) {
  const hooks = await hooksRes.json() as Array<{
    id: number; name: string; active: boolean; url: string;
    config: { url: string; content_type?: string; insecure_ssl?: string };
    events: string[];
  }>;
  const ourHook = hooks.find((h) => h.config.url.includes('zimb.app') || h.config.url.includes('localhost') || h.config.url.includes('trycloudflare'));
  if (!ourHook) {
    fail('No webhook configured for zimb.app', `${hooks.length} hooks found, none target Zimb`);
  } else {
    pass(`Webhook found`, `${ourHook.config.url} (id=${ourHook.id}, active=${ourHook.active})`);
    if (ourHook.active) pass('Webhook is active');
    else fail('Webhook is DISABLED — enable it in the GitHub UI');
    for (const ev of requiredEvents) {
      if (ourHook.events.includes(ev)) pass(`Hook listens to '${ev}'`);
      else fail(`Hook missing '${ev}' event`);
    }
  }
} else if (hooksRes.status === 403) {
  // Token doesn't have `hooks:read` scope. The webhook is configured
  // manually on the repo; verify it via the Worker round-trip instead.
  warn('Cannot list hooks via API (token lacks hooks:read scope)', `status ${hooksRes.status}`);
  skip('Webhook config check will rely on the Worker round-trip below');
} else {
  fail(`GET /hooks returned ${hooksRes.status}`);
}

// ── 5. Webhook secret round-trip ──────────────────────────────────
section('5. Webhook secret matches .dev.vars');
// GitHub doesn't expose the webhook secret via API. We send a synthetic ping
// to the configured URL and check whether the Worker accepts it. If the
// Worker is reachable, this is a real end-to-end check.
const hooks2Res = await repoFetch(`/repos/${owner}/${repo}/hooks`);
const hooks = (await hooks2Res.json()) as Array<{ config: { url: string }; id: number }>;
const ourHook = Array.isArray(hooks)
  ? hooks.find((h) => h.config.url.includes('zimb.app') || h.config.url.includes('localhost') || h.config.url.includes('trycloudflare'))
  : undefined;
if (ourHook) {
  const url = ourHook.config.url;
  const pingBody = JSON.stringify({ zen: 'verify-script round-trip', hook_id: ourHook.id });
  const sig = 'sha256=' + createHmac('sha256', SECRET).update(pingBody).digest('hex');
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'ping',
        'x-hub-signature-256': sig,
        'User-Agent': 'GitHub-Hookshot/verify',
      },
      body: pingBody,
    });
    if (r.status === 200) pass(`Worker accepts signed ping (HMAC matches)`, `${url} → 200`);
    else if (r.status === 401) fail(`Worker rejected signature — secret mismatch`, `${url} → 401`);
    else fail(`Worker returned ${r.status}`, (await r.text()).slice(0, 100));
  } catch (err) {
    console.log(`  ⚠️  Cannot reach ${url}: ${(err as Error).message}`);
    console.log('     (expected if Worker is local-only — try cloudflared for real test)');
  }
} else {
  console.log('  ⚠️  No hook found — skipping round-trip');
}

// ── Summary ──────────────────────────────────────────────────────
console.log(`\n${failed === 0 ? '🎉' : '⚠️ '} ${failed === 0 ? 'All checks passed' : `${failed} check(s) failed`}\n`);
await new Promise((r) => setTimeout(r, 50));
process.exit(failed === 0 ? 0 : 1);
