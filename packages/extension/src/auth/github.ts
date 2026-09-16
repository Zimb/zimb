import type * as vscode from 'vscode';

/**
 * Wraps vscode.authentication.getSession for GitHub OAuth.
 * Token is stored in SecretStorage (never plain text).
 *
 * See SPECIFICATIONS.md §3.3 + recettes/01-creation-ticket.md (CT-VSC-01).
 */
export class GitHubAuthService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async getSession(): Promise<vscode.AuthenticationSession | undefined> {
    return vscode.authentication.getSession('github', ['repo', 'read:user'], {
      createIfNone: true,
    });
  }

  async getAccessToken(): Promise<string | undefined> {
    const session = await this.getSession();
    return session?.accessToken;
  }

  async logout(): Promise<void> {
    // The VS Code auth API handles session invalidation.
    // We just clear any locally cached state here.
    await this.context.globalState.update('zimb.lastLoginAt', undefined);
  }
}
