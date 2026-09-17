import type * as vscode from 'vscode';

/**
 * Wraps vscode.authentication.getSession for GitHub OAuth.
 * Token is stored in SecretStorage (never plain text).
 *
 * See SPECIFICATIONS.md §3.3 + recettes/01-creation-ticket.md (CT-VSC-01).
 *
 * IMPORTANT: we DON'T use `globalThis.vscode` (doesn't exist in extension host).
 * Instead, the `vscode` module is required at runtime inside the bundled
 * `extension.js` (esbuild resolves `--external:vscode` to the host API).
 */
export class GitHubAuthService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async getSession(): Promise<vscode.AuthenticationSession | undefined> {
    // Lazy-require vscode so this module doesn't break in node test contexts.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const api = require('vscode') as typeof vscode;
    return api.authentication.getSession('github', ['repo', 'read:user'], {
      createIfNone: true,
    });
  }

  async getAccessToken(): Promise<string | undefined> {
    const session = await this.getSession();
    return session?.accessToken;
  }

  async logout(): Promise<void> {
    await this.context.globalState.update('zimb.lastLoginAt', undefined);
  }
}
