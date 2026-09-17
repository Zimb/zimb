/**
 * commandParser.test.ts — unit tests for the @zimb-bot command parser.
 */
import { describe, it, expect } from 'vitest';
import { parseCommand } from '../services/commandParser';

describe('parseCommand', () => {
  it('parses basic claim', () => {
    expect(parseCommand('@zimb-bot claim')).toEqual({
      verb: 'claim',
      flags: {},
      raw: 'claim',
    });
  });

  it('parses claim with flags', () => {
    expect(parseCommand('@zimb-bot claim --bounty 200 --currency EUR')).toEqual({
      verb: 'claim',
      flags: { bounty: '200', currency: 'EUR' },
      raw: 'claim --bounty 200 --currency EUR',
    });
  });

  it('handles quoted flag values', () => {
    const r = parseCommand('@zimb-bot dispute "my reason here"');
    expect(r?.verb).toBe('dispute');
    expect(r?.flags._ ?? r?.raw).toContain('my reason here');
  });

  it('returns null if comment does not address @zimb-bot', () => {
    expect(parseCommand('Hello world')).toBeNull();
    expect(parseCommand('@other-bot claim')).toBeNull();
    expect(parseCommand('')).toBeNull();
    expect(parseCommand(null)).toBeNull();
  });

  it('ignores mentions inside fenced code blocks', () => {
    const r = parseCommand('```\n@zimb-bot claim\n```\n@zimb-bot status');
    expect(r?.verb).toBe('status');
  });

  it('returns null for unknown verbs', () => {
    expect(parseCommand('@zimb-bot ban the user')).toBeNull();
    expect(parseCommand('@zimb-bot sudo rm -rf /')).toBeNull();
  });

  it('treats a bare flag (no value) as boolean true', () => {
    const r = parseCommand('@zimb-bot claim --force');
    expect(r?.flags.force).toBe('true');
  });

  it('is case-insensitive for the verb', () => {
    expect(parseCommand('@zimb-bot CLAIM')?.verb).toBe('claim');
    expect(parseCommand('@zimb-bot Claim')?.verb).toBe('claim');
  });

  it('only matches the FIRST line, not later ones', () => {
    const r = parseCommand('Some prose\n@zimb-bot claim\n@zimb-bot dispute');
    expect(r?.verb).toBe('claim');
  });

  it('recognizes all 5 verbs', () => {
    expect(parseCommand('@zimb-bot claim')?.verb).toBe('claim');
    expect(parseCommand('@zimb-bot unclaim')?.verb).toBe('unclaim');
    expect(parseCommand('@zimb-bot status')?.verb).toBe('status');
    expect(parseCommand('@zimb-bot help')?.verb).toBe('help');
    expect(parseCommand('@zimb-bot dispute')?.verb).toBe('dispute');
  });
});
