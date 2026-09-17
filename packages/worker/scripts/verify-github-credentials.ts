/**
 * verify-github-credentials.ts — Diagnostic script for GitHub App credentials.
 *
 * Usage:  npm run verify:github -w @zimb/worker
 *
 * Tests (in order):
 *   1. .dev.vars presence + key detection (PEM, base64 PKCS#8, or other)
 *   2. PEM parse + private key fingerprint (SHA-256 of DER)
 *   3. JWT generation (RS256) against GITHUB_APP_ID → does GitHub accept it?
 *      → GET /app  → if 200, App is real + key matches + ID matches
 *   4. If a webhook URL is configured locally, send a signed ping to /webhooks/github
 *      → verifies HMAC-SHA256 signature computation matches our worker code
 *
 * Does NOT require any GitHub App installation — works with a bare App.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createSign, createPrivateKey, randomBytes } from 'node:crypto';

// ── Load .dev.vars manually (no dotenv dep needed) ───────────────
const dotenvPath = resolve(process.cwd(), '.dev.vars');
let env: Record<string, string> = {};
try {
  const raw = readFileSync(dotenvPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let value = (m[2] ?? '').trim();
    // Triple-quoted multiline ("""\n...\n""")
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
} catch (err) {
  console.error(`❌ Cannot read .dev.vars at ${dotenvPath}`);
  console.error(`   ${(err as Error).message}`);
  process.exit(1);
}

const APP_ID = env.GITHUB_APP_ID ?? '';
const PRIVATE_KEY_RAW = env.GITHUB_PRIVATE_KEY ?? '';
const WEBHOOK_SECRET = env.GITHUB_WEBHOOK_SECRET ?? '';

let failed = 0;
const pass = (label: string, extra?: string) => console.log(`  ✅ ${label}${extra ? ' — ' + extra : ''}`);
const fail = (label: string, extra?: string) => {
  console.log(`  ❌ ${label}${extra ? ' — ' + extra : ''}`);
  failed += 1;
};
const section = (title: string) => console.log(`\n── ${title} ──`);

// ── 1. .dev.vars presence ────────────────────────────────────────
section('1. .dev.vars presence');
if (APP_ID) pass('GITHUB_APP_ID is set', APP_ID);
else fail('GITHUB_APP_ID is empty');

if (WEBHOOK_SECRET) pass('GITHUB_WEBHOOK_SECRET is set', `${WEBHOOK_SECRET.length} chars`);
else fail('GITHUB_WEBHOOK_SECRET is empty');

if (PRIVATE_KEY_RAW) pass('GITHUB_PRIVATE_KEY is set', `${PRIVATE_KEY_RAW.length} chars`);
else { fail('GITHUB_PRIVATE_KEY is empty'); process.exit(1); }

// ── 2. Key format detection + parse ──────────────────────────────
section('2. Private key parsing');
let pemKey: string;

const looksPem = PRIVATE_KEY_RAW.includes('-----BEGIN');
const looksBase64 = /^[A-Za-z0-9+/=\s]+$/.test(PRIVATE_KEY_RAW.trim()) && !looksPem;

if (looksPem) {
  pass('Format detected: PEM (-----BEGIN...)');
  pemKey = PRIVATE_KEY_RAW.replace(/\\n/g, '\n');
} else if (looksBase64) {
  console.log('  ⚠️  Format detected: base64 (not PEM). Trying to decode as PKCS#8 DER...');
  try {
    const der = Buffer.from(PRIVATE_KEY_RAW.replace(/\s+/g, ''), 'base64');
    const keyObj = createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
    pemKey = keyObj.export({ format: 'pem', type: 'pkcs8' }).toString();
    pass('Decoded base64 → PKCS#8 PEM', `${pemKey.length} chars`);
  } catch (err) {
    fail('Cannot decode base64 as PKCS#8', (err as Error).message);
    process.exit(1);
  }
} else {
  fail('Unknown format — expected PEM (-----BEGIN...) or base64 DER');
  process.exit(1);
}

// Try to parse + fingerprint
let fingerprint = '';
try {
  const keyObj = createPrivateKey(pemKey);
  const der = keyObj.export({ format: 'der', type: 'pkcs8' });
  const { createHash } = await import('node:crypto');
  fingerprint = createHash('sha256').update(der).digest('hex').slice(0, 32);
  pass('Key parses as RSA private key', `fingerprint sha256:${fingerprint}...`);
} catch (err) {
  fail('PEM is not a valid RSA private key', (err as Error).message);
  process.exit(1);
}

// ── 3. JWT against GitHub ────────────────────────────────────────
section('3. GitHub App authentication');

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

const now = Math.floor(Date.now() / 1000);
const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
const payload = b64url(JSON.stringify({
  iat: now - 30,
  exp: now + 9 * 60,
  iss: APP_ID,
}));
const signingInput = `${header}.${payload}`;
const signer = createSign('RSA-SHA256');
signer.update(signingInput);
const signature = b64url(signer.sign(pemKey));
const jwt = `${signingInput}.${signature}`;

console.log(`  → Requesting https://api.github.com/app (as App ${APP_ID})...`);
let appData: { id: number; name: string; html_url: string; owner: { login: string } } | null = null;
try {
  const res = await fetch('https://api.github.com/app', {
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'zimb-worker-verify',
    },
  });
  if (res.status === 200) {
    appData = await res.json() as typeof appData;
    pass('GitHub accepted the JWT', `App: ${appData?.name} (id=${appData?.id}, owner=${appData?.owner.login})`);
    if (String(appData?.id) !== APP_ID) {
      fail(`APP_ID mismatch — env says ${APP_ID}, GitHub says ${appData?.id}`);
    } else {
      pass('APP_ID matches', `id=${appData?.id}`);
    }
  } else if (res.status === 401) {
    fail('GitHub rejected the JWT', '401 Unauthorized — key/ID pair invalid');
  } else {
    const body = await res.text();
    fail(`GitHub returned ${res.status}`, body.slice(0, 200));
  }
} catch (err) {
  fail('Network error reaching api.github.com', (err as Error).message);
}

// ── 4. Webhook signature (offline round-trip) ────────────────────
section('4. Webhook HMAC-SHA256 round-trip');
if (!WEBHOOK_SECRET) {
  fail('Cannot test signature — GITHUB_WEBHOOK_SECRET is empty');
} else {
  const body = JSON.stringify({ zen: 'Hello from zimb-verify script' });
  const { createHmac } = await import('node:crypto');
  const expected = 'sha256=' + createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');

  // Same algorithm as services/webhookSignature.ts (Web Crypto SubtleCrypto)
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const webCryptoHex = 'sha256=' + Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (expected === webCryptoHex) {
    pass('HMAC-SHA256 matches between Node crypto and Web Crypto', expected.slice(0, 30) + '...');
  } else {
    fail('HMAC mismatch — Node vs Web Crypto differ', `${expected.slice(0, 20)} vs ${webCryptoHex.slice(0, 20)}`);
  }
}

// ── 5. Local endpoint smoke (optional) ───────────────────────────
section('5. Local /webhooks/github endpoint');
// Auto-detect via WRANGLER_DEV_PORT, then WORKER_URL, then default to 8787
const WORKER_URL = process.env.WORKER_URL
  ?? (process.env.WRANGLER_DEV_PORT ? `http://localhost:${process.env.WRANGLER_DEV_PORT}` : 'http://localhost:8787');
console.log(`  (using ${WORKER_URL})`);
try {
  const pingBody = JSON.stringify({ zen: 'verify-script' });
  const { createHmac } = await import('node:crypto');
  const sig = 'sha256=' + createHmac('sha256', WEBHOOK_SECRET).update(pingBody).digest('hex');
  const res = await fetch(`${WORKER_URL}/webhooks/github`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-github-event': 'ping',
      'x-hub-signature-256': sig,
      'User-Agent': 'GitHub-Hookshot/verify',
    },
    body: pingBody,
  });
  if (res.status === 200) {
    pass(`POST /webhooks/github returned 200`, `${WORKER_URL}/webhooks/github`);
  } else if (res.status === 401) {
    fail('POST /webhooks/github returned 401', 'check that the dev server is up and the secret matches');
  } else {
    const text = await res.text();
    fail(`POST /webhooks/github returned ${res.status}`, text.slice(0, 200));
  }
} catch (err) {
  console.log(`  ⚠️  Cannot reach ${WORKER_URL} — is 'wrangler dev' running?`);
  console.log(`     ${(err as Error).message}`);
}

// ── Summary ──────────────────────────────────────────────────────
console.log(`\n${failed === 0 ? '🎉' : '⚠️ '} ${failed === 0 ? 'All checks passed' : `${failed} check(s) failed`}\n`);

// Give pending handles a tick to close before exiting (works around a
// Windows + tsx + native fetch() UV_HANDLE_CLOSING race).
await new Promise((r) => setTimeout(r, 50));
process.exit(failed === 0 ? 0 : 1);
