/**
 * smoke-test.ts — End-to-end smoke test of M1+M2 against the real Worker.
 *
 * Assumes `npm run dev` is running on http://localhost:8787 (or pass API_BASE env var).
 *
 * Tests:
 *   1. Health check
 *   2. POST /tickets (M1)
 *   3. GET /tickets (list open)
 *   4. POST /tickets/:id/claim (M2, fresh ticket)
 *   5. POST /tickets/:id/claim again → 409 (CT-LOCK-05)
 *   6. POST /tickets/:id/claim from another senior → 409 (CT-LOCK-02)
 *
 * Usage:
 *   # Terminal 1
 *   cd packages/worker && npm run dev
 *   # Terminal 2
 *   cd packages/worker && npm run smoke:test
 *
 * Reference: recettes/01-creation-ticket.md + recettes/02-kanban-lock-timer.md
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_BASE = process.env.API_BASE ?? 'http://localhost:8787';

// ─── Helpers ───────────────────────────────────────────────────
function loadDevVars(): { vars: Record<string, string>; source: string } {
  const searchPaths = [
    resolve(process.cwd(), '.dev.vars'),
    resolve(__dirname, '..', '.dev.vars'),
    resolve(__dirname, '..', '..', '..', '.dev.vars'),
  ];

  const fromEnv: Record<string, string> = {};
  if (process.env.AIRTABLE_API_KEY) fromEnv.AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  if (process.env.AIRTABLE_BASE_ID) fromEnv.AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  if (fromEnv.AIRTABLE_API_KEY && fromEnv.AIRTABLE_BASE_ID) {
    return { vars: fromEnv, source: 'environment variables' };
  }

  for (const p of searchPaths) {
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, 'utf-8');
        const result: Record<string, string> = { ...fromEnv };
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx === -1) continue;
          const key = trimmed.slice(0, eqIdx).trim();
          let value = trimmed.slice(eqIdx + 1).trim();
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          result[key] = value;
        }
        return { vars: result, source: p };
      } catch {
        // try next path
      }
    }
  }
  return { vars: {}, source: 'none' };
}

const { vars, source } = loadDevVars();

// For M1+M2 we use a fake senior auth header (auth middleware is stubbed).
// In M3 this will be a real JWT.
function authHeaders(seniorGhLogin: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Zimb-Client': 'web',
    'X-Debug-Senior': seniorGhLogin, // consumed by stub auth middleware in M1/M2
  };
}

interface TicketResponse {
  ok: boolean;
  data?: {
    id: string;
    status: string;
    claimedBy?: string;
    [k: string]: unknown;
  };
  error?: { code: string; message: string };
}

async function call(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  senior: string = 'client-smoke'
): Promise<{ status: number; body: TicketResponse }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: authHeaders(senior),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as TicketResponse;
  return { status: res.status, body: json };
}

const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  ${c.green('✅')} ${label}${detail ? ' ' + c.cyan(detail) : ''}`);
    passed++;
  } else {
    console.log(`  ${c.red('❌')} ${label}${detail ? ' ' + c.cyan(detail) : ''}`);
    failed++;
  }
}

// ─── Test runner ───────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(`${c.bold('🧪 Zimb M1+M2 smoke test')}`);
  console.log(`   Target: ${API_BASE}\n`);

  if (!vars.AIRTABLE_API_KEY) {
    console.log(`${c.yellow('⚠️  No AIRTABLE_API_KEY in .dev.vars — tests will fail')}\n`);
  }

  // ── 1. Health check ─────────────────────────────────────────
  console.log(`${c.bold('1. Health check')}`);
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = (await res.json()) as { ok: boolean; service: string };
    check('GET /health → 200 + ok=true', res.ok && data.ok, `service=${data.service}`);
  } catch (err) {
    check('GET /health', false, `(${(err as Error).message})`);
    console.log(`\n${c.red('Worker not reachable. Start it first: cd packages/worker && npm run dev')}`);
    process.exit(1);
  }

  // ── 2. POST /tickets (M1) ───────────────────────────────────
  console.log(`\n${c.bold('2. POST /tickets (CT-WEB-01)')}`);
  const ticketPayload = {
    title: 'Smoke test — CORS error on /users endpoint',
    description: 'GET /users returns CORS preflight error blocking the request from the SPA.',
    bounty: 5000,
    urgency: 'high',
    languages: ['TypeScript', 'JavaScript'],
    repoUrl: 'https://github.com/zimb-app/zimb-smoke',
    channel: 'web',
  };
  const createRes = await call('POST', '/tickets', ticketPayload);
  check('POST /tickets → 201', createRes.status === 201, `status=${createRes.status}`);
  check('Response.ok = true', createRes.body.ok === true);
  const ticket = createRes.body.data;
  if (!ticket) {
    console.log(c.red('No ticket returned, aborting.'));
    process.exit(1);
  }
  check('Ticket has Zimb ID', /^T-\d{4}$/.test(ticket.id), `id=${ticket.id}`);
  check('Ticket status = open', ticket.status === 'open');
  check('Ticket bounty stored', ticket.bounty === 5000, `${ticket.bounty} cents`);

  // ── 3. POST /tickets with invalid payload (CT-WEB-02) ────────
  console.log(`\n${c.bold('3. Validation — invalid payload (CT-WEB-02)')}`);
  const invalidRes = await call('POST', '/tickets', { ...ticketPayload, title: 'hi' });
  check('Invalid title → 400', invalidRes.status === 400);
  check('Error code = validation_error', invalidRes.body.error?.code === 'validation_error');

  // ── 4. POST /tickets with bounty < 10 € (CT-WEB-03) ─────────
  console.log(`\n${c.bold('4. Validation — bounty too low (CT-WEB-03)')}`);
  const lowBountyRes = await call('POST', '/tickets', { ...ticketPayload, bounty: 500 });
  check('Bounty 500 cents → 400', lowBountyRes.status === 400);

  // ── 5. GET /tickets (list open) ─────────────────────────────
  console.log(`\n${c.bold('5. GET /tickets')}`);
  const listRes = await call('GET', '/tickets?status=open');
  check('GET /tickets → 200', listRes.status === 200);
  const ticketList = (listRes.body as unknown as { data: unknown[] }).data ?? [];
  check('List contains our ticket', ticketList.length > 0, `${ticketList.length} ticket(s)`);

  // ── 6. POST /tickets/:id/claim (CT-LOCK-01) ─────────────────
  console.log(`\n${c.bold('6. POST /tickets/:id/claim (CT-LOCK-01)')}`);
  const claimRes = await call('POST', `/tickets/${ticket.id}/claim`, undefined, 'senior-alice');
  check('Claim → 200', claimRes.status === 200, `status=${claimRes.status}`);
  check('Ticket status = claimed', claimRes.body.data?.status === 'claimed' || (claimRes.body.data as { ticket?: { status: string } })?.ticket?.status === 'claimed');
  const timerSeconds = (claimRes.body.data as { timerSeconds?: number })?.timerSeconds;
  check('timerSeconds = 2700', timerSeconds === 2700, `(${timerSeconds}s)`);

  // ── 7. Replay claim same senior (CT-LOCK-05) ─────────────────
  console.log(`\n${c.bold('7. Replay claim same senior (CT-LOCK-05)')}`);
  const replayRes = await call('POST', `/tickets/${ticket.id}/claim`, undefined, 'senior-alice');
  check('Replay → 409', replayRes.status === 409);
  check('Error code = already_claimed_by_you', replayRes.body.error?.code === 'already_claimed_by_you');

  // ── 8. Concurrent claim another senior (CT-LOCK-02) ────────
  console.log(`\n${c.bold('8. Concurrent claim another senior (CT-LOCK-02)')}`);
  const concurrentRes = await call('POST', `/tickets/${ticket.id}/claim`, undefined, 'senior-bob');
  check('Concurrent claim → 409', concurrentRes.status === 409);
  check('Error code = already_claimed', concurrentRes.body.error?.code === 'already_claimed');

  // ── 9. Claim non-existent ticket ────────────────────────────
  console.log(`\n${c.bold('9. Claim non-existent ticket')}`);
  const notFoundRes = await call('POST', '/tickets/T-9999/claim', undefined, 'senior-charlie');
  check('Non-existent → 404', notFoundRes.status === 404);

  // ── Summary ──────────────────────────────────────────────────
  console.log(`\n${c.bold('═'.repeat(60))}`);
  console.log(`${c.bold('Summary')}: ${c.green(passed + ' passed')}, ${failed > 0 ? c.red(failed + ' failed') : c.green('0 failed')}`);
  console.log(`${c.bold('═'.repeat(60))}\n`);

  if (failed > 0) {
    console.log(c.yellow('💡 Tips:'));
    console.log(c.yellow('   - Make sure `npm run dev` is running on the correct port'));
    console.log(c.yellow('   - Check .dev.vars has a valid AIRTABLE_API_KEY + AIRTABLE_BASE_ID'));
    console.log(c.yellow('   - Inspect the Worker logs for stack traces'));
    process.exit(1);
  }

  console.log(c.green('🎉 All checks passed! M1+M2 are working end-to-end.\n'));
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
