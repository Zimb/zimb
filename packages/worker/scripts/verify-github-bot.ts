/**
 * verify-github-bot.ts — End-to-end smoke test of @zimb-bot against the real GitHub API.
 *
 * Usage:  npm run verify:github:bot -- <ticketId> <seniorGhLogin>
 *
 * Creates a real repo `zimb-<ticketId>`, creates the branch `zimb/<ticketId>`,
 * invites <seniorGhLogin>, then cleans up (deletes the repo at the end).
 *
 * Uses the real OctokitGithubBot (not the stub).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createOctokitGithubBot } from '../src/adapters/githubBot.real';

// ── Load .dev.vars ───────────────────────────────────────────────
const raw = readFileSync(resolve(process.cwd(), '.dev.vars'), 'utf8');
const env: Record<string, string> = {};
// Use a state machine: track when we're inside a triple-quoted value.
let inTriple = false;
let currentKey = '';
let currentValue: string[] = [];
for (const line of raw.split(/\r?\n/)) {
  // Inside a triple-quoted value: accumulate or close.
  // Note: the closing line can be `"""` or `""""` (trailing char), so use startsWith.
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
  // Outside: only KEY = value lines.
  const m = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
  if (!m) continue;
  currentKey = m[1]!;
  let value = (m[2] ?? '').trim();
  if (value.startsWith('"""')) {
    inTriple = true;
    value = value.slice(3);
    if (value === '') {
      continue; // wait for the closing """
    }
    currentValue = [value];
    continue;
  } else if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  } else if (value.startsWith('#')) {
    continue;
  }
  env[currentKey] = value;
}

const [, , ticketId = 'VERIFY', seniorGhLogin = ''] = process.argv;
const title = `Smoke test ticket ${ticketId}`;
const senior = seniorGhLogin || env.GH_TEST_SENIOR || 'octocat'; // octocat is GitHub's demo user

const bot = createOctokitGithubBot({
  GITHUB_APP_ID: env.GITHUB_APP_ID ?? '',
  GITHUB_PRIVATE_KEY: env.GITHUB_PRIVATE_KEY ?? '',
  GITHUB_WEBHOOK_SECRET: env.GITHUB_WEBHOOK_SECRET ?? '',
});

let pass = 0, fail = 0;
const ok = (label: string, extra?: string) => { console.log(`  ✅ ${label}${extra ? ' — ' + extra : ''}`); pass++; };
const ko = (label: string, extra?: string) => { console.log(`  ❌ ${label}${extra ? ' — ' + extra : ''}`); fail++; };

// Where the smoke test will hit — overridable so we can target an existing repo.
const repoTarget = (() => {
  const fromEnv = process.env.GH_TEST_REPO_TARGET;
  if (fromEnv && fromEnv.includes('/')) {
    const [owner, repo] = fromEnv.split('/');
    return { owner: owner ?? 'Zimb', repo: repo ?? 'zimb' };
  }
  return { owner: 'Zimb', repo: process.env.GH_TEST_REPO ?? `zimb-${ticketId}` };
})();

(async () => {
  console.log(`\n── Real @zimb-bot smoke test (ticketId=${ticketId}, senior=${senior}) ──\n`);
  console.log(`ℹ️  Repo target: ${repoTarget.owner}/${repoTarget.repo} (existing repo where the App is installed)\n`);

  // 1. Create branch on the existing repo
  let branch: string;
  try {
    branch = await bot.createBranch({ ticketId, title });
    ok('createBranch', `${repoTarget.owner}/${repoTarget.repo} → ${branch}`);
  } catch (err) {
    ko('createBranch', (err as Error).message);
    process.exit(1);
  }

  // 2. Invite senior
  try {
    await bot.inviteSenior({ ticketId, seniorGhLogin: senior });
    ok('inviteSenior', `invited ${senior} to ${repoTarget.owner}/${repoTarget.repo}`);
  } catch (err) {
    ko('inviteSenior', (err as Error).message);
  }

  // 3. Revoke senior (cleanup)
  try {
    await bot.revokeSenior({ ticketId, seniorGhLogin: senior });
    ok('revokeSenior', `revoked ${senior}`);
  } catch (err) {
    ko('revokeSenior', (err as Error).message);
  }

  // 4. Create new repo — only attempted if explicitly enabled or if env says we have org perms.
  if (process.env.SMOKE_CREATE_REPO === '1') {
    try {
      const repoUrl = await bot.createTicketRepo({ ticketId, title });
      ok('createTicketRepo', repoUrl);
    } catch (err) {
      ko('createTicketRepo', (err as Error).message);
    }
  } else {
    console.log(`  ⏭  createTicketRepo — skipped (set SMOKE_CREATE_REPO=1 to enable)`);
    console.log(`     Note: requires the App to be installed on the target owner (user or org)`);
    console.log(`     with "contents: write" + admin perms. We are currently testing on`);
    console.log(`     an existing repo where the App only needs "contents: write".`);
  }

  console.log(`\n${fail === 0 ? '🎉' : '⚠️ '} ${pass} passed, ${fail} failed\n`);
  console.log(`Branch left in place for inspection: ${repoTarget.owner}/${repoTarget.repo}@${branch}`);
  console.log(`Delete it manually if no longer needed: gh api -X DELETE repos/${repoTarget.owner}/${repoTarget.repo}/git/refs/heads/${branch}`);
  process.exit(fail === 0 ? 0 : 1);
})();
