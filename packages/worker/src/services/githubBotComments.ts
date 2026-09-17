/**
 * githubBotComments.ts — Posts comments / assignees on a GitHub issue.
 *
 * Lightweight wrapper around Octokit for the few operations the bot needs
 * beyond repo creation:
 *   - Reply to a comment with a Markdown message
 *   - Assign an issue to a user (the @zimb-bot claimer)
 *
 * This module uses the same `installationId` discovery as `githubBot.real.ts`
 * but lives separately so it stays tiny and testable.
 *
 * NOTE: Like `githubBot.real.ts`, this loads `octokit` lazily and only in
 * Node-side contexts (NOT in the Worker fetch path). The webhook handler
 * uses these via dynamic require when GITHUB_APP_ID is set.
 */
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';

const GH_OWNER = process.env.GH_OWNER ?? 'Zimb';

async function getInstallationOctokit(env: {
  GITHUB_APP_ID: string;
  GITHUB_PRIVATE_KEY: string;
}): Promise<Octokit> {
  // Re-use the cached logic from githubBot.real.ts if possible.
  // Otherwise build a fresh installation-scoped Octokit.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createOctokitGithubBot } = require('../adapters/githubBot.real') as typeof import('../adapters/githubBot.real');
  // We only need the underlying octokit for raw calls; use a temporary bot
  // just to get its installation octokit, then call free endpoints.
  const bot = createOctokitGithubBot(env) as unknown as {
    getInstallationOctokit?: () => Promise<Octokit>;
  };
  if (typeof bot.getInstallationOctokit === 'function') {
    return bot.getInstallationOctokit();
  }
  // Fallback: build fresh app-authenticated octokit
  const appOctokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
  });
  // Try the repo-scoped installation endpoint
  try {
    const { data } = await appOctokit.request('GET /repos/{owner}/{repo}/installation', {
      owner: GH_OWNER,
      repo: 'zimb',
      headers: { 'X-GitHub-Api-Version': '2022-11-28' },
    });
    const id = (data as { id: number }).id;
    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: env.GITHUB_APP_ID,
        privateKey: env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n'),
        installationId: id,
      },
    });
  } catch {
    const { data } = await appOctokit.request('GET /orgs/{org}/installation', {
      org: GH_OWNER,
      headers: { 'X-GitHub-Api-Version': '2022-11-28' },
    });
    const id = (data as { id: number }).id;
    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: env.GITHUB_APP_ID,
        privateKey: env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n'),
        installationId: id,
      },
    });
  }
}

/**
 * Post a Markdown comment on an issue.
 * Silent on transient errors (we don't want a webhook failure to spam logs).
 */
export async function postIssueComment(
  env: { GITHUB_APP_ID: string; GITHUB_PRIVATE_KEY: string },
  repo: string,
  issueNumber: number,
  body: string
): Promise<void> {
  try {
    const octokit = await getInstallationOctokit(env);
    await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner: GH_OWNER,
      repo,
      issue_number: issueNumber,
      body,
      headers: { 'X-GitHub-Api-Version': '2022-11-28' },
    } as never);
  } catch (err) {
    console.warn('[githubBotComments] postIssueComment failed', err);
  }
}

/**
 * Assign an issue to a user. Idempotent (GitHub silently ignores re-assigns).
 */
export async function assignIssue(
  env: { GITHUB_APP_ID: string; GITHUB_PRIVATE_KEY: string },
  repo: string,
  issueNumber: number,
  assignee: string
): Promise<void> {
  try {
    const octokit = await getInstallationOctokit(env);
    await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/assignees', {
      owner: GH_OWNER,
      repo,
      issue_number: issueNumber,
      assignees: [assignee],
      headers: { 'X-GitHub-Api-Version': '2022-11-28' },
    } as never);
  } catch (err) {
    console.warn('[githubBotComments] assignIssue failed', err);
  }
}

/**
 * Remove the `bounty` label from an issue (best-effort).
 */
export async function removeLabel(
  env: { GITHUB_APP_ID: string; GITHUB_PRIVATE_KEY: string },
  repo: string,
  issueNumber: number,
  label: string
): Promise<void> {
  try {
    const octokit = await getInstallationOctokit(env);
    await octokit.request('DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}', {
      owner: GH_OWNER,
      repo,
      issue_number: issueNumber,
      name: label,
      headers: { 'X-GitHub-Api-Version': '2022-11-28' },
    } as never);
  } catch {
    // 404 = label not present, fine.
  }
}
