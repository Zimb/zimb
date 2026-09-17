/**
 * issueNotifier.ts — VS Code-native notification banner for new Zimb issues.
 *
 * Uses `vscode.window.showInformationMessage` with action buttons so the user
 * can (a) open the issue, (b) claim it (also opens the issue — claim itself is
 * done by commenting `@zimb-bot claim` via the IssueCreator).
 *
 * Skill reference: .github/skills/vscode-chat-extensions/SKILL.md
 */
import * as vscode from 'vscode';

export interface IssueNotification {
  number: number;
  title: string;
  htmlUrl: string;
  owner: string;
  repo: string;
}

/**
 * Show a banner for a freshly created issue. Returns the action the user picked,
 * or `undefined` if dismissed.
 */
export async function notifyNewIssue(
  issue: IssueNotification
): Promise<'open' | 'claim' | 'dismiss' | undefined> {
  const choice = await vscode.window.showInformationMessage(
    `🎯 Zimb bounty #${issue.number} published on ${issue.owner}/${issue.repo}: ${issue.title}`,
    { modal: false, detail: 'Click to view, or claim if you want to take it.' },
    'Open issue',
    'Claim it',
    'Dismiss'
  );
  switch (choice) {
    case 'Open issue':
      await vscode.env.openExternal(vscode.Uri.parse(issue.htmlUrl));
      return 'open';
    case 'Claim it':
      await vscode.env.openExternal(vscode.Uri.parse(issue.htmlUrl));
      return 'claim';
    default:
      return 'dismiss';
  }
}
