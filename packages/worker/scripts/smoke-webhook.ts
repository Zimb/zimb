// scripts/smoke-webhook.ts — Simulates a GitHub webhook POST to test the issue_comment handler.
import { createHmac } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_BASE = process.env.API_BASE ?? 'http://localhost:8787';

function loadDevVars(): Record<string, string> {
  const searchPaths = [
    resolve(process.cwd(), 'packages/worker/.dev.vars'),
    resolve(__dirname, '..', '.dev.vars'),
    resolve(__dirname, '..', '..', '.dev.vars'),
  ];
  for (const p of searchPaths) {
    if (existsSync(p)) {
      const content = readFileSync(p, 'utf-8');
      const out: Record<string, string> = {};
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        out[key] = value;
      }
      return out;
    }
  }
  return {};
}

const vars = loadDevVars();
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET ?? vars.GITHUB_WEBHOOK_SECRET ?? 'dev-webhook-secret';

async function main() {
  // Simulate a senior commenting "@zimb-bot claim" on issue #42
  const payload = {
    action: 'created',
    issue: {
      number: 42,
      state: 'open',
      title: 'App crashes on double logout',
      labels: [{ name: 'bounty' }, { name: 'zimb' }],
      assignee: null,
    },
    comment: {
      body: '@zimb-bot claim',
      user: { login: 'fake-senior-test' },
    },
    repository: {
      name: 'zimb',
      full_name: 'Zimb/zimb',
      owner: { login: 'Zimb' },
    },
  };

  const rawBody = JSON.stringify(payload);
  const signature =
    'sha256=' +
    createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

  console.log('=== POST /webhooks/github (issue_comment / claim) ===');
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('Signature:', signature.slice(0, 20) + '...');

  const res = await fetch(`${API_BASE}/webhooks/github`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Event': 'issue_comment',
      'X-Hub-Signature-256': signature,
    },
    body: rawBody,
  });

  console.log(`\n  [${res.status}] ${await res.text()}`);

  // Test 2: bad signature
  console.log('\n=== POST /webhooks/github (BAD signature) ===');
  const badRes = await fetch(`${API_BASE}/webhooks/github`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Event': 'ping',
      'X-Hub-Signature-256': 'sha256=invalid',
    },
    body: rawBody,
  });
  console.log(`  [${badRes.status}] ${await badRes.text()}`);

  // Test 3: status command
  console.log('\n=== POST /webhooks/github (issue_comment / status) ===');
  const statusPayload = { ...payload, comment: { body: '@zimb-bot status', user: { login: 'fake-senior-test' } } };
  const statusBody = JSON.stringify(statusPayload);
  const statusSig = 'sha256=' + createHmac('sha256', WEBHOOK_SECRET).update(statusBody).digest('hex');
  const statusRes = await fetch(`${API_BASE}/webhooks/github`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Event': 'issue_comment',
      'X-Hub-Signature-256': statusSig,
    },
    body: statusBody,
  });
  console.log(`  [${statusRes.status}] ${await statusRes.text()}`);

  // Test 4: help command
  console.log('\n=== POST /webhooks/github (issue_comment / help) ===');
  const helpPayload = { ...payload, comment: { body: '@zimb-bot help', user: { login: 'fake-senior-test' } } };
  const helpBody = JSON.stringify(helpPayload);
  const helpSig = 'sha256=' + createHmac('sha256', WEBHOOK_SECRET).update(helpBody).digest('hex');
  const helpRes = await fetch(`${API_BASE}/webhooks/github`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Event': 'issue_comment',
      'X-Hub-Signature-256': helpSig,
    },
    body: helpBody,
  });
  console.log(`  [${helpRes.status}] ${await helpRes.text()}`);

  // Test 5: non-zimb comment
  console.log('\n=== POST /webhooks/github (regular comment) ===');
  const regularPayload = { ...payload, comment: { body: 'Hello world', user: { login: 'random-user' } } };
  const regularBody = JSON.stringify(regularPayload);
  const regularSig = 'sha256=' + createHmac('sha256', WEBHOOK_SECRET).update(regularBody).digest('hex');
  const regularRes = await fetch(`${API_BASE}/webhooks/github`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Event': 'issue_comment',
      'X-Hub-Signature-256': regularSig,
    },
    body: regularBody,
  });
  console.log(`  [${regularRes.status}] ${await regularRes.text()}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
