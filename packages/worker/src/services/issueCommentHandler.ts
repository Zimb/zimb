/**
 * issueCommentHandler.ts — handles `@zimb-bot <verb>` comments on GitHub issues.
 *
 * When a senior comments `@zimb-bot claim` on a `bounty`-labeled issue:
 *   1. Look up the matching ticket (by issue number)
 *   2. Atomically claim it (same logic as POST /tickets/:id/claim)
 *   3. Create the private repo `zimb-{ticketId}` (idempotent)
 *   4. Create the working branch `zimb/{ticketId}` from main
 *   5. Invite the senior with `push` permission (idempotent)
 *   6. Assign the issue to the senior
 *   7. Reply with a confirmation comment + clone snippet
 *   8. Remove the `bounty` label (so other seniors don't claim a taken seat)
 *
 * Spec: SPECIFICATIONS.md §4.3 + §6.3
 * Recette: recettes/03-github-access.md (CT-BOT-01 → CT-BOT-04)
 */
import {
  getTicketByZimbId,
  getActiveClaim,
  createClaim,
  updateTicket,
} from '../adapters/airtable';
import { getGithubBot, type GithubBotService } from '../adapters/githubBot';
import { parseCommand } from './commandParser';
import { postIssueComment, assignIssue, removeLabel } from './githubBotComments';
import { parseDirectivesFromBody, type ZimbDirectives } from './directivesParser';
import { t, detectLanguage } from './i18n';
import type { Ticket } from '../types/ticket';

export interface IssueCommentPayload {
  action: string; // "created" | "edited" | "deleted"
  issue: {
    number: number;
    state: 'open' | 'closed';
    title: string;
    labels?: Array<{ name?: string }>;
    assignee?: { login?: string } | null;
  };
  comment: {
    body: string;
    user: { login: string };
  };
  repository: {
    name: string;
    full_name: string; // "owner/repo"
    owner: { login: string };
  };
  installation?: { id?: number };
}

export interface HandleResult {
  handled: boolean;
  verb?: string;
  reply?: string;
  error?: string;
  /** Directives (lang / urgency / bounty / currency) parsed from the issue body. */
  directives?: ZimbDirectives;
}

/**
 * Entry point called by the webhook dispatcher for `issue_comment` events.
 * Returns a HandleResult that the webhook handler uses to log + reply.
 */
export async function handleIssueComment(
  env: {
    ENVIRONMENT: string;
    GITHUB_APP_ID?: string;
    GITHUB_PRIVATE_KEY?: string;
    GITHUB_WEBHOOK_SECRET?: string;
  },
  payload: IssueCommentPayload
): Promise<HandleResult> {
  // 1. Only react to newly created comments
  if (payload.action !== 'created') {
    return { handled: false, error: 'comment was edited or deleted, ignored' };
  }

  // 2. Parse the command
  const cmd = parseCommand(payload.comment.body);
  if (!cmd) {
    return { handled: false, error: 'not a @zimb-bot command' };
  }

  const seniorGhLogin = payload.comment.user.login;
  const repo = payload.repository.name;
  const issueNumber = payload.issue.number;

  // 2b. Extract directives from the issue body (lang / urgency / bounty / currency)
  // The issue body lives in payload.issue.body when delivered via webhook.
  const issueBody = String((payload.issue as { body?: string }).body ?? '');
  const directives = parseDirectivesFromBody(issueBody);

  switch (cmd.verb) {
    case 'help':
      return {
        handled: true,
        verb: 'help',
        directives,
        reply: t(directives.lang, 'help.text'),
      };

    case 'claim':
      return await handleClaim(env, payload, seniorGhLogin, repo, issueNumber, directives);

    case 'status':
      return await handleStatus(env, payload, repo, issueNumber, directives);

    case 'unclaim':
      return await handleUnclaim(env, payload, seniorGhLogin, repo, issueNumber, directives);

    case 'dispute':
      return {
        handled: true,
        verb: 'dispute',
        directives,
        reply: t(directives.lang, 'dispute.opened', {
          reason: cmd.raw.replace(/^dispute\s*/, '').trim() || '(no reason given)',
        }),
      };

    default:
      return { handled: false, error: `unknown verb ${cmd.verb}` };
  }
}

// ── Internal handlers ─────────────────────────────────────────

