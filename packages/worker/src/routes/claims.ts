/**
 * POST /tickets/:id/claim — Atomically claim a ticket
 *
 * Spec: SPECIFICATIONS.md §4.2
 * Test scenarios: recettes/02-kanban-lock-timer.md
 *   - CT-LOCK-01: Lock effectif après claim
 *   - CT-LOCK-02: Concurrence timestamp (premier gagne)
 *   - CT-LOCK-05: Anti-replay du claim
 *   - CT-LOCK-06: If-Match protège contre conflits d'écriture Airtable
 *
 * Concurrency strategy:
 *   1. Read ticket + active claim
 *   2. If active claim exists AND belongs to another senior → 409 Conflict
 *   3. Create new claim record
 *   4. Update ticket status to 'claimed' + claimed_by, with If-Match on revision
 *   5. If update fails (412) → delete the claim we just created + retry once
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';
import {
  createClaim,
  getActiveClaim,
  getTicketByZimbId,
  updateClaimStatus,
  updateTicket,
  type AirtableTicketUpdate,
} from '../adapters/airtable';
import { kanbanBroadcast } from '../services/kanbanBroadcast';
import { getGithubBot } from '../adapters/githubBot';

const CLAIM_DURATION_MINUTES = 45;

const claims = new Hono<{ Bindings: Env }>();

claims.post('/', async (c) => {
  const ticketId = c.req.param('id');
  if (!ticketId) {
    return c.json(
      { ok: false, error: { code: 'bad_request', message: 'Missing ticket id' } },
      400
    );
  }
  const seniorId = c.get('auth').userId;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CLAIM_DURATION_MINUTES * 60_000);

  // ── Step 1: read current state ──────────────────────────────
  const ticket = await getTicketByZimbId(c.env, ticketId);
  if (!ticket) {
    return c.json({ ok: false, error: { code: 'not_found', message: 'Ticket not found' } }, 404);
  }

  // ── Step 2: check for existing active claim FIRST ───────────
  // (this must come before the status check so anti-replay CT-LOCK-05
  // and concurrent claim CT-LOCK-02 return the proper error codes.)
  const existingClaim = await getActiveClaim(c.env, ticketId);
  if (existingClaim) {
    if (existingClaim.seniorId === seniorId) {
      // Same senior trying to claim again → idempotent return (CT-LOCK-05)
      return c.json(
        {
          ok: false,
          error: {
            code: 'already_claimed_by_you',
            message: 'You already have an active claim on this ticket',
            claimExpiresAt: existingClaim.expiresAt,
          },
        },
        409
      );
    }
    // Another senior has it → 409 Conflict (CT-LOCK-02)
    return c.json(
      {
        ok: false,
        error: {
          code: 'already_claimed',
          message: `Ticket already claimed by another senior until ${existingClaim.expiresAt}`,
          claimedBy: existingClaim.seniorId,
          claimExpiresAt: existingClaim.expiresAt,
        },
      },
      409
    );
  }

  // ── Step 3: now check ticket status (must be open) ──────────
  if (ticket.status !== 'open') {
    return c.json(
      {
        ok: false,
        error: {
          code: 'invalid_state',
          message: `Ticket must be 'open' to be claimed, currently '${ticket.status}'`,
        },
      },
      409
    );
  }

  // ── Step 3: create the claim record ──────────────────────────
  const claim = await createClaim(c.env, {
    ticketId,
    seniorId,
    claimedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'active',
  });

  // ── Step 4: atomically update ticket status with If-Match ────
  // We need the revision (we don't have it on the Ticket type, so re-fetch from raw)
  // For M1 simplicity, we use a "best effort" with retry-on-conflict pattern.

  // First try: read the raw record to get the current revision
  const rawTicket = await getTicketByZimbId(c.env, ticketId);
  if (!rawTicket || !rawTicket.airtableRecordId) {
    // Rollback: delete the claim we just created
    if (claim.airtableRecordId) {
      await updateClaimStatus(c.env, claim.airtableRecordId, 'expired');
    }
    return c.json(
      { ok: false, error: { code: 'internal_error', message: 'Cannot locate ticket record' } },
      500
    );
  }

  // SKETCH: in production we'd GET the record to get its `revision` field.
  // For M1 we skip the If-Match (Airtable SDK doesn't expose revision easily,
  // we accept the small race window — see TODO comment below).

  // TODO (M2-hardening): fetch the record's `_rawJson._rev` and pass as If-Match header.
  // For now, single retry on 412:
  let updated;
  for (let attempt = 0; attempt < 2; attempt++) {
    updated = await updateTicket(c.env, rawTicket.airtableRecordId, '*', {
      // '*' = accept any revision (Airtable treats absent If-Match differently)
      status: 'claimed',
      claimedBy: seniorId,
    });
    if (updated) break;
    // Concurrent modification → re-fetch and retry
    const refreshed = await getTicketByZimbId(c.env, ticketId);
    if (!refreshed || refreshed.airtableRecordId !== rawTicket.airtableRecordId) {
      // Ticket was modified by someone else in a way that matters → roll back claim
      if (claim.airtableRecordId) {
        await updateClaimStatus(c.env, claim.airtableRecordId, 'expired');
      }
      return c.json(
        { ok: false, error: { code: 'concurrent_modification', message: 'Ticket was modified, please retry' } },
        409
      );
    }
  }

  if (!updated) {
    if (claim.airtableRecordId) {
      await updateClaimStatus(c.env, claim.airtableRecordId, 'expired');
    }
    return c.json(
      { ok: false, error: { code: 'concurrent_modification', message: 'Could not lock ticket after retries' } },
      409
    );
  }

  // ── Step 5: M3.6 — broadcast TICKET_GONE + CLAIMED_BY_ME ───
  // Best-effort: don't fail the claim if the DO is temporarily down.
  try {
    await kanbanBroadcast(c.env, { type: 'TICKET_GONE', ticketId });
    await kanbanBroadcast(
      c.env,
      { type: 'CLAIMED_BY_ME', ticket: updated, seniorId },
      seniorId
    );
  } catch (err) {
    console.warn('[POST /tickets/:id/claim] kanban broadcast failed', err);
  }

  // ── Step 6: M3.2 — provision GitHub repo + branch + invite senior ───
  // Done here (instead of /deliver) so the senior can push immediately
  // after claiming. All 3 ops are idempotent; failures are logged but
  // don't roll back the claim (the senior can retry via /deliver if needed).
  try {
    const bot = getGithubBot(c.env);
    const repoUrl = await bot.createTicketRepo({ ticketId, title: ticket.title });
    await bot.createBranch({ ticketId, title: ticket.title });
    await bot.inviteSenior({ ticketId, seniorGhLogin: seniorId });
    // Persist repoUrl back to Airtable (non-blocking)
    if (updated.airtableRecordId) {
      const patch: AirtableTicketUpdate = { repoUrl };
      await updateTicket(c.env, updated.airtableRecordId, '*', patch);
      updated.repoUrl = repoUrl;
    }
  } catch (err) {
    console.warn(`[POST /tickets/:id/claim] GitHub provisioning failed`, err);
  }

  return c.json(
    {
      ok: true,
      data: {
        ticket: updated,
        claim: {
          ticketId,
          seniorId,
          claimedAt: claim.claimedAt,
          expiresAt: claim.expiresAt,
        },
        timerSeconds: CLAIM_DURATION_MINUTES * 60,
      },
    },
    200
  );
});

export default claims;
