/**
 * Unit tests for ticket validation schemas.
 * Run with: npm test
 */
import { describe, it, expect } from 'vitest';
import {
  CreateTicketSchema,
  LanguageSchema,
  TicketIdParamSchema,
  UrgencySchema,
  parseOrThrow,
  ValidationError,
} from './ticketValidation';

const validPayload = {
  title: 'CORS error on api.example.com',
  description: 'When I call GET /users I get a CORS preflight error blocking the request.',
  bounty: 5000, // 50 €
  urgency: 'high' as const,
  languages: ['TypeScript', 'Node.js'] as unknown as 'TypeScript'[],
  repoUrl: 'https://github.com/my-org/my-repo',
  channel: 'web' as const,
};

describe('CreateTicketSchema', () => {
  it('accepts a valid payload', () => {
    const result = CreateTicketSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects title < 5 chars', () => {
    const result = CreateTicketSchema.safeParse({ ...validPayload, title: 'hi' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['title']);
    }
  });

  it('rejects description < 20 chars', () => {
    const result = CreateTicketSchema.safeParse({ ...validPayload, description: 'too short' });
    expect(result.success).toBe(false);
  });

  it('rejects bounty < 1000 cents (10 €)', () => {
    const result = CreateTicketSchema.safeParse({ ...validPayload, bounty: 500 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/minimum/i);
    }
  });

  it('rejects bounty > 50000 cents (500 €)', () => {
    const result = CreateTicketSchema.safeParse({ ...validPayload, bounty: 60000 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/maximum/i);
    }
  });

  it('rejects bounty that is not an integer (cents)', () => {
    const result = CreateTicketSchema.safeParse({ ...validPayload, bounty: 5050.5 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid urgency value', () => {
    const result = CreateTicketSchema.safeParse({ ...validPayload, urgency: 'super-critical' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid urgencies', () => {
    for (const urgency of UrgencySchema.options) {
      const result = CreateTicketSchema.safeParse({ ...validPayload, urgency });
      expect(result.success).toBe(true);
    }
  });

  it('rejects empty languages array', () => {
    const result = CreateTicketSchema.safeParse({ ...validPayload, languages: [] });
    expect(result.success).toBe(false);
  });

  it('rejects too many languages (> 8)', () => {
    const result = CreateTicketSchema.safeParse({
      ...validPayload,
      languages: ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'Kotlin', 'Ruby', 'PHP'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid languages', () => {
    for (const language of LanguageSchema.options) {
      const result = CreateTicketSchema.safeParse({ ...validPayload, languages: [language] });
      expect(result.success).toBe(true);
    }
  });

  it('rejects non-GitHub repoUrl', () => {
    const result = CreateTicketSchema.safeParse({
      ...validPayload,
      repoUrl: 'https://gitlab.com/foo/bar',
    });
    expect(result.success).toBe(false);
  });

  it('rejects malformed repoUrl', () => {
    const result = CreateTicketSchema.safeParse({
      ...validPayload,
      repoUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});

describe('TicketIdParamSchema', () => {
  it('accepts T-0001', () => {
    expect(TicketIdParamSchema.safeParse('T-0001').success).toBe(true);
  });

  it('accepts T-123456', () => {
    expect(TicketIdParamSchema.safeParse('T-123456').success).toBe(true);
  });

  it('rejects T-1 (too short)', () => {
    expect(TicketIdParamSchema.safeParse('T-1').success).toBe(false);
  });

  it('rejects TICKET-0001 (wrong prefix)', () => {
    expect(TicketIdParamSchema.safeParse('TICKET-0001').success).toBe(false);
  });

  it('rejects t-0001 (lowercase)', () => {
    expect(TicketIdParamSchema.safeParse('t-0001').success).toBe(false);
  });
});

describe('parseOrThrow', () => {
  it('returns parsed data on success', () => {
    const data = parseOrThrow(CreateTicketSchema, validPayload);
    expect(data.title).toBe(validPayload.title);
  });

  it('throws ValidationError on failure', () => {
    expect(() => parseOrThrow(CreateTicketSchema, { ...validPayload, bounty: 100 })).toThrow(
      ValidationError
    );
  });

  it('ValidationError contains zod issues', () => {
    try {
      parseOrThrow(CreateTicketSchema, {});
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      const vErr = err as ValidationError;
      expect(vErr.issues.length).toBeGreaterThan(0);
      expect(vErr.issues[0]).toHaveProperty('path');
      expect(vErr.issues[0]).toHaveProperty('message');
    }
  });
});
