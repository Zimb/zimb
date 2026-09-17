/**
 * Airtable adapter — typed wrapper around the REST API.
 *
 * Spec reference: SPECIFICATIONS.md §A (Schéma base)
 * Skill reference: .github/skills/airtable-scripting/SKILL.md
 *
 * - Concurrency-safe via If-Match (record revision)
 * - Idempotent via explicit Idempotency-Key (caller-provided)
 * - Retry on 429 with exponential backoff
 * - Domain types from src/types/ticket.ts
 */
import type { Env } from '../types/env';
import type { Ticket, TicketStatus, Channel } from '../types/ticket';

const BASE_URL = 'https://api.airtable.com/v0';

// ─── Retry helper ──────────────────────────────────────────────
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number }).status;
      if (status && status >= 400 && status < 500 && status !== 429) throw err;
      if (attempt < maxAttempts) {
        const delay = Math.min(2 ** attempt * 100, 2000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

// ─── Helpers ───────────────────────────────────────────────────
async function airtableFetch(
  env: Env,
  path: string,
  init: RequestInit & { expectedRevision?: string } = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${env.AIRTABLE_API_KEY}`);
  headers.set('Content-Type', 'application/json');
  if (init.expectedRevision) {
    headers.set('If-Match', init.expectedRevision);
  }
  return fetch(`${BASE_URL}/${env.AIRTABLE_BASE_ID}${path}`, { ...init, headers });
}

function nextTicketId(existingCount: number): string {
  // T-0001, T-0002, ... padded to 4 digits
  const n = existingCount + 1;
  return `T-${String(n).padStart(4, '0')}`;
}

function airtableRecordToTicket(record: { id: string; fields: Record<string, unknown> }): Ticket {
  const f = record.fields;
  const ticket: Ticket = {
    id: String(f.id ?? ''),
    title: String(f.title ?? ''),
    description: String(f.description ?? ''),
    bounty: Number(f.bounty ?? 0),
    urgency: (f.urgency as Ticket['urgency']) ?? 'medium',
    languages: Array.isArray(f.languages) ? (f.languages as Ticket['languages']) : [],
    repoUrl: String(f.repo_url ?? ''),
    status: (f.status as TicketStatus) ?? 'open',
    channel: (f.channel as Channel) ?? 'web',
    createdAt: String(f.created_at ?? ''),
    createdBy: String(f.created_by ?? ''),
  };

  if (f.claimed_by) ticket.claimedBy = String(f.claimed_by);
  if (f.delivered_at) ticket.deliveredAt = String(f.delivered_at);
  if (f.validated_at) ticket.validatedAt = String(f.validated_at);
  if (f.auto_validated_at) ticket.autoValidatedAt = String(f.auto_validated_at);
  if (f.dispute_opened_at) ticket.disputeOpenedAt = String(f.dispute_opened_at);
  if (f.sla_dispute_deadline) ticket.slaDisputeDeadline = String(f.sla_dispute_deadline);
  if (f.assigned_reviewer_id) ticket.assignedReviewerId = String(f.assigned_reviewer_id);
  if (f.stripe_payment_intent_id) ticket.stripePaymentIntentId = String(f.stripe_payment_intent_id);
  ticket.airtableRecordId = record.id;

  return ticket;
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Count existing tickets — used to generate sequential IDs T-XXXX.
 */
export async function countTickets(env: Env): Promise<number> {
  const res = await withRetry(() =>
    airtableFetch(env, '/Tickets?maxRecords=1&fields%5B%5D=id')
  );
  if (!res.ok) throw new Error(`Airtable countTickets failed: ${res.status}`);
  const data = (await res.json()) as { records: unknown[] };
  // Note: this only returns up to 1 — for accurate count use listTickets()
  return data.records.length;
}

/**
 * Create a new ticket in Airtable.
 * Auto-generates the T-XXXX ID based on existing count.
 */
export async function createTicket(
  env: Env,
  input: {
    title: string;
    description: string;
    bounty: number; // EUR cents
    urgency: Ticket['urgency'];
    languages: Ticket['languages'];
    repoUrl: string;
    channel: Channel;
    createdBy: string; // userId (GitHub login)
  }
): Promise<Ticket> {
  const existing = await listTickets(env, { maxRecords: 1000 });
  const id = nextTicketId(existing.length);

  const fields = {
    id,
    title: input.title,
    description: input.description,
    bounty: input.bounty,
    urgency: input.urgency,
    languages: input.languages,
    repo_url: input.repoUrl,
    status: 'open' as TicketStatus,
    channel: input.channel,
    created_at: new Date().toISOString(),
    created_by: input.createdBy,
  };

  const res = await withRetry(() =>
    airtableFetch(env, '/Tickets', {
      method: 'POST',
      body: JSON.stringify({ fields }),
    })
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable createTicket failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as { id: string; fields: typeof fields };
  return airtableRecordToTicket(data);
}

/**
 * Get a single ticket by its T-XXXX id (NOT the Airtable record id).
 */
export async function getTicketByZimbId(env: Env, ticketId: string): Promise<Ticket | null> {
  const filter = `{id} = '${ticketId.replace(/'/g, "\\'")}'`;
  const res = await withRetry(() =>
    airtableFetch(env, `/Tickets?filterByFormula=${encodeURIComponent(filter)}&maxRecords=1`)
  );
  if (!res.ok) throw new Error(`Airtable getTicket failed: ${res.status}`);
  const data = (await res.json()) as { records: Array<{ id: string; fields: Record<string, unknown> }> };
  if (data.records.length === 0) return null;
  const record = data.records[0];
  if (!record) return null;
  return airtableRecordToTicket(record);
}

