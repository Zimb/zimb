import * as vscode from 'vscode';
import type { ApiClient } from '../services/apiClient';
import type { LanguageDetector } from '../services/languageDetector';
import type { RepoDetector } from '../services/repoDetector';
import type { IssueCreator } from '../services/issueCreator';
import { notifyNewIssue } from '../commands/issueNotifier';
import type { BountiesProvider, BountyIssue, BountyStatus } from '../bountiesProvider';
import { composeIssueViaModel, composeIssueFallback } from './issueBuilder';
import type { StructuredIssue } from './issueBuilder.types';

/**
 * Registers the `@zimb` chat participant.
 *
 * Commands:
 *   - `@zimb <problem>`    → open the side-panel form pre-filled
 *   - `@zimb /submit`      → open the form (explicit)
 *   - `@zimb /status T-X`  → read ticket status via api.zimb.app
 *   - `@zimb /bounties`    → list all bounties in the current repo (sidebar mirror)
 *   - `@zimb /issue ...`   → publish the chat as a GitHub Issue (V2 per-repo loop)
 *
 * See SPECIFICATIONS.md §3.3 + .github/skills/vscode-chat-extensions/SKILL.md.
 */
export function registerChatParticipant(
  context: vscode.ExtensionContext,
  apiClient: ApiClient,
  languageDetector: LanguageDetector,
  repoDetector: RepoDetector,
  issueCreator: IssueCreator,
  bountiesProvider?: BountiesProvider
): void {
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    _context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    _token: vscode.CancellationToken
  ) => {
    if (request.command === 'submit') {
      stream.markdown('🎯 Opening the Zimb submission form…');
      await vscode.commands.executeCommand('zimb.openForm', { prompt: request.prompt });
      return;
    }

    if (request.command === 'status') {
      const ticketId = request.prompt.trim();
      if (!ticketId) {
        stream.markdown('Usage: `@zimb /status T-1234`');
        return;
      }
      try {
        const ticket = await apiClient.getTicket(ticketId);
        stream.markdown(
          `**Ticket ${ticket.id}**\n` +
            `- Status: \`${ticket.status}\`\n` +
            `- Bounty: ${ticket.bounty}€\n` +
            `- Claimed by: ${ticket.claimedBy ?? 'nobody yet'}\n`
        );
      } catch (err) {
        stream.markdown(`❌ Could not fetch ticket ${ticketId}: ${(err as Error).message}`);
      }
      return;
    }

    // /bounties → list all bounties in the current repo (sidebar mirror)
    if (request.command === 'bounties') {
      if (!bountiesProvider) {
        stream.markdown('❌ Bounties sidebar is not active in this workspace.');
        return;
      }
      stream.progress('Fetching bounties from GitHub…');
      await bountiesProvider.refresh();
      const snapshot = bountiesProvider.getSnapshot();
      if (snapshot.length === 0) {
        stream.markdown(
          '_No bounties found in this repo._\n\n' +
            'Use `@zimb /issue <description>` to publish the first one.'
        );
        return;
      }
      stream.markdown(formatBountySummary(snapshot));
      return;
    }

    // /issue → publish a GitHub Issue on the **current workspace's repo**.
    if (request.command === 'issue') {
      const prompt = request.prompt.trim();
      if (!prompt) {
        stream.markdown(
          'Usage: `@zimb /issue <problem description>` — opens a bounty on the current repo.'
        );
        return;
      }
      const editor = vscode.window.activeTextEditor;
      const selectedText =
        editor?.selection && !editor.selection.isEmpty
          ? editor.document.getText(editor.selection)
          : undefined;

      // ── Compose via LLM (Copilot chat model) with a deterministic fallback ──
      stream.progress('Composing structured ticket via Copilot…');
      let composed: StructuredIssue = composeIssueFallback(prompt);
      let usedFallback = true;
      if (request.model && Array.isArray((request.model as { family?: unknown }).family)) {
        try {
          const llm = await composeIssueViaModel(request.model, prompt, { ...(selectedText ? { selectedText } : {}) });
          if (llm) {
            composed = llm;
            usedFallback = false;
          }
        } catch {
          // fall through to deterministic fallback
        }
      }
      if (usedFallback) {
        stream.markdown('_(No Copilot model available — using fallback template.)_');
      } else {
        stream.markdown(
          `✨ LLM composed: kind=**${composed.kind}**, suggested bounty **${composed.bounty}€**, urgency **${composed.urgency}**\n`
        );
      }

      stream.progress('Publishing bounty to GitHub…');
      try {
        const issue = await issueCreator.create({
          chatPrompt: prompt,
          structured: composed,
          ...(selectedText ? { selectedText } : {}),
        });
        stream.markdown(
          `✅ Bounty published on **[${issue.owner}/${issue.repo}](https://github.com/${issue.owner}/${issue.repo})**: ` +
            `[#${issue.number} ${issue.title}](${issue.htmlUrl})\n\n` +
            `Click the banner below to open it or claim it.`
        );
        void notifyNewIssue({
          number: issue.number,
          title: issue.title,
          htmlUrl: issue.htmlUrl,
          owner: issue.owner,
          repo: issue.repo,
        });
      } catch (err) {
        stream.markdown(`❌ Could not publish issue: ${(err as Error).message}`);
      }
      return;
    }

    // Default: open the form pre-filled with the chat prompt
    stream.markdown('📝 Let me open the form so you can describe your bug…');
    await vscode.commands.executeCommand('zimb.openForm', { prompt: request.prompt });
  };

  const participant = vscode.chat.createChatParticipant('zimb', handler);
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'assets', 'zimb.png');

  context.subscriptions.push(participant);
}

/**
 * Format a list of bounties into a chat-friendly markdown summary.
 */
function formatBountySummary(bounties: BountyIssue[]): string {
  const statusIcon: Record<BountyStatus, string> = {
    open: '🟢',
    claimed: '🟡',
    delivered: '🚀',
    closed: '✅',
  };
  const byStatus: Record<BountyStatus, BountyIssue[]> = {
    open: [],
    claimed: [],
    delivered: [],
    closed: [],
  };
  for (const b of bounties) byStatus[b.status].push(b);

  const first = bounties[0];
  const ownerRepo = first ? `${first.owner}/${first.repo}` : 'this repo';

  let md = `### 🎯 Bounties in **${ownerRepo}**\n\n`;
  for (const status of ['open', 'claimed', 'delivered', 'closed'] as BountyStatus[]) {
    const list = byStatus[status];
    if (list.length === 0) continue;
    md += `\n**${statusIcon[status]} ${status.toUpperCase()}** (${list.length})\n`;
    for (const b of list) {
      const age = relativeTime(b.updatedAt);
      const firstAssignee = b.assignees[0];
      const assignee = firstAssignee ? ` → @${firstAssignee}` : '';
      const bounty = b.bounty !== undefined ? ` · **${b.bounty}€**` : '';
      md += `- [#${b.number} ${b.title}](${b.htmlUrl})${bounty}${assignee} _(${age})_\n`;
    }
  }
  return md;
}

/**
 * Compact relative-time formatter (English, vscode-locale-free).
 */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  return `${mo}mo ago`;
}