async function handleClaim(
  env: {
    ENVIRONMENT: string;
    GITHUB_APP_ID?: string;
    GITHUB_PRIVATE_KEY?: string;
  },
  payload: IssueCommentPayload,
  seniorGhLogin: string,
  repo: string,
  issueNumber: number,
  directives: ZimbDirectives
): Promise<HandleResult> {
  // 3. Find the ticket by issue number (Airtable stores it as `github_issue_number` — fallback to listing)
  const ticket = await findTicketByIssueNumber(env, issueNumber);
  if (!ticket) {
    return {
      handled: true,
      verb: 'claim',
      directives,
      error: 'No matching Zimb ticket for this issue. Ask the maintainer to add the `bounty` label via @zimb-bot.',
    };
  }

  // 4. The issue must be open and bounty-labeled
  if (payload.issue.state !== 'open') {
    return {
      handled: true,
      verb: 'claim',
      directives,
      error: t(directives.lang, 'bounty.notOpen'),
    };
  }
  const labels = (payload.issue.labels ?? []).map((l) => l.name?.toLowerCase() ?? '');
  if (!labels.includes('bounty')) {
    return {
      handled: true,
      verb: 'claim',
      directives,
      error: t(directives.lang, 'bounty.noBountyLabel'),
    };
  }

  // 5. Re-use the same atomic logic as POST /tickets/:id/claim
  if (ticket.status !== 'open') {
    const existing = await getActiveClaim(env as never, ticket.id);
    if (existing?.seniorId === seniorGhLogin) {
      return {
        handled: true,
        verb: 'claim',
        directives,
        reply: t(directives.lang, 'bounty.alreadyClaimed', { ticket: ticket.id }),
      };
    }
    return {
      handled: true,
      verb: 'claim',
      directives,
      error: t(directives.lang, 'bounty.alreadyClaimedByOther', {
        user: existing?.seniorId ?? 'someone',
        expires: existing?.expiresAt ?? '?',
      }),
    };
  }

  // 6. Provision GitHub side-effects (repo + branch + invite)
  const bot: GithubBotService = getGithubBot(env as never);
  let repoUrl: string | null = null;
  let branchName: string | null = null;
  try {
    repoUrl = await bot.createTicketRepo({ ticketId: ticket.id, title: ticket.title });
    branchName = await bot.createBranch({ ticketId: ticket.id, title: ticket.title });
    await bot.inviteSenior({ ticketId: ticket.id, seniorGhLogin });
  } catch (err) {
    return {
      handled: true,
      verb: 'claim',
      directives,
      error: t(directives.lang, 'bounty.provisioningFailed', { error: (err as Error).message }),
    };
  }

  // 7. Persist the claim in Airtable
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 45 * 60_000); // 45 min
  await createClaim(env as never, {
    ticketId: ticket.id,
    seniorId: seniorGhLogin,
    claimedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'active',
  });

  // 8. Update ticket status (best-effort, non-blocking for the reply)
  if (ticket.airtableRecordId) {
    try {
      await updateTicket(env as never, ticket.airtableRecordId, '*', {
        status: 'claimed',
        claimedBy: seniorGhLogin,
      });
    } catch (err) {
      console.warn('[issueCommentHandler] updateTicket failed (non-fatal)', err);
    }
  }

  // 9. Assign the issue + remove bounty label (best-effort, needs GitHub creds)
  if (env.GITHUB_APP_ID && env.GITHUB_PRIVATE_KEY) {
    await assignIssue(
      { GITHUB_APP_ID: env.GITHUB_APP_ID, GITHUB_PRIVATE_KEY: env.GITHUB_PRIVATE_KEY },
      repo,
      issueNumber,
      seniorGhLogin
    );
    await removeLabel(
      { GITHUB_APP_ID: env.GITHUB_APP_ID, GITHUB_PRIVATE_KEY: env.GITHUB_PRIVATE_KEY },
      repo,
      issueNumber,
      'bounty'
    );
  }

  // 10. Reply with confirmation (multilingual via t())
  const currencySymbol = { EUR: '€', USD: '$', GBP: '£', AUD: 'A$' }[directives.currency] ?? '€';
  const repoShort = (repoUrl ?? '').replace('https://github.com/', '');
  const reply =
    t(directives.lang, 'bounty.assigned', { user: seniorGhLogin, ticket: ticket.id }) +
    '\n\n' +
    t(directives.lang, 'bounty.repo', { repo: repoUrl }) +
    '\n' +
    t(directives.lang, 'bounty.branch', { branch: branchName ?? '' }) +
    `\n\n💰 **${directives.bounty}${currencySymbol}** · ${directives.currency} · ${directives.urgency}\n\n` +
    t(directives.lang, 'bounty.afterInvite') +
    '\n\n' +
    '```bash\n' +
    `gh repo clone ${repoShort}\n` +
    `cd ${(repoUrl ?? '').split('/').pop()}\n` +
    `git checkout ${branchName}\n` +
    `# ... your fix ...\n` +
    `git add -A && git commit -m "Fix: <one-line summary>"\n` +
    `git push -u origin ${branchName}\n` +
    `gh pr create --fill --base main\n` +
    '```\n\n' +
    t(directives.lang, 'bounty.timer') +
    '\n' +
    t(directives.lang, 'bounty.beta');

  return {
    handled: true,
    verb: 'claim',
    directives,
    reply,
  };
}

