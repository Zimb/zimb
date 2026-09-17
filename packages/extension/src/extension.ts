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
import { IssueCreator } from './services/issueCreator';
import { BountiesProvider, BountyIssue } from './bountiesProvider';

let authService: GitHubAuthService;
let apiClient: ApiClient;
let languageDetector: LanguageDetector;
let repoDetector: RepoDetector;
let issueCreator: IssueCreator;
let bountiesProvider: BountiesProvider;

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
  issueCreator = new IssueCreator(authService, languageDetector, repoDetector);

  // ── Sidebar: Bounties tree view ──────────────────────────────
  bountiesProvider = new BountiesProvider(authService, issueCreator, context);
  const treeView = vscode.window.createTreeView('zimb.bounties', {
    treeDataProvider: bountiesProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(treeView);
  void bountiesProvider.bootstrap();
  context.subscriptions.push(
    vscode.commands.registerCommand('zimb.refreshBounties', () => bountiesProvider.refresh())
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('zimb.openBounty', (issue: BountyIssue) => {
      vscode.env.openExternal(vscode.Uri.parse(issue.htmlUrl));
    })
  );

  // ── Chat participant ─────────────────────────────────────────
  registerChatParticipant(context, apiClient, languageDetector, repoDetector, issueCreator, bountiesProvider);

  // ── Commands (palette + menu) ────────────────────────────────
  registerCommands(context, apiClient, languageDetector, repoDetector, authService, issueCreator);

  console.log('[zimb] extension activated');
}

export function deactivate() {
  // All disposables are added to context.subscriptions — auto-cleaned
  console.log('[zimb] extension deactivated');
}
