/**
 * Zimb VS Code Extension — entry point
 *
 * Registers the `@zimb` chat participant and the side-panel form.
 * See SPECIFICATIONS.md §3.3 for full behavior.
 */
import * as vscode from 'vscode';
import { registerChatParticipant } from './chat/participant';
import { registerCommands } from './commands';
import { GitHubAuthService } from './auth/github';
import { ApiClient } from './services/apiClient';
import { LanguageDetector } from './services/languageDetector';
import { RepoDetector } from './services/repoDetector';

let authService: GitHubAuthService;
let apiClient: ApiClient;
let languageDetector: LanguageDetector;
let repoDetector: RepoDetector;

export async function activate(context: vscode.ExtensionContext) {
  console.log('[zimb] extension activating');

  // ── Services ─────────────────────────────────────────────────
  authService = new GitHubAuthService(context);
  apiClient = new ApiClient(
    vscode.workspace.getConfiguration('zimb').get('api.baseUrl') ?? 'https://api.zimb.app',
    authService
  );
  languageDetector = new LanguageDetector();
  repoDetector = new RepoDetector();

  // ── Chat participant ─────────────────────────────────────────
  registerChatParticipant(context, apiClient, languageDetector, repoDetector);

  // ── Commands (palette + menu) ────────────────────────────────
  registerCommands(context, apiClient, languageDetector, repoDetector);

  console.log('[zimb] extension activated');
}

export function deactivate() {
  // All disposables are added to context.subscriptions — auto-cleaned
  console.log('[zimb] extension deactivated');
}
