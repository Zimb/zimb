import * as vscode from 'vscode';
import type { ApiClient } from './services/apiClient';
import type { LanguageDetector } from './services/languageDetector';
import type { RepoDetector } from './services/repoDetector';
import type { GitHubAuthService } from './auth/github';
import type { IssueCreator } from './services/issueCreator';

/**
 * Registers all commands contributed by package.json.
 *
 * V2: command `zimb.claimIssue` now uses the current workspace's repo (or an
 * explicit owner/repo passed as argument). It uses the user's GitHub token
 * (NOT the bot) to post the `@zimb-bot claim` comment.
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  _apiClient: ApiClient,
  _languageDetector: LanguageDetector,
  _repoDetector: RepoDetector,
  _authService: GitHubAuthService,
  issueCreator: IssueCreator
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('zimb.openForm', async (args?: { prompt?: string }) => {
      // TODO: open the side-panel webview with prefilled form
      vscode.window.showInformationMessage(
        `Zimb form would open here (prompt: ${args?.prompt ?? 'none'}). Skeleton ready.`
      );
    }),

    vscode.commands.registerCommand('zimb.login', async () => {
      // TODO: trigger GitHub OAuth via vscode.authentication API
      vscode.window.showInformationMessage('Zimb login skeleton — wire to GitHub OAuth.');
    }),

    vscode.commands.registerCommand('zimb.logout', async () => {
      // TODO: clear secret storage
      vscode.window.showInformationMessage('Zimb logout skeleton.');
    }),

    /**
     * Claim a Zimb issue by commenting `@zimb-bot claim` on it.
     * Resolves the repo from the current workspace if not provided.
     */
    vscode.commands.registerCommand(
      'zimb.claimIssue',
      async (arg?: { number?: number; owner?: string; repo?: string }) => {
        const number = arg?.number;
        if (!number || typeof number !== 'number') {
          vscode.window.showErrorMessage(
            'Usage: pass `{ number }` from a banner or call `zimb.claimIssueInteractive`.'
          );
          return;
        }
        try {
          const target = arg?.owner && arg?.repo
            ? { owner: arg.owner, repo: arg.repo }
            : await issueCreator.resolveTargetRepo();
          await issueCreator.claimIssue(target, number);
          vscode.window.showInformationMessage(
            `✅ Claim sent for ${target.owner}/${target.repo}#${number}. The bot will assign you shortly.`
          );
        } catch (err) {
          vscode.window.showErrorMessage(`Claim failed: ${(err as Error).message}`);
        }
      }
    ),

    vscode.commands.registerCommand('zimb.claimIssueInteractive', async () => {
      const ownerInput = await vscode.window.showInputBox({
        prompt: 'Owner of the repo (defaults to current workspace)',
        placeHolder: 'Zimb',
      });
      const repoInput = await vscode.window.showInputBox({
        prompt: 'Repo name',
        placeHolder: 'zimb',
      });
      const numberInput = await vscode.window.showInputBox({
        prompt: 'Issue number to claim',
        placeHolder: '42',
        validateInput: (v) =>
          /^\d+$/.test(v.trim()) ? undefined : 'Enter a numeric issue number',
      });
      if (!numberInput) return;
      const number = Number.parseInt(numberInput.trim(), 10);
      if (!Number.isFinite(number)) return;

      try {
        const target = ownerInput && repoInput
          ? { owner: ownerInput.trim(), repo: repoInput.trim() }
          : await issueCreator.resolveTargetRepo();
        await issueCreator.claimIssue(target, number);
        vscode.window.showInformationMessage(
          `✅ Claim sent for ${target.owner}/${target.repo}#${number}.`
        );
      } catch (err) {
        vscode.window.showErrorMessage(`Claim failed: ${(err as Error).message}`);
      }
    })
  );
}