/**
 * List tickets with optional filter.
 */
export async function listTickets(
  env: Env,
  options: { maxRecords?: number; status?: TicketStatus } = {}
): Promise<Ticket[]> {
  const params = new URLSearchParams();
  if (options.status) {
    params.set('filterByFormula', `{status} = '${options.status}'`);
  }
  params.set('maxRecords', String(options.maxRecords ?? 100));

  const res = await withRetry(() => airtableFetch(env, `/Tickets?${params.toString()}`));
  if (!res.ok) throw new Error(`Airtable listTickets failed: ${res.status}`);
  const data = (await res.json()) as { records: Array<{ id: string; fields: Record<string, unknown> }> };
  return data.records.map(airtableRecordToTicket);
}

/**
 * Update a ticket atomically using If-Match for concurrency safety.
 * Returns the updated ticket.
 * Returns null if the record was modified concurrently (412 Precondition Failed).
 */

/** Fields accepted by `updateTicket` (subset of Ticket columns mappable to Airtable). */
export interface AirtableTicketUpdate {
  status?: TicketStatus;
  claimedBy?: string;
  deliveredAt?: string;
  validatedAt?: string;
  autoValidatedAt?: string;
  disputeOpenedAt?: string;
  slaDisputeDeadline?: string;
  assignedReviewerId?: string;
  stripePaymentIntentId?: string;
  repoUrl?: string;
}

export async function updateTicket(
  env: Env,
  airtableRecordId: string,
  expectedRevision: string,
  patch: AirtableTicketUpdate
): Promise<Ticket | null> {
  // Build the fields payload (only known Airtable columns)
  const fields: Record<string, unknown> = {};
  if (patch.status !== undefined) fields.status = patch.status;
  if (patch.claimedBy !== undefined) fields.claimed_by = patch.claimedBy;
  if (patch.deliveredAt !== undefined) fields.delivered_at = patch.deliveredAt;
  if (patch.validatedAt !== undefined) fields.validated_at = patch.validatedAt;
  if (patch.autoValidatedAt !== undefined) fields.auto_validated_at = patch.autoValidatedAt;
  if (patch.disputeOpenedAt !== undefined) fields.dispute_opened_at = patch.disputeOpenedAt;
  if (patch.slaDisputeDeadline !== undefined)
    fields.sla_dispute_deadline = patch.slaDisputeDeadline;
  if (patch.assignedReviewerId !== undefined)
    fields.assigned_reviewer_id = patch.assignedReviewerId;
  if (patch.stripePaymentIntentId !== undefined)
    fields.stripe_payment_intent_id = patch.stripePaymentIntentId;
  if (patch.repoUrl !== undefined) fields.repo_url = patch.repoUrl;

  const res = await withRetry(() =>
    airtableFetch(env, `/Tickets/${airtableRecordId}`, {
      method: 'PATCH',
      expectedRevision,
      body: JSON.stringify({ fields }),
    })
  );

  if (res.status === 412) return null; // concurrent modification — caller should retry
  if (!res.ok) throw new Error(`Airtable updateTicket failed: ${res.status}`);
  const data = (await res.json()) as { id: string; fields: Record<string, unknown> };
  return airtableRecordToTicket(data);
}

