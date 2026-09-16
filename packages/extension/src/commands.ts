import * as vscode from 'vscode';
import type { ApiClient } from './services/apiClient';
import type { LanguageDetector } from './services/languageDetector';
import type { RepoDetector } from './services/repoDetector';

/**
 * Registers all commands contributed by package.json.
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  _apiClient: ApiClient,
  _languageDetector: LanguageDetector,
  _repoDetector: RepoDetector
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
    })
  );
}