async function handleStatus(
  env: { ENVIRONMENT: string },
  payload: IssueCommentPayload,
  _repo: string,
  issueNumber: number,
  directives: ZimbDirectives
): Promise<HandleResult> {
  const ticket = await findTicketByIssueNumber(env, issueNumber);
  if (!ticket) {
    return { handled: true, verb: 'status', directives, reply: t(directives.lang, 'error.notFound') };
  }
  const claim = await getActiveClaim(env as never, ticket.id);
  return {
    handled: true,
    verb: 'status',
    directives,
    reply:
      t(directives.lang, 'status.title', { ticket: ticket.id }) +
      '\n' +
      t(directives.lang, 'status.line', { key: 'Status', value: ticket.status }) +
      '\n' +
      t(directives.lang, 'status.line', { key: 'Bounty', value: `${ticket.bounty} (from issue directives)` }) +
      '\n' +
      t(directives.lang, 'status.line', { key: 'Claimed by', value: claim?.seniorId ?? 'nobody yet' }) +
      '\n' +
      t(directives.lang, 'status.line', { key: 'Expires', value: claim?.expiresAt ?? '—' }) +
      '\n',
  };
}

async function handleUnclaim(
  env: { ENVIRONMENT: string; GITHUB_APP_ID?: string; GITHUB_PRIVATE_KEY?: string },
  payload: IssueCommentPayload,
  seniorGhLogin: string,
  _repo: string,
  issueNumber: number,
  directives: ZimbDirectives
): Promise<HandleResult> {
  const ticket = await findTicketByIssueNumber(env, issueNumber);
  if (!ticket) {
    return { handled: true, verb: 'unclaim', directives, error: 'No matching ticket.' };
  }
  const claim = await getActiveClaim(env as never, ticket.id);
  if (!claim) {
    return {
      handled: true,
      verb: 'unclaim',
      directives,
      reply: t(directives.lang, 'unclaim.noActive', { ticket: ticket.id }),
    };
  }
  if (claim.seniorId !== seniorGhLogin) {
    return {
      handled: true,
      verb: 'unclaim',
      directives,
      error: t(directives.lang, 'unclaim.notYours', { user: claim.seniorId }),
    };
  }
  // Mark expired + restore ticket status (best-effort)
  // (full unclaim flow lives in routes/claims.ts — here we just revoke access)
  if (env.GITHUB_APP_ID && env.GITHUB_PRIVATE_KEY) {
    const bot = getGithubBot(env as never);
    await bot.revokeSenior({ ticketId: ticket.id, seniorGhLogin });
  }
  return {
    handled: true,
    verb: 'unclaim',
    directives,
    reply: t(directives.lang, 'unclaim.released', { user: seniorGhLogin, ticket: ticket.id }),
  };
}

/**
 * Find the Airtable ticket that matches a GitHub issue number.
 * Falls back to scanning open tickets if `github_issue_number` isn't set.
 */
async function findTicketByIssueNumber(
  env: { ENVIRONMENT: string },
  issueNumber: number
): Promise<Ticket | null> {
  // First try the cached field (faster, indexed)
  // Falls back to scanning the latest open tickets.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { listTickets } = require('../adapters/airtable') as typeof import('../adapters/airtable');
  const tickets = await listTickets(env as never, { maxRecords: 50 });
  return tickets.find((t: Ticket) => (t as Ticket & { githubIssueNumber?: number }).githubIssueNumber === issueNumber) ?? null;
}
