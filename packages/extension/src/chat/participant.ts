import * as vscode from 'vscode';
import type { ApiClient } from '../services/apiClient';
import type { LanguageDetector } from '../services/languageDetector';
import type { RepoDetector } from '../services/repoDetector';

/**
 * Registers the `@zimb` chat participant.
 *
 * See SPECIFICATIONS.md §3.3 + recettes/01-creation-ticket.md (CT-VSC-01).
 */
export function registerChatParticipant(
  context: vscode.ExtensionContext,
  apiClient: ApiClient,
  languageDetector: LanguageDetector,
  repoDetector: RepoDetector
): void {
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    _context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    _token: vscode.CancellationToken
  ) => {
    if (request.command === 'submit') {
      stream.markdown('🎯 Opening the Zimb submission form…');
      await vscode.commands.executeCommand('zimb.openForm');
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

    // Default: open the form pre-filled with the chat prompt
    stream.markdown('📝 Let me open the form so you can describe your bug…');
    await vscode.commands.executeCommand('zimb.openForm', {
      prompt: request.prompt,
    });
  };

  const participant = vscode.chat.createChatParticipant('zimb', handler);
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'assets', 'zimb.png');

  context.subscriptions.push(participant);
}
