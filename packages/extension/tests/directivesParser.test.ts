/**
 * directivesParser.test.ts — unit tests for the @zimb /issue flag parser.
 */
import { describe, it, expect } from 'vitest';
import {
  parseDirectives,
  renderDirectivesFrontMatter,
  parseDirectivesFromBody,
} from '../src/chat/directivesParser';

describe('parseDirectives', () => {
  it('returns defaults when no flags', () => {
    const { description, directives } = parseDirectives('My app crashes');
    expect(description).toBe('My app crashes');
    expect(directives.lang).toBe('en');
    expect(directives.urgency).toBe('medium');
    expect(directives.bounty).toBe(30);
    expect(directives.currency).toBe('EUR');
  });

  it('parses long flags', () => {
    const { description, directives } = parseDirectives(
      'My app crashes --lang fr --urgency critical --bounty 200 --currency USD'
    );
    expect(description).toBe('My app crashes');
    expect(directives.lang).toBe('fr');
    expect(directives.urgency).toBe('critical');
    expect(directives.bounty).toBe(200);
    expect(directives.currency).toBe('USD');
  });

  it('parses short flags (the format requested by the user)', () => {
    const { description, directives } = parseDirectives(
      "J'ai un bug critique -l fr -u critical -b 200 -c EUR"
    );
    expect(description).toBe("J'ai un bug critique");
    expect(directives.lang).toBe('fr');
    expect(directives.urgency).toBe('critical');
    expect(directives.bounty).toBe(200);
    expect(directives.currency).toBe('EUR');
  });

  it('flags can appear anywhere in the prompt', () => {
    const { description, directives } = parseDirectives(
      '-l es Le bouton -b 50 submit crash'
    );
    expect(description).toBe('Le bouton submit crash');
    expect(directives.lang).toBe('es');
    expect(directives.bounty).toBe(50);
  });

  it('handles quoted flag values', () => {
    const { directives } = parseDirectives('--lang "fr" --bounty 100');
    expect(directives.lang).toBe('fr');
  });

  it('clamps bounty to valid range', () => {
    const tooLow = parseDirectives('-b 1').directives.bounty;
    const tooHigh = parseDirectives('-b 99999').directives.bounty;
    const justRight = parseDirectives('-b 100').directives.bounty;
    expect(tooLow).toBe(30); // falls back to default
    expect(tooHigh).toBe(30); // falls back to default
    expect(justRight).toBe(100);
  });

  it('uppercase currency is normalized', () => {
    const { directives } = parseDirectives('-c aud');
    expect(directives.currency).toBe('AUD');
  });

  it('lowercase urgency is accepted', () => {
    const { directives } = parseDirectives('-u HIGH');
    expect(directives.urgency).toBe('high');
  });
});

describe('renderDirectivesFrontMatter', () => {
  it('renders the hidden HTML comment block', () => {
    const fm = renderDirectivesFrontMatter({
      lang: 'fr',
      urgency: 'critical',
      bounty: 200,
      currency: 'EUR',
      rawFlags: {},
    });
    expect(fm).toContain('<!-- zimb: directives');
    expect(fm).toContain('lang: fr');
    expect(fm).toContain('urgency: critical');
    expect(fm).toContain('bounty: 200');
    expect(fm).toContain('currency: EUR');
    expect(fm).toContain('-->');
  });
});

describe('parseDirectivesFromBody', () => {
  it('round-trips through render → parse', () => {
    const original = {
      lang: 'fr' as const,
      urgency: 'critical' as const,
      bounty: 200,
      currency: 'EUR' as const,
      rawFlags: {},
    };
    const body = renderDirectivesFrontMatter(original);
    const parsed = parseDirectivesFromBody(body);
    expect(parsed.lang).toBe('fr');
    expect(parsed.urgency).toBe('critical');
    expect(parsed.bounty).toBe(200);
    expect(parsed.currency).toBe('EUR');
  });

  it('returns defaults when front-matter is absent', () => {
    const parsed = parseDirectivesFromBody('Just a normal issue body.');
    expect(parsed.lang).toBe('en');
    expect(parsed.bounty).toBe(30);
  });
});
