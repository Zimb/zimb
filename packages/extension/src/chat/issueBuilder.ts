/**
 * issueBuilder.ts — LLM-powered GitHub Issue composer.
 *
 * Asks the user's active Copilot chat model to turn a free-form chat prompt
 * into a structured GitHub Issue (title + body + suggested bounty).
 *
 * Falls back to a deterministic title extraction + template body if no model
 * is available, so the extension still works without Copilot.
 *
 * Schema (JSON returned by the LLM):
 *   {
 *     "title":    string (max 80 chars, no prefix),
 *     "body":     Markdown body with sections 🎯 / 🔬 / 🎯 / 📋,
 *     "bounty":   number (EUR, 10-100),
 *     "kind":     "bug" | "feature" | "proposal" | "chore"
 *   }
 */
import * as vscode from 'vscode';

export interface ComposedIssue {
  title: string;
  body: string;
  bounty: number;
  kind: 'bug' | 'feature' | 'proposal' | 'chore';
}

const SYSTEM_PROMPT = `You are Zimb's ticket composer. You turn raw user notes into a structured GitHub Issue body in Markdown.

Rules:
- Output STRICT JSON, no commentary, no fences.
- Detect the kind: "bug" (something broken), "feature" (new capability), "proposal" (improve existing), "chore" (cleanup/docs).
- title: ≤ 80 chars, no emoji prefix, plain sentence form.
- body sections (use them in this order, skip empty ones):
    ## 🎯 Problem
    ## 🔬 Reproduction steps
    ## 🎯 Expected vs Actual
    ## 📋 Scope
    ## ✅ Acceptance criteria
- Scope lists files/components that are in-scope (bullets, ≤5).
- Acceptance criteria are checkboxes, 3-5 items.
- bounty (EUR): 10 for chore/docs, 30 for bug/feature/proposal, up to 100 for security/perf.

Return ONLY this JSON:
{"title":"...","body":"...","bounty":30,"kind":"bug"}`;

/**
 * Try to use the active Copilot chat model. Returns null if no model available.
 */
export async function composeIssueFromPrompt(rawPrompt: string): Promise<ComposedIssue | null> {
  if (!rawPrompt.trim()) return null;

  // The chat model is provided per-request on `request.model`.
  // We expose a separate entry point that the participant calls with that handle.
  return null; // implemented in `composeIssueViaModel` below
}

/**
 * Compose an issue using a specific LLM handle (provided by VS Code Chat API).
 * Returns null on LLM error or unparsable JSON (caller falls back).
 */
export async function composeIssueViaModel(
  model: vscode.LanguageModelChat,
  rawPrompt: string,
  extraContext?: { selectedText?: string }
): Promise<ComposedIssue | null> {
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

  return parseComposedIssue(rawText);
}

/**
 * Parse the LLM response into a structured ComposedIssue.
 * Robust to common LLM mistakes (code fences, leading prose).
 */
export function parseComposedIssue(raw: string): ComposedIssue | null {
  let json = raw.trim();
  // Strip ```json fences if present
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(json);
  if (fenceMatch && fenceMatch[1]) {
    json = fenceMatch[1].trim();
  }
  // Find first {...} block if there's preamble
  const braceStart = json.indexOf('{');
  const braceEnd = json.lastIndexOf('}');
  if (braceStart === -1 || braceEnd === -1 || braceEnd <= braceStart) return null;
  json = json.slice(braceStart, braceEnd + 1);

  try {
    const obj = JSON.parse(json) as Partial<ComposedIssue>;
    const title = typeof obj.title === 'string' ? obj.title.trim() : '';
    const body = typeof obj.body === 'string' ? obj.body.trim() : '';
    const bounty =
      typeof obj.bounty === 'number' && obj.bounty >= 10 && obj.bounty <= 100
        ? obj.bounty
        : 30;
    const kind: ComposedIssue['kind'] =
      obj.kind === 'feature' || obj.kind === 'proposal' || obj.kind === 'chore'
        ? obj.kind
        : 'bug';

    if (!title || title.length > 100) return null;
    if (!body || body.length < 40) return null;
    return { title, body, bounty, kind };
  } catch {
    return null;
  }
}

/**
 * Deterministic fallback if no LLM is available: extract title from first line,
 * wrap the prompt into a minimal body.
 */
export function composeIssueFallback(rawPrompt: string): ComposedIssue {
  const firstLine = rawPrompt.split(/\r?\n/)[0]?.trim() ?? '';
  const title = firstLine.length > 0 ? firstLine.slice(0, 80) : 'Debug bounty from VS Code';
  const kind: ComposedIssue['kind'] = /\b(bug|broken|crash|error|fail|exception)\b/i.test(rawPrompt)
    ? 'bug'
    : 'feature';
  return {
    title,
    body:
      `## 🎯 Problem\n\n${rawPrompt.trim()}\n\n` +
      `## 🔬 Reproduction steps\n\n_To be filled by requester._\n\n` +
      `## 🎯 Expected vs Actual\n\n_To be filled by requester._\n\n` +
      `## 📋 Scope\n\n_Auto-detected from context._\n\n` +
      `## ✅ Acceptance criteria\n\n- [ ] _To be filled._\n`,
    bounty: kind === 'bug' ? 30 : 20,
    kind,
  };
}
