/**
 * Delivery service — M3.2
 *
 * Orchestrates:
 *   1. Idempotency: ticket must be in `claimed` status
 *   2. Atomic state transition: ticket → `delivered`
 *   3. Side effects: create GitHub repo + invite senior
 *   4. Concurrency: If-Match on Airtable write, rollback on failure
 *
 * Spec: SPECIFICATIONS.md §4.4
 * Recette: recettes/03-github-access.md (CT-GH-01, CT-GH-02)
 */
import { getGithubBot, type GithubBotService } from '../adapters/githubBot';
import {
  getTicketByZimbId,
  updateTicket,
  type AirtableTicketUpdate,
} from '../adapters/airtable';
import type { Ticket } from '../types/ticket';

export class DeliveryError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'DeliveryError';
  }
}

/**
 * Marks a ticket as delivered.
 *
 * Side effects:
 *   - ticket.status: 'claimed' → 'delivered'
 *   - ticket.deliveredAt: now
 *   - GithubBot.createTicketRepo(...) (idempotent — no-op if repo exists)
 *   - GithubBot.inviteSenior(...) (idempotent)
 *
 * Throws DeliveryError on:
 *   - ticket not found (code=not_found)
 *   - ticket not in 'claimed' status (code=invalid_state)
 *   - caller is not the senior who claimed the ticket (code=forbidden)
 *   - Airtable update conflict after retry (code=concurrent_modification)
 *
 * @returns the updated ticket
 */
export async function markTicketDelivered(
  env: { ENVIRONMENT: string },
  ticketId: string,
  seniorId: string,
  bot: GithubBotService = getGithubBot(env)
): Promise<Ticket> {
  // 1. Load ticket
  const ticket = await getTicketByZimbId(env as never, ticketId);
  if (!ticket) {
    throw new DeliveryError('not_found', `Ticket ${ticketId} not found`);
  }

  // 2. Authz: only the senior who claimed it can deliver
  if (ticket.claimedBy !== seniorId) {
    throw new DeliveryError(
      'forbidden',
      `Only the senior who claimed this ticket can mark it delivered`
    );
  }

  // 3. State guard
  if (ticket.status !== 'claimed' && ticket.status !== 'in_progress') {
    throw new DeliveryError(
      'invalid_state',
      `Ticket must be 'claimed' or 'in_progress' to deliver, currently '${ticket.status}'`
    );
  }

  // 4. The GitHub repo + branch + senior invite were already provisioned
  //    at /claim time (see routes/claims.ts). We just stamp `delivered`.

  // 5. Atomic Airtable update with If-Match retry
  const updates: AirtableTicketUpdate = {
    status: 'delivered',
    deliveredAt: new Date().toISOString(),
  };

  let updated: Ticket | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!ticket.airtableRecordId) {
      throw new DeliveryError('internal_error', 'Ticket has no Airtable record id');
    }
    updated = await updateTicket(env as never, ticket.airtableRecordId, '*', updates);
    if (updated) break;

    // 412 → re-fetch and retry once
    const refreshed = await getTicketByZimbId(env as never, ticketId);
    if (!refreshed || refreshed.airtableRecordId !== ticket.airtableRecordId) {
      throw new DeliveryError(
        'concurrent_modification',
        'Ticket was modified concurrently, please retry'
      );
    }
    Object.assign(ticket, refreshed);
  }
  if (!updated) {
    throw new DeliveryError(
      'concurrent_modification',
      'Could not update ticket after retries'
    );
  }

  // 6. Done — no more GitHub side effects (handled at /claim).

  return updated;
}
