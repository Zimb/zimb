/**
 * bountyRenderer.test.ts — Unit tests for the LLM-powered issue composer + renderer.
 *
 * Tests the parser (`parseStructuredIssue`), the renderer (`renderBountyBody`)
 * and the deterministic fallback (`composeIssueFallback`).
 *
 * Run with: `npm test` from packages/extension/
 */
import { describe, it, expect } from 'vitest';
import {
  parseStructuredIssue,
  composeIssueFallback,
  type StructuredIssue,
} from '../src/chat/issueBuilder.types';
import { renderBountyBody } from '../src/chat/bountyRenderer';

describe('parseStructuredIssue', () => {
  it('parses clean JSON', () => {
    const raw = JSON.stringify({
      title: 'Logout button crashes app',
      kind: 'bug',
      summary: 'Clicking logout twice crashes the app silently.',
      problem: 'Logout button crashes app on double-click.',
      repro: ['1. Open app', '2. Click logout twice within 1s', '3. App crashes'],
      expected: 'App shows confirmation dialog',
      actual: 'App crashes with no error',
      scope: ['src/auth/Logout.tsx'],
      constraints: ['Must work on org-level accounts'],
      acceptance: ['- [ ] Fix crash', '- [ ] Add test'],
      evidence: ['TypeError: undefined at Logout.tsx:42'],
      bounty: 50,
      urgency: 'high',
    });
    const result = parseStructuredIssue(raw);
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Logout button crashes app');
    expect(result!.kind).toBe('bug');
    expect(result!.urgency).toBe('high');
    expect(result!.bounty).toBe(50);
    expect(result!.constraints).toContain('Must work on org-level accounts');
  });

  it('strips ```json fences', () => {
    const raw = '```json\n{"title":"X","kind":"bug","bounty":30,"urgency":"low"}\n```';
    const result = parseStructuredIssue(raw);
    expect(result).not.toBeNull();
    expect(result!.title).toBe('X');
  });

  it('finds JSON block in surrounding prose', () => {
    const raw = 'Here you go:\n{"title":"Y","kind":"feature","bounty":20,"urgency":"medium"}\nDone!';
    const result = parseStructuredIssue(raw);
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Y');
  });

  it('returns null on invalid JSON', () => {
    expect(parseStructuredIssue('not json')).toBeNull();
    expect(parseStructuredIssue('{ malformed')).toBeNull();
  });

  it('returns null on missing title', () => {
    expect(parseStructuredIssue('{"kind":"bug"}')).toBeNull();
  });

  it('clamps bounty to valid range', () => {
    expect(parseStructuredIssue('{"title":"X","bounty":999}')!.bounty).toBe(30);
    expect(parseStructuredIssue('{"title":"X","bounty":50}')!.bounty).toBe(50);
  });

  it('defaults urgency and kind', () => {
    const r = parseStructuredIssue('{"title":"X"}')!;
    expect(r.kind).toBe('bug');
    expect(r.urgency).toBe('medium');
  });

  it('handles arrays with empty / non-string entries', () => {
    const r = parseStructuredIssue('{"title":"X","repro":["",null,"a","b","c","d","e","f","g"]}')!;
    expect(r.repro).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  });
});

describe('composeIssueFallback', () => {
  it('extracts title from first line', () => {
    const r = composeIssueFallback('My app crashes on logout\nMore details here...');
    expect(r.title).toBe('My app crashes on logout');
  });

  it('detects bug keyword', () => {
    const r = composeIssueFallback('Random crash when clicking logout');
    expect(r.kind).toBe('bug');
  });

  it('detects org-level constraint', () => {
    const r = composeIssueFallback('Cannot install GitHub app at org-level, only user account');
    expect(r.constraints).toContain('Org-level (not just user account)');
  });

  it('detects high urgency keywords', () => {
    const r = composeIssueFallback('Production outage: data loss on every deploy');
    expect(r.urgency).toBe('high');
  });

  it('truncates long titles to 80 chars', () => {
    const longTitle = 'x'.repeat(120);
    const r = composeIssueFallback(longTitle);
    expect(r.title.length).toBeLessThanOrEqual(80);
  });
});

describe('renderBountyBody', () => {
  const baseIssue: StructuredIssue = {
    title: 'Test issue',
    kind: 'bug',
    summary: 'A test issue for rendering.',
    problem: 'Something is broken.',
    repro: ['1. Open X', '2. Click Y', '3. Observe Z'],
    expected: 'Z works.',
    actual: 'Z fails.',
    scope: ['src/foo.ts'],
    constraints: ['Must work on org-level'],
    acceptance: ['- [ ] Fix bug', '- [ ] Add test'],
    evidence: ['Error: foo'],
    bounty: 30,
    urgency: 'high',
  };

  const ctx = { owner: 'Zimb', repo: 'zimb', languages: ['TypeScript', 'Node.js'], issueNumber: 42 };

  it('renders all required sections', () => {
    const body = renderBountyBody(baseIssue, ctx);
    expect(body).toContain('## 🎯 Problem');
    expect(body).toContain('## 🔬 How to reproduce');
    expect(body).toContain('## 🎯 Expected vs Actual');
    expect(body).toContain('## 📎 Evidence');
    expect(body).toContain('## 📋 Scope');
    expect(body).toContain('## 🚧 Constraints');
    expect(body).toContain('## ⚙️ Environment');
    expect(body).toContain('## ✅ Acceptance criteria');
    expect(body).toContain('## 💰 Bounty');
    expect(body).toContain('## 🤝 How to claim');
  });

  it('highlights bug kind + urgency in header', () => {
    const body = renderBountyBody(baseIssue, ctx);
    expect(body).toContain('🐛 Bug');
    expect(body).toContain('HIGH');
  });

  it('respects bounty override', () => {
    const body = renderBountyBody(baseIssue, { ...ctx, bountyOverride: 200 });
    expect(body).toContain('**200€**');
  });

  it('replaces TBD with real issue number', () => {
    const body = renderBountyBody(baseIssue, { ...ctx, issueNumber: 99 });
    expect(body).toContain('zimb/#99-');
  });

  it('omits empty evidence section', () => {
    const empty = { ...baseIssue, evidence: [] };
    const body = renderBountyBody(empty, ctx);
    expect(body).not.toContain('## 📎 Evidence');
  });

  it('omits empty constraints section', () => {
    const empty = { ...baseIssue, constraints: [] };
    const body = renderBountyBody(empty, ctx);
    expect(body).not.toContain('## 🚧 Constraints');
  });

  it('integrates org-level constraint (the user concrete example)', () => {
    const issue: StructuredIssue = {
      ...baseIssue,
      title: "Can't install app at org-level, only user account",
      problem: 'When installing @zimb-bot from the GitHub Apps page, the "Install" button only offers user-level scopes, not org-level.',
      constraints: [
        'Must work on org-level accounts (not just personal user accounts)',
        'Maintainer permissions required on the target org',
      ],
      acceptance: [
        '- [ ] Installation completes at org-level with admin:org scope',
        '- [ ] Bot can list repos in any org where it has been granted access',
      ],
    };
    const body = renderBountyBody(issue, ctx);
    expect(body).toContain('Must work on org-level accounts');
    expect(body).toContain('admin:org scope');
    expect(body).toContain('## 🚧 Constraints');
  });
});