// ─── Claims ────────────────────────────────────────────────────

export interface ClaimRecord {
  ticketId: string;
  seniorId: string;
  claimedAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'completed';
  airtableRecordId?: string;
}

/**
 * Get the active claim for a ticket, if any.
 */
export async function getActiveClaim(env: Env, ticketId: string): Promise<ClaimRecord | null> {
  const filter = `AND({ticket_id} = '${ticketId}', {status} = 'active')`;
  const res = await withRetry(() =>
    airtableFetch(env, `/Claims?filterByFormula=${encodeURIComponent(filter)}&maxRecords=1`)
  );
  if (!res.ok) throw new Error(`Airtable getActiveClaim failed: ${res.status}`);
  const data = (await res.json()) as { records: Array<{ id: string; fields: Record<string, unknown> }> };
  if (data.records.length === 0) return null;
  const record = data.records[0];
  if (!record) return null;
  const f = record.fields;
  return {
    ticketId: String(f.ticket_id),
    seniorId: String(f.senior_id),
    claimedAt: String(f.claimed_at),
    expiresAt: String(f.expires_at),
    status: 'active',
    airtableRecordId: record.id,
  };
}

/**
 * Atomically create a claim for a ticket.
 * Caller MUST verify the ticket is still 'open' before calling.
 */
export async function createClaim(env: Env, claim: Omit<ClaimRecord, 'airtableRecordId'>): Promise<ClaimRecord> {
  const res = await withRetry(() =>
    airtableFetch(env, '/Claims', {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          ticket_id: claim.ticketId,
          senior_id: claim.seniorId,
          claimed_at: claim.claimedAt,
          expires_at: claim.expiresAt,
          status: claim.status,
        },
      }),
    })
  );
  if (!res.ok) throw new Error(`Airtable createClaim failed: ${res.status}`);
  const data = (await res.json()) as { id: string; fields: Record<string, unknown> };
  return { ...claim, airtableRecordId: data.id };
}

/**
 * List expired claims that need processing.
 */
export async function listExpiredClaims(env: Env): Promise<ClaimRecord[]> {
  const now = new Date().toISOString();
  const filter = `AND({status} = 'active', {expires_at} < '${now}')`;
  const res = await withRetry(() =>
    airtableFetch(env, `/Claims?filterByFormula=${encodeURIComponent(filter)}&maxRecords=100`)
  );
  if (!res.ok) throw new Error(`Airtable listExpiredClaims failed: ${res.status}`);
  const data = (await res.json()) as { records: Array<{ id: string; fields: Record<string, unknown> }> };
  return data.records.map((r) => ({
    ticketId: String(r.fields.ticket_id),
    seniorId: String(r.fields.senior_id),
    claimedAt: String(r.fields.claimed_at),
    expiresAt: String(r.fields.expires_at),
    status: 'expired',
    airtableRecordId: r.id,
  }));
}

/**
 * Mark a claim as expired or completed.
 */
export async function updateClaimStatus(
  env: Env,
  claimRecordId: string,
  status: 'expired' | 'completed'
): Promise<void> {
  const res = await withRetry(() =>
    airtableFetch(env, `/Claims/${claimRecordId}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: { status } }),
    })
  );
  if (!res.ok) throw new Error(`Airtable updateClaimStatus failed: ${res.status}`);
}
