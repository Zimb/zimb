/**
 * Pure-data part of the issue builder (no `vscode` import).
 * Imported by tests to avoid pulling the vscode runtime into vitest.
 */

export type IssueKind = 'bug' | 'feature' | 'proposal' | 'chore';
export type Urgency = 'low' | 'medium' | 'high' | 'critical';

export interface StructuredIssue {
  title: string;
  kind: IssueKind;
  summary: string;
  problem: string;
  repro: string[];
  expected: string;
  actual: string;
  scope: string[];
  constraints: string[];
  acceptance: string[];
  evidence: string[];
  bounty: number;
  urgency: Urgency;
}

/**
 * Parse the LLM response into a structured StructuredIssue.
 * Robust to common LLM mistakes (code fences, leading prose).
 */
export function parseStructuredIssue(raw: string): StructuredIssue | null {
  let json = raw.trim();
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(json);
  if (fenceMatch && fenceMatch[1]) {
    json = fenceMatch[1].trim();
  }
  const braceStart = json.indexOf('{');
  const braceEnd = json.lastIndexOf('}');
  if (braceStart === -1 || braceEnd === -1 || braceEnd <= braceStart) return null;
  json = json.slice(braceStart, braceEnd + 1);

  let obj: any;
  try {
    obj = JSON.parse(json);
  } catch {
    return null;
  }

  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  if (!title || title.length > 100) return null;

  const kind: IssueKind =
    obj.kind === 'feature' || obj.kind === 'proposal' || obj.kind === 'chore' ? obj.kind : 'bug';

  const urgency: Urgency =
    obj.urgency === 'critical' || obj.urgency === 'high' || obj.urgency === 'low' ? obj.urgency : 'medium';

  const bounty = typeof obj.bounty === 'number' && obj.bounty >= 10 && obj.bounty <= 100 ? obj.bounty : 30;

  const str = (v: unknown, fallback: string): string =>
    typeof v === 'string' && v.trim().length > 0 ? v.trim() : fallback;

  const arr = (v: unknown, max: number): string[] => {
    if (!Array.isArray(v)) return [];
    return v
      .filter((x) => typeof x === 'string' && x.trim().length > 0)
      .map((x) => (x as string).trim())
      .slice(0, max);
  };

  return {
    title: title.slice(0, 100),
    kind,
    summary: str(obj.summary, str(obj.problem, title).slice(0, 140)),
    problem: str(obj.problem, ''),
    repro: arr(obj.repro, 7),
    expected: str(obj.expected, ''),
    actual: str(obj.actual, ''),
    scope: arr(obj.scope, 5),
    constraints: arr(obj.constraints, 6),
    acceptance: arr(obj.acceptance, 5),
    evidence: arr(obj.evidence, 5),
    bounty,
    urgency,
  };
}

/**
 * Deterministic fallback if no LLM is available.
 */
export function composeIssueFallback(rawPrompt: string): StructuredIssue {
  const prompt = rawPrompt.trim();
  const firstLine = prompt.split(/\r?\n/)[0]?.trim() ?? '';
  const title = firstLine.length > 0 ? firstLine.slice(0, 80) : 'Debug bounty from VS Code';

  const kind: IssueKind = /\b(bug|broken|crash|error|fail|exception|stack|trace)\b/i.test(prompt)
    ? 'bug'
    : /\b(add|new|feature|support)\b/i.test(prompt)
    ? 'feature'
    : 'bug';

  const isCritical = /\b(crash|data loss|outage|down|production|security)\b/i.test(prompt);
  const urgency: Urgency = isCritical ? 'high' : 'medium';

  const constraints: string[] = [];
  if (/\borg[- ]?level\b/i.test(prompt)) constraints.push('Org-level (not just user account)');
  if (/\bbrowser\b/i.test(prompt)) constraints.push('Browser-specific');
  if (/windows|macos|linux/i.test(prompt)) constraints.push('OS-specific');
  if (/v?\d+\.\d+/i.test(prompt)) constraints.push('Version-specific');

  return {
    title,
    kind,
    summary: prompt.slice(0, 140),
    problem: prompt,
    repro: ['1. _To be filled by the requester._'],
    expected: '_To be filled by the requester._',
    actual: '_To be filled by the requester._',
    scope: ['_Auto-detected from context._'],
    constraints,
    acceptance: [
      '- [ ] Issue is reproducible',
      '- [ ] Fix is scoped to the listed files',
      '- [ ] Tests / lint / type-check pass',
    ],
    evidence: [],
    bounty: kind === 'bug' ? 30 : 20,
    urgency,
  };
}
