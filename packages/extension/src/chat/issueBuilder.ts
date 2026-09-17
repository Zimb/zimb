/**
 * issueBuilder.ts — LLM-powered GitHub Issue composer.
 *
 * Asks the user's active Copilot chat model to turn a free-form chat prompt
 * into a STRUCTURED ticket ready to render through bountyRenderer.ts.
 *
 * Pure logic (parser + fallback) lives in `issueBuilder.types.ts` so it can
 * be unit-tested without the `vscode` runtime.
 */
import * as vscode from 'vscode';
import {
  type StructuredIssue,
  parseStructuredIssue,
  composeIssueFallback,
} from './issueBuilder.types';

// Re-export for backward-compat
export { parseStructuredIssue, composeIssueFallback };
export type { StructuredIssue };

const SYSTEM_PROMPT = `You are Zimb's ticket composer. You turn raw user notes into a structured GitHub Issue that a senior developer can understand AND resolve in under 15 minutes.

# Hard rules

- Output STRICT JSON. No prose, no markdown fences, no commentary.
- Detect the kind: "bug" (something broken), "feature" (new capability), "proposal" (improve existing), "chore" (cleanup / docs).
- title: ≤ 80 chars, plain sentence form, no emoji, no prefix like "[Bug]".

# Reasoning step (do this internally, do not output)

Before writing the JSON, think about:
1. What is the smallest **reproducible** unit? (a route, a button, a config flag, a script)
2. What **environment** is the user in? (org vs user account, OS, browser, package version, role/permission)
3. What **constraints** does the user mention? (e.g. "must work at org level, not just user level" → constraint)
4. What **hypotheses** has the user ALREADY ruled out? (don't waste senior's time re-trying them)

# Field guidelines

- summary: 1 sentence, < 140 chars. The "elevator pitch" a senior reads in 5 seconds.
- problem: 1-3 sentences describing the real-world impact. Why does this matter?
- repro: numbered steps, each one actionable. Use imperative form ("click X", "run Y"). 3-7 steps max.
- expected: what should happen (post-fix). One sentence.
- actual: what currently happens (pre-fix). One sentence, include any error message verbatim.
- scope: bullets naming the files / components in scope. ≤5. If you don't know, say "unknown".
- constraints: bullets capturing org-vs-user, RBAC, OS, browser, versions, etc. Empty array if none.
- acceptance: checkboxes. Each MUST be testable. 3-5 items. Start each with "- [ ] ".
- evidence: bullets with verbatim logs / stack traces / error messages. Empty if none.
- bounty (EUR): 10 for chore/docs, 30 for bug/feature/proposal, up to 100 for security/perf.
- urgency: critical (data loss / outage) > high (blocked) > medium (workaround exists) > low (cosmetic).

# Output JSON shape (copy exactly)

{"title":"...","kind":"bug","summary":"...","problem":"...","repro":["1. ...","2. ..."],"expected":"...","actual":"...","scope":["..."],"constraints":["..."],"acceptance":["- [ ] ...","- [ ] ..."],"evidence":["..."],"bounty":30,"urgency":"medium"}`;

/**
 * Try to use the active Copilot chat model. Returns null if no model available.
 */
export async function composeIssueFromPrompt(_rawPrompt: string): Promise<StructuredIssue | null> {
  return null; // delegate to `composeIssueViaModel`
}

/**
 * Compose an issue using a specific LLM handle (provided by VS Code Chat API).
 * Returns null on LLM error or unparsable JSON (caller falls back).
 */
export async function composeIssueViaModel(
  model: vscode.LanguageModelChat,
  rawPrompt: string,
  extraContext?: { selectedText?: string }
): Promise<StructuredIssue | null> {
  const userParts = [`User note:\n"""\n${rawPrompt.trim()}\n"""`];
  if (extraContext?.selectedText) {
    userParts.push(`\nCode/selection excerpt (first 600 chars):\n"""\n${extraContext.selectedText.slice(0, 600)}\n"""`);
  }
  userParts.push(`\nRespond with STRICT JSON only.`);

  const messages = [
    vscode.LanguageModelChatMessage.User(SYSTEM_PROMPT),
    vscode.LanguageModelChatMessage.User(userParts.join('\n')),
  ];

  let rawText = '';
  try {
    const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
    for await (const fragment of response.text) {
      rawText += fragment;
    }
  } catch {
    return null;
  }

  return parseStructuredIssue(rawText);
}
