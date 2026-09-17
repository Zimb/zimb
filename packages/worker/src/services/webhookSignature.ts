/**
 * GitHub webhook signature verification — M3.3
 *
 * GitHub signs every webhook payload with:
 *   X-Hub-Signature-256: sha256=<hex(HMAC-SHA256(secret, raw_body))>
 *
 * Spec: SPECIFICATIONS.md §4.3
 * Recette: recettes/03-github-access.md (CT-GH-WEBHOOK-01..04)
 *
 * Implementation notes:
 *   - We use Web Crypto SubtleCrypto (works on Workers V8 isolate, no node:crypto).
 *   - Constant-time comparison via XOR to avoid timing attacks.
 *   - The function returns a boolean (no exception) so callers can map to HTTP 401.
 */

const PREFIX = 'sha256=';

/**
 * Verify a GitHub webhook signature.
 *
 * @param secret    the GITHUB_WEBHOOK_SECRET
 * @param rawBody   the raw request body as a string (NOT JSON.parse'd)
 * @param header    the X-Hub-Signature-256 header value (may include or omit 'sha256=')
 * @returns true if valid, false otherwise
 */
export async function verifyGithubSignature(
  secret: string,
  rawBody: string,
  header: string | null
): Promise<boolean> {
  if (!secret || !header) return false;
  if (!header.startsWith(PREFIX)) return false;

  const provided = header.slice(PREFIX.length).toLowerCase();
  if (provided.length !== 64) return false; // sha256 hex is 64 chars

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time compare
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Convenience: extract the ticket id from a GitHub push event's ref.
 *   refs/heads/fix/T-0001 → T-0001
 *   refs/heads/main       → null (not a zimb branch)
 */
export function extractTicketIdFromPushRef(ref: string): string | null {
  const match = /^refs\/heads\/zimb\/(T-\d{4,6})$/.exec(ref);
  return match ? (match[1] ?? null) : null;
}

/**
 * Convenience: extract the ticket id from a GitHub PR branch name.
 *   zimb/T-0001 → T-0001
 */
export function extractTicketIdFromPrBranch(branch: string): string | null {
  const match = /^zimb\/(T-\d{4,6})$/.exec(branch);
  return match ? (match[1] ?? null) : null;
}
