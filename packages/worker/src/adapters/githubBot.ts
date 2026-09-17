/**
 * GitHub Bot adapter — M3.2
 *
 * Skill reference: .github/skills/github-apps-zimb-bot/SKILL.md
 *
 * Defines the CONTRACT the backend depends on, plus a no-op `StubGithubBot`
 * for unit tests and the Worker fetch path (which can't load Node-only
 * `octokit`).
 *
 * Real production wiring (scripts, Node-side verification):
 *   import { createOctokitGithubBot } from './githubBot.real';
 *   const bot = createOctokitGithubBot(env);
 */

export interface CreateTicketRepoInput {
  ticketId: string;
  title: string;
}

export interface InviteSeniorInput {
  ticketId: string;
  seniorGhLogin: string;
}

/**
 * Backend-facing contract for @zimb-bot operations.
 */
export interface GithubBotService {
  /**
   * Create a private repo `zimb-<ticketId>` under the org.
   * @returns the GitHub repo URL (e.g. https://github.com/Zimb/zimb-T-0001)
   */
  createTicketRepo(input: CreateTicketRepoInput): Promise<string>;

  /**
   * Create the working branch `zimb/<ticketId>` from `main`.
   * Idempotent. @returns the branch name.
   */
  createBranch(input: CreateTicketRepoInput): Promise<string>;

  /**
   * Invite a senior as collaborator with permission `push` (NEVER admin/maintain).
   * Idempotent: returns silently if already invited.
   */
  inviteSenior(input: InviteSeniorInput): Promise<void>;

  /**
   * Revoke a senior's access. Silent on 404 (already revoked).
   */
  revokeSenior(input: InviteSeniorInput): Promise<void>;
}

/**
 * No-op implementation used in unit tests, dev mode, and the Worker fetch
 * path (which doesn't have Node.js crypto loaded).
 */
export class StubGithubBot implements GithubBotService {
  async createTicketRepo(input: CreateTicketRepoInput): Promise<string> {
    console.log(`[github-bot:STUB] createTicketRepo ${input.ticketId}`);
    return `https://github.com/Zimb/zimb-${input.ticketId}`;
  }
  async createBranch(input: CreateTicketRepoInput): Promise<string> {
    console.log(`[github-bot:STUB] createBranch zimb/${input.ticketId}`);
    return `zimb/${input.ticketId}`;
  }
  async inviteSenior(input: InviteSeniorInput): Promise<void> {
    console.log(`[github-bot:STUB] inviteSenior ${input.ticketId} → ${input.seniorGhLogin}`);
  }
  async revokeSenior(input: InviteSeniorInput): Promise<void> {
    console.log(`[github-bot:STUB] revokeSenior ${input.ticketId} → ${input.seniorGhLogin}`);
  }
}

/**
 * Factory — returns the appropriate implementation based on env.
 *
 * - If `GITHUB_APP_ID` + a valid PEM `GITHUB_PRIVATE_KEY` are present →
 *   returns a real Octokit-backed bot. Used by scripts and the `verify:github:bot`
 *   command.
 * - Otherwise → falls back to StubGithubBot (used in Worker fetch path and tests).
 *
 * IMPORTANT: callers that need real GitHub operations MUST catch the
 * "missing env" error from the real bot and fall back to the stub.
 */
export function getGithubBot(env: {
  ENVIRONMENT: string;
  GITHUB_APP_ID?: string;
  GITHUB_PRIVATE_KEY?: string;
  GITHUB_WEBHOOK_SECRET?: string;
}): GithubBotService {
  if (env.GITHUB_APP_ID && env.GITHUB_PRIVATE_KEY?.includes('-----BEGIN')) {
    // Lazy import — avoids pulling octokit into the Worker bundle.
    // The real bot is only instantiated in Node-side contexts (scripts,
    // tests, the `verify:github:bot` command).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createOctokitGithubBot } = require('./githubBot.real') as typeof import('./githubBot.real');
    return createOctokitGithubBot({
      GITHUB_APP_ID: env.GITHUB_APP_ID,
      GITHUB_PRIVATE_KEY: env.GITHUB_PRIVATE_KEY,
      ...(env.GITHUB_WEBHOOK_SECRET ? { GITHUB_WEBHOOK_SECRET: env.GITHUB_WEBHOOK_SECRET } : {}),
    });
  }
  return new StubGithubBot();
}
