import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createSign } from 'node:crypto';

const env: Record<string, string> = {};
{
  const raw = readFileSync(resolve(process.cwd(), '.dev.vars'), 'utf8');
  let inTriple = false;
  let k = '', v: string[] = [];
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

const APP_ID = env.GITHUB_APP_ID!;
const PEM = env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, '\n');

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const now = Math.floor(Date.now() / 1000);
const header = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
const payload = b64(JSON.stringify({ iat: now - 30, exp: now + 9 * 60, iss: APP_ID }));
const sig = b64(createSign('RSA-SHA256').update(`${header}.${payload}`).sign(PEM));
const jwt = `${header}.${payload}.${sig}`;

const gh = (p: string) => fetch(`https://api.github.com${p}`, {
  headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', Authorization: `Bearer ${jwt}` },
});

// Test 1: App can list its own installations (any account type)
const r1 = await gh('/app/installations');
console.log(`GET /app/installations → ${r1.status}`);
if (r1.ok) {
  const d = await r1.json();
  console.log(`  Total installations: ${d.installations?.length ?? 0}`);
  for (const i of d.installations ?? []) {
    console.log(`  - #${i.id} on ${i.account.login} (${i.account.type})`);
  }
}

// Test 2: Specific endpoint for the org we want to install on
const r2 = await gh('/orgs/Zimb-app/installation');
console.log(`\nGET /orgs/Zimb-app/installation → ${r2.status}`);
const j2 = await r2.json();
console.log(JSON.stringify(j2, null, 2));

// Test 3: App can read the user's own installations (the org owner = us)
const r3 = await gh('/user/installations');
console.log(`\nGET /user/installations → ${r3.status}`);
if (r3.ok) {
  const d = await r3.json();
  console.log(`  Total user installations: ${d.installations?.length ?? 0}`);
  for (const i of d.installations ?? []) {
    console.log(`  - #${i.id} on ${i.account.login} (${i.account.type})`);
  }
}
