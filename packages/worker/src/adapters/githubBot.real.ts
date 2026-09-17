/**
 * githubBot.real.ts — Real Octokit-backed implementation of @zimb-bot
 *
 * Skill reference: .github/skills/github-apps-zimb-bot/SKILL.md
 *
 * Uses @octokit/auth-app directly (not the `octokit` App class) so we can
 * pass the installation ID explicitly per-call.
 *
 * IMPORTANT: This module uses node:crypto (NOT Web Crypto) because
 * @octokit/auth-app requires Node-style PEM parsing. It MUST be loaded
 * only on the Node-side (i.e. scripts or local dev), NOT inside a Worker
 * fetch handler. The Worker path uses the StubGithubBot.
 */
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import type {
  CreateTicketRepoInput,
  InviteSeniorInput,
  GithubBotService,
} from './githubBot';

const GH_OWNER = process.env.GH_OWNER ?? 'Zimb'; // overridable via env (smoke tests can target any repo)

export class OctokitGithubBot implements GithubBotService {
  private readonly appId: string;
  private readonly privateKey: string;
  private installationIdPromise: Promise<number> | null = null;
  private ownerKindPromise: Promise<'org' | 'user'> | null = null;

  constructor(private readonly env: {
    GITHUB_APP_ID: string;
    GITHUB_PRIVATE_KEY: string;
    GITHUB_WEBHOOK_SECRET?: string;
  }) {
    this.appId = env.GITHUB_APP_ID;
    this.privateKey = env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n');
  }

