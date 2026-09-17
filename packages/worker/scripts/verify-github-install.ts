/**
 * verify-github-install.ts — Diagnose where @zimb-bot is installed, on what
 * account (user / org), and what's missing to install it on `Zimb-app`.
 *
 * Usage:  npm run verify:github:install
 *
 * Reads GITHUB_APP_ID + GITHUB_PRIVATE_KEY from .dev.vars and reports:
 *   1. App metadata (id, owner, name)
 *   2. All current installations (account type, login, suspended?)
 *   3. For each installation: which repos it can access
 *   4. For each installation: perms granted (contents, members, etc.)
 *   5. If `Zimb-app` org exists at all
 *   6. Concrete recommendation: what to click in the UI
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createSign } from 'node:crypto';

// ── .dev.vars parser (PEM-safe state machine) ──────────────────
function loadDevVars(): Record<string, string> {
  const raw = readFileSync(resolve(process.cwd(), '.dev.vars'), 'utf8');
  const env: Record<string, string> = {};
  let inTriple = false;
  let currentKey = '';
  let currentValue: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (inTriple) {
      if (line.startsWith('"""')) {
        env[currentKey] = currentValue.join('\n');
        inTriple = false;
        currentKey = '';
        currentValue = [];
        continue;
      }
      currentValue.push(line);
      continue;
    }
    const m = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    currentKey = m[1]!;
    let value = (m[2] ?? '').trim();
    if (value.startsWith('"""')) {
      inTriple = true;
      value = value.slice(3);
      if (value === '') continue;
      currentValue = [value];
      continue;
    } else if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith('#')) {
      continue;
    }
    env[currentKey] = value;
  }
  return env;
}

const env = loadDevVars();
const APP_ID = env.GITHUB_APP_ID ?? '';
const PEM = (env.GITHUB_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');

if (!APP_ID || !PEM) {
  console.error('Missing GITHUB_APP_ID or GITHUB_PRIVATE_KEY in .dev.vars');
  process.exit(1);
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
const now = Math.floor(Date.now() / 1000);
const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
const payload = b64url(JSON.stringify({ iat: now - 30, exp: now + 9 * 60, iss: APP_ID }));
const sig = b64url(createSign('RSA-SHA256').update(`${header}.${payload}`).sign(PEM));
const jwt = `${header}.${payload}.${sig}`;

const ghFetch = async (path: string) =>
  fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'zimb-worker-verify-install',
      Authorization: `Bearer ${jwt}`,
    },
  });

const TARGET_ORG = 'Zimb-app';
let pass = 0, fail = 0, warn = 0;
const ok = (l: string, e?: string) => { console.log(`  ✅ ${l}${e ? ' — ' + e : ''}`); pass++; };
const ko = (l: string, e?: string) => { console.log(`  ❌ ${l}${e ? ' — ' + e : ''}`); fail++; };
const go = (l: string, e?: string) => { console.log(`  ⚠️  ${l}${e ? ' — ' + e : ''}`); warn++; };
const section = (t: string) => console.log(`\n── ${t} ──`);

// ── 1. App metadata ────────────────────────────────────────────
section(`1. App @zimb-bot (id=${APP_ID})`);
const appRes = await ghFetch('/app');
if (!appRes.ok) {
  ko(`GET /app returned ${appRes.status}`);
  process.exit(1);
}
const app = await appRes.json() as {
  id: number; name: string; html_url: string;
  owner: { login: string; type: string };
  permissions: Record<string, string>;
};
if (String(app.id) === APP_ID) ok('App ID matches', `${app.name} owned by ${app.owner.login} (${app.owner.type})`);
else ko(`App ID mismatch: env=${APP_ID}, GH=${app.id}`);

console.log('  📋 App owner URL:', app.html_url);

// ── 2. All installations ───────────────────────────────────────
section('2. All current installations');
const instRes = await ghFetch('/app/installations');
if (!instRes.ok) {
  ko(`GET /app/installations returned ${instRes.status}`);
} else {
  const data = await instRes.json() as {
    installations: Array<{
      id: number;
      account: { login: string; type: string };
      repository_selection: string;
      permissions: Record<string, string>;
      suspended_at: string | null;
    }>;
  };
  if (!data.installations || data.installations.length === 0) {
    ko('App is NOT installed anywhere yet', 'go install it via https://github.com/settings/apps/4972133');
  } else {
    for (const inst of data.installations) {
      const susp = inst.suspended_at ? `SUSPENDED since ${inst.suspended_at}` : 'active';
      ok(`Installation #${inst.id}`, `${inst.account.login} (${inst.account.type}) — ${inst.repository_selection} — ${susp}`);
      console.log('     perms:', JSON.stringify(inst.permissions));
    }
  }
}

// ── 3. Does Zimb-app org exist? ────────────────────────────────
section(`3. Does org "${TARGET_ORG}" exist on GitHub?`);
const orgRes = await ghFetch(`/orgs/${TARGET_ORG}`);
if (orgRes.status === 200) {
  const org = await orgRes.json() as { login: string; id: number; type: string };
  ok(`${TARGET_ORG} exists`, `${org.type}, id=${org.id}`);
} else if (orgRes.status === 404) {
  ko(`${TARGET_ORG} does NOT exist yet`, `create it at https://github.com/account/organizations/new (Free plan)`);
} else {
  ko(`GET /orgs/${TARGET_ORG} returned ${orgRes.status}`);
}

// ── 4. Are you a member of Zimb-app? ───────────────────────────
section(`4. Are you (app owner) a member of ${TARGET_ORG}?`);
// As the app, we can't directly check our owner's memberships,
// but we can check via /user/installations if the App is on that org.
const targetInstRes = await ghFetch(`/orgs/${TARGET_ORG}/installation`);
if (targetInstRes.status === 200) {
  const ti = await targetInstRes.json() as { id: number; account: { login: string } };
  ok(`App is already installed on ${TARGET_ORG}`, `installation #${ti.id}`);
} else if (targetInstRes.status === 404) {
  go(`App is NOT installed on ${TARGET_ORG} yet`, `404 from /orgs/${TARGET_ORG}/installation`);
} else {
  go(`/orgs/${TARGET_ORG}/installation returned ${targetInstRes.status}`);
}

// ── 5. Recommended next action ─────────────────────────────────
section('5. What to do next');
if (targetInstRes.status === 404) {
  console.log('');
  console.log('  📍 Steps to install @zimb-bot on Zimb-app:');
  console.log('');
  console.log('  1. Create the org (if not done):');
  console.log('       https://github.com/account/organizations/new');
  console.log('       Name: Zimb-app, Plan: Free');
  console.log('');
  console.log('  2. Go to the App page:');
  console.log('       https://github.com/settings/apps/4972133');
  console.log('');
  console.log('  3. In the LEFT MENU, click "Install App" (NOT "Edit"):');
  console.log('       https://github.com/settings/apps/4972133/installations');
  console.log('');
  console.log('  4. You should see two buttons:');
  console.log('       - "Install on your account Zimb" (already done if installation # exists above)');
  console.log('       - "Install on organization Zimb-app"  ← CLICK THIS');
  console.log('');
  console.log('  5. On the next screen, pick "All repositories" → Install.');
  console.log('');
  console.log('  If "Zimb-app" does NOT appear in step 4, the org was not created.');
}

console.log('');
console.log(`Summary: ${pass} passed · ${warn} warnings · ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);

