/**
 * bountyRenderer.ts — Renders a StructuredIssue into the final Markdown body
 * that gets posted to GitHub.
 *
 * The rendered body matches `recettes/99-bounty-body-template.md` so a senior
 * developer can:
 *   1. Understand the problem in <30 seconds (summary + problem)
 *   2. Reproduce it (repro steps + expected vs actual)
 *   3. Know exactly what to fix (scope + acceptance)
 *   4. Spot the gotchas (constraints + evidence)
 *   5. Know the bounty + how to claim (footer)
 *
 * Reference: recettes/99-bounty-body-template.md
 */

import type { StructuredIssue } from './issueBuilder.types';

export interface RenderContext {
  owner: string;
  repo: string;
  languages: string[];
  issueNumber?: number; // If known (re-render after create)
  bountyOverride?: number | null; // Allow server / dashboard to override LLM's guess
}

export function renderBountyBody(issue: StructuredIssue, ctx: RenderContext): string {
  const sections: string[] = [];

  // ── Header: kind + urgency + summary ─────────────────────────
  const kindLabel: Record<StructuredIssue['kind'], string> = {
    bug: '🐛 Bug',
    feature: '✨ Feature',
    proposal: '💡 Proposal',
    chore: '🧹 Chore',
  };
  const urgencyEmoji: Record<StructuredIssue['urgency'], string> = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    critical: '🔴',
  };

  sections.push(`> **${kindLabel[issue.kind]}** · ${urgencyEmoji[issue.urgency]} ${issue.urgency.toUpperCase()}`);
  if (issue.summary) {
    sections.push(`> ${issue.summary}\n`);
  }

  // ── Problem ─────────────────────────────────────────────────
  if (issue.problem) {
    sections.push(`## 🎯 Problem\n\n${issue.problem}`);
  }

  // ── Reproduction ───────────────────────────────────────────
  if (issue.repro.length > 0) {
    sections.push(`## 🔬 How to reproduce\n\n${issue.repro.map((s) => s).join('\n')}`);
  }

  // ── Expected vs Actual ──────────────────────────────────────
  if (issue.expected || issue.actual) {
    let expAct = `## 🎯 Expected vs Actual\n`;
    if (issue.expected) expAct += `\n**Expected:** ${issue.expected}`;
    if (issue.actual) expAct += `\n**Actual:** ${issue.actual}`;
    sections.push(expAct);
  }

  // ── Evidence (logs, stack traces) ───────────────────────────
  if (issue.evidence.length > 0) {
    sections.push(
      `## 📎 Evidence\n\n${issue.evidence.map((e) => `- \`\`\`\n${e}\n\`\`\``).join('\n')}`
    );
  }

  // ── Scope ───────────────────────────────────────────────────
  if (issue.scope.length > 0) {
    sections.push(
      `## 📋 Scope\n\n${issue.scope.map((s) => `- ${s}`).join('\n')}\n\n_Files/components in-scope for this fix. Anything else → new bounty._`
    );
  }

  // ── Constraints (NEW section — captures org/user, env, etc.) ──
  if (issue.constraints.length > 0) {
    sections.push(
      `## 🚧 Constraints\n\n${issue.constraints.map((c) => `- ${c}`).join('\n')}\n\n_Hard requirements. The fix MUST respect these (e.g. "must work at org level, not just user account")._`
    );
  }

  // ── Environment ─────────────────────────────────────────────
  sections.push(
    `## ⚙️ Environment\n\n` +
      `- **Repo**: [${ctx.owner}/${ctx.repo}](https://github.com/${ctx.owner}/${ctx.repo})\n` +
      `- **Languages**: ${ctx.languages.length > 0 ? ctx.languages.join(', ') : '_unknown_'}\n` +
      `- **Issue**: #${ctx.issueNumber ?? 'TBD'}`
  );

  // ── Acceptance criteria ─────────────────────────────────────
  if (issue.acceptance.length > 0) {
    sections.push(`## ✅ Acceptance criteria\n\n${issue.acceptance.join('\n')}`);
  } else {
    sections.push(
      `## ✅ Acceptance criteria\n\n- [ ] Fix is scoped to the listed files\n- [ ] Tests / lint / type-check pass`
    );
  }

  // ── Bounty ──────────────────────────────────────────────────
  const bounty = ctx.bountyOverride != null ? ctx.bountyOverride : issue.bounty;
  sections.push(
    `## 💰 Bounty\n\n` +
      `**${bounty}€** — _payment flow not active yet, currently a public contribution credit._\n\n` +
      `When the bounty system is enabled, this would be pre-authorized via Stripe on claim.`
  );

  // ── How to claim (for seniors) ──────────────────────────────
  const issueRef = ctx.issueNumber ? String(ctx.issueNumber) : 'TBD';
  sections.push(
    `## 🤝 How to claim (for contributors)\n\n` +
      `Comment \`@zimb-bot claim\` on this issue and I'll:\n` +
      `1. Add you as a collaborator with **push** access on this repo\n` +
      `2. Reply with a 1-command copy-paste for branch + PR\n\n` +
      `After accepting the invite:\n\n` +
      '```bash\n' +
      `gh repo clone ${ctx.owner}/${ctx.repo}\n` +
      `cd ${ctx.repo}\n` +
      `git checkout -b zimb/#${issueRef}-<short-slug>\n` +
      `# ... your fix ...\n` +
      `git add -A && git commit -m "Fix: <one-line summary>"\n` +
      `git push -u origin zimb/#${issueRef}-<short-slug>\n` +
      `gh pr create --fill --base main\n` +
      '```\n\n' +
      `> 💡 This is a beta open-source project — contributions are voluntary and ` +
      `unpaid at this stage. You'll get full credit on the README contributors list ` +
      `and a public shoutout when the PR merges.`
  );

  sections.push(
    `---\n\n_Powered by [Zimb](https://zimb.app) — open-source debugging platform · ` +
      `Issue composed by the user's active Copilot model_`
  );

  return sections.join('\n\n');
}
