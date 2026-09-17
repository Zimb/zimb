/**
 * create-board-repo.ts — Create the Zimb bounty board repo on GitHub.
 *
 * Uses the @zimb-bot App installation token, since we already have the App
 * credentials in .dev.vars. Idempotent: 422 (already exists) is OK.
 *
 * Usage:
 *   npm run create:board
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createSign } from 'node:crypto';

const OWNER = 'Zimb';
const REPO = 'zimb-issues';

// ── Load .dev.vars (PEM-safe state machine) ──────────────────
const env: Record<string, string> = {};
{
  const raw = readFileSync(resolve(process.cwd(), '.dev.vars'), 'utf8');
  let inTriple = false, k = '', v: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (inTriple) {
      if (line.startsWith('"""')) { env[k] = v.join('\n'); inTriple = false; k=''; v=[]; continue; }
      v.push(line); continue;
    }
    const m = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    k = m[1]!;
    let val = (m[2] ?? '').trim();
    if (val.startsWith('"""')) { inTriple = true; val = val.slice(3); v = val === '' ? [] : [val]; continue; }
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[k] = val;
  }
}

const APP_ID = env.GITHUB_APP_ID;
const PEM = env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n') ?? '';
if (!APP_ID || !PEM) {
  console.error('Missing GITHUB_APP_ID or GITHUB_PRIVATE_KEY in .dev.vars');
  process.exit(1);
}

// ── Mint App JWT ─────────────────────────────────────────────
const b64 = (b: Buffer | string) =>
  Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const now = Math.floor(Date.now() / 1000);
const jwt = `${b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64(JSON.stringify({ iat: now - 30, exp: now + 9 * 60, iss: APP_ID }))}.${b64(createSign('RSA-SHA256').update(`${b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64(JSON.stringify({ iat: now - 30, exp: now + 9 * 60, iss: APP_ID }))}`).sign(PEM))}`;

// ── Find installation ─────────────────────────────────────────
// App is installed on user Zimb, installation_id = 162371859 (from earlier webhook).
// We hardcode it for simplicity; the script is a one-shot.
const INSTALLATION_ID = 162371859;
const tokenRes = await fetch(
  `https://api.github.com/app/installations/${INSTALLATION_ID}/access_tokens`,
  {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${jwt}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'zimb-worker-create-board',
    },
    body: '{}',
  },
);
if (!tokenRes.ok) {
  console.error(`❌ Cannot mint installation token: ${tokenRes.status}`);
  console.error(await tokenRes.text());
  process.exit(1);
}
const { token } = (await tokenRes.json()) as { token: string };

// ── Try creating on Zimb-app first, then Zimb ────────────────
const owners = [OWNER];
let lastError: { owner: string; status: number; body: string } | null = null;
for (const owner of owners) {
  const res = await fetch(
    owner.toLowerCase() === 'zimb' ? 'https://api.github.com/user/repos' : `https://api.github.com/orgs/${owner}/repos`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'zimb-worker-create-board',
      },
      body: JSON.stringify({
        name: REPO,
        description: 'Public Zimb bounty board — Issues are the source of truth for V1.',
        private: false,
        auto_init: true,
        has_issues: true,
      }),
    },
  );

  if (res.status === 422) {
    console.log(`✅ Repo ${owner}/${REPO} already exists.`);
    process.exit(0);
  }
  if (res.ok) {
    const data = (await res.json()) as { html_url: string; full_name: string };
    console.log(`✅ Created ${data.full_name}: ${data.html_url}`);
    process.exit(0);
  }
  lastError = { owner, status: res.status, body: await res.text() };
}

console.error(`❌ Failed to create ${OWNER}/${REPO} on all attempts`);
console.error(lastError);
process.exit(1);

