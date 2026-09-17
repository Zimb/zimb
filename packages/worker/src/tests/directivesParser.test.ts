import { describe, it, expect } from 'vitest';
import { parseDirectives, parseDirectivesFromBody } from '../services/directivesParser';

describe('parseDirectivesFromBody (worker copy)', () => {
  it('returns defaults when no front-matter', () => {
    const d = parseDirectivesFromBody('Just a body');
    expect(d.lang).toBe('en');
    expect(d.bounty).toBe(30);
  });

  it('round-trips through render-like format', () => {
    const body = `Some issue body

<!-- zimb: directives
  lang: fr
  urgency: critical
  bounty: 200
  currency: EUR
-->

## Problem`;
    const d = parseDirectivesFromBody(body);
    expect(d.lang).toBe('fr');
    expect(d.urgency).toBe('critical');
    expect(d.bounty).toBe(200);
    expect(d.currency).toBe('EUR');
  });
});
