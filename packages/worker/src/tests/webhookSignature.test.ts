/**
 * Unit tests — GitHub webhook signature verification + ref parsing (M3.3)
 */
import { describe, it, expect } from 'vitest';
import {
  extractTicketIdFromPrBranch,
  extractTicketIdFromPushRef,
  verifyGithubSignature,
} from '../services/webhookSignature';

const SECRET = 'whsec_test_super_secret_1234567890abcdef';

describe('verifyGithubSignature', () => {
  it('accepts a valid HMAC-SHA256 signature', async () => {
    const body = '{"hello":"world"}';
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    const hex = 'sha256=' + Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    expect(await verifyGithubSignature(SECRET, body, hex)).toBe(true);
  });

  it('rejects when header is missing', async () => {
    expect(await verifyGithubSignature(SECRET, 'body', null)).toBe(false);
  });

  it('rejects when header lacks the sha256= prefix', async () => {
    expect(await verifyGithubSignature(SECRET, 'body', 'abcdef0123456789')).toBe(false);
  });

  it('rejects when body was tampered with', async () => {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('original body'));
    const hex = 'sha256=' + Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    expect(await verifyGithubSignature(SECRET, 'tampered body', hex)).toBe(false);
  });

  it('rejects when secret is wrong', async () => {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('attacker-secret'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('body'));
    const hex = 'sha256=' + Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    expect(await verifyGithubSignature(SECRET, 'body', hex)).toBe(false);
  });

  it('rejects a hex string of wrong length', async () => {
    expect(await verifyGithubSignature(SECRET, 'body', 'sha256=deadbeef')).toBe(false);
  });

  it('rejects when secret is empty', async () => {
    expect(await verifyGithubSignature('', 'body', 'sha256=00')).toBe(false);
  });
});

describe('extractTicketIdFromPushRef', () => {
  it.each([
    ['refs/heads/zimb/T-0001', 'T-0001'],
    ['refs/heads/zimb/T-123456', 'T-123456'],
  ])('parses %s → %s', (input, expected) => {
    expect(extractTicketIdFromPushRef(input)).toBe(expected);
  });

  it.each([
    'refs/heads/main',
    'refs/heads/fix/T-0001',
    'refs/tags/v1.0.0',
    'refs/heads/zimb/t-0001', // lowercase
    'refs/heads/zimb/T-1',    // too short
    '',
  ])('returns null for %s', (input) => {
    expect(extractTicketIdFromPushRef(input)).toBeNull();
  });
});

describe('extractTicketIdFromPrBranch', () => {
  it.each([
    ['zimb/T-0001', 'T-0001'],
    ['zimb/T-123456', 'T-123456'],
  ])('parses %s → %s', (input, expected) => {
    expect(extractTicketIdFromPrBranch(input)).toBe(expected);
  });

  it.each(['main', 'fix/T-0001', 'zimb/t-0001', 'zimb/T-42', 'zimb/T-1', ''])(
    'returns null for %s',
    (input) => {
      expect(extractTicketIdFromPrBranch(input)).toBeNull();
    }
  );
});