  /**
   * Build an installation-scoped Octokit for a specific installation.
   */
  private async getInstallationOctokit(): Promise<Octokit> {
    const installationId = await this.getInstallationId();
    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: this.appId,
        privateKey: this.privateKey,
        installationId,
      },
    });
  }

  /**
   * Detect whether GH_OWNER is a User or an Organization.
   * Cached per instance. Defaults to 'org' if detection fails (legacy).
   */
  private async getOwnerKind(): Promise<'org' | 'user'> {
    if (!this.ownerKindPromise) {
      this.ownerKindPromise = (async () => {
        const octokit = await this.getInstallationOctokit();
        try {
          const { data } = await octokit.request('GET /users/{username}', {
            username: GH_OWNER,
            headers: { 'X-GitHub-Api-Version': '2022-11-28' },
          });
          return ((data as { type: string }).type === 'Organization' ? 'org' : 'user') as 'org' | 'user';
        } catch {
          return 'org' as const;
        }
      })();
    }
    return this.ownerKindPromise;
  }

  /**
   * Fetch the installation ID for the target repo (or org). Cached per instance.
   *
   * We use `GET /repos/{owner}/{repo}/installation` which works for both
   * org-owned and user-owned installations, and doesn't require guessing
   * the org slug. This is the modern, reliable endpoint.
   *
   * Falls back to `GET /orgs/{org}/installation` if repo path fails
   * (in case GH_ORG is itself the installation target).
   */
  private async getInstallationId(): Promise<number> {
    if (!this.installationIdPromise) {
      this.installationIdPromise = (async () => {
        const appOctokit = new Octokit({
          authStrategy: createAppAuth,
          auth: { appId: this.appId, privateKey: this.privateKey },
        });
        // Try the repo-scoped endpoint first
        try {
          const { data } = await appOctokit.request(
            'GET /repos/{owner}/{repo}/installation',
            {
              owner: GH_OWNER,
              repo: 'zimb', // known repo where the App is installed
              headers: { 'X-GitHub-Api-Version': '2022-11-28' },
            }
          );
          const id = (data as { id: number }).id;
          if (typeof id === 'number') return id;
        } catch {
          // Fall through to org-scoped lookup
        }
        // Fallback: org-level installation
        const { data } = await appOctokit.request(
          'GET /orgs/{org}/installation',
          {
            org: GH_OWNER,
            headers: { 'X-GitHub-Api-Version': '2022-11-28' },
          }
        );
        const id = (data as { id: number }).id;
        if (typeof id !== 'number') {
          throw new Error(`No GitHub App installation found for ${GH_OWNER}`);
        }
        return id;
      })();
    }
    return this.installationIdPromise;
  }

  async createTicketRepo(input: CreateTicketRepoInput): Promise<string> {
    const repoName = `zimb-${input.ticketId}`;
    const octokit = await this.getInstallationOctokit();
    const kind = await this.getOwnerKind();
    // Octokit's typed request signatures don't allow dynamic method names,
    // so we route through `request` with a wider param type.
    const baseParams = {
      name: repoName,
      private: true,
      description: `Zimb ticket ${input.ticketId} — ${input.title}`,
      auto_init: true,
      headers: { 'X-GitHub-Api-Version': '2022-11-28' },
    } as const;
    try {
      // Octokit's typed request signatures don't model polymorphic routes,
      // so we route through `request` with a `never` cast for the param type.
      const res = kind === 'org'
        ? await octokit.request('POST /orgs/{org}/repos', { org: GH_OWNER, ...baseParams } as never)
        : await octokit.request('POST /user/repos', baseParams as never);
      return (res.data as { html_url: string }).html_url;
    } catch (err) {
      if ((err as { status?: number }).status === 422) {
        const existing = await octokit.request('GET /repos/{owner}/{repo}', {
          owner: GH_OWNER,
          repo: repoName,
          headers: { 'X-GitHub-Api-Version': '2022-11-28' },
        });
        return (existing.data as { html_url: string }).html_url;
      }
      throw err;
    }
  }

  async createBranch(input: CreateTicketRepoInput): Promise<string> {
    const repoName = process.env.GH_TEST_REPO ?? `zimb-${input.ticketId}`;
    const branchName = `zimb/${input.ticketId}`;
    const octokit = await this.getInstallationOctokit();
    try {
      const mainRef = await octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
        owner: GH_OWNER,
        repo: repoName,
        ref: 'heads/main',
        headers: { 'X-GitHub-Api-Version': '2022-11-28' },
      });
      const sha = (mainRef.data as { object: { sha: string } }).object.sha;
      await octokit.request('POST /repos/{owner}/{repo}/git/refs', {
        owner: GH_OWNER,
        repo: repoName,
        ref: `refs/heads/${branchName}`,
        sha,
        headers: { 'X-GitHub-Api-Version': '2022-11-28' },
      });
      return branchName;
    } catch (err) {
      if ((err as { status?: number }).status === 422) return branchName;
      throw err;
    }
  }

  async inviteSenior(input: InviteSeniorInput): Promise<void> {
    const repoName = process.env.GH_TEST_REPO ?? `zimb-${input.ticketId}`;
    const octokit = await this.getInstallationOctokit();
    try {
      await octokit.request('PUT /repos/{owner}/{repo}/collaborators/{username}', {
        owner: GH_OWNER,
        repo: repoName,
        username: input.seniorGhLogin,
        permission: 'push',
        headers: { 'X-GitHub-Api-Version': '2022-11-28' },
      });
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 422 || status === 204) return;
      throw err;
    }
  }

  async revokeSenior(input: InviteSeniorInput): Promise<void> {
    const repoName = process.env.GH_TEST_REPO ?? `zimb-${input.ticketId}`;
    const octokit = await this.getInstallationOctokit();
    try {
      await octokit.request('DELETE /repos/{owner}/{repo}/collaborators/{username}', {
        owner: GH_OWNER,
        repo: repoName,
        username: input.seniorGhLogin,
        headers: { 'X-GitHub-Api-Version': '2022-11-28' },
      });
    } catch (err) {
      if ((err as { status?: number }).status === 404) return;
      throw err;
    }
  }
}

export function createOctokitGithubBot(env: {
  GITHUB_APP_ID: string;
  GITHUB_PRIVATE_KEY: string;
  GITHUB_WEBHOOK_SECRET?: string;
}): GithubBotService {
  return new OctokitGithubBot(env);
}
