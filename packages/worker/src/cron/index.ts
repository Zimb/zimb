/**
 * Cron job dispatcher.
 *
 * Spec: SPECIFICATIONS.md §4.2.2 + §6.1 (cron section)
 * Configured in wrangler.toml under [triggers].
 *
 * M2: only the expire-claims job is implemented (every 1 min).
 * M3: auto-validate 24h (every 1 hour)
 * M5: sla-escalation (every 30 min)
 */
import type { Env } from '../types/env';
import {
  getTicketByZimbId,
  listExpiredClaims,
  updateClaimStatus,
  updateTicket,
} from '../adapters/airtable';

/**
 * Job: expire-claims (cron: every 1 minute)
 *
 * - Finds active claims whose expires_at < now()
 * - Marks them as 'expired'
 * - Resets the ticket to status 'open' so other seniors can claim
 * - Logs to console (production: would notify the client + original senior)
 */
export async function expireClaims(env: Env): Promise<{ expiredCount: number }> {
  const expired = await listExpiredClaims(env);

  let count = 0;
  for (const claim of expired) {
    if (!claim.airtableRecordId) continue;
    try {
      // 1. Mark claim as expired
      await updateClaimStatus(env, claim.airtableRecordId, 'expired');

      // 2. Reset ticket to open so it returns to the pool
      const ticket = await getTicketByZimbId(env, claim.ticketId);
      if (ticket && ticket.airtableRecordId && ticket.status === 'claimed') {
        await updateTicket(env, ticket.airtableRecordId, '*', {
          status: 'open',
        });
      }

      console.log(`[cron:expire-claims] ${claim.ticketId} expired (was held by ${claim.seniorId})`);
      count++;
    } catch (err) {
      console.error(`[cron:expire-claims] failed for ${claim.ticketId}`, err);
    }
  }

  if (count > 0) {
    console.log(`[cron:expire-claims] processed ${count} expired claims`);
  }

  return { expiredCount: count };
}

/**
 * Top-level dispatcher — called by the Worker scheduled handler.
 */
export async function runCronJobs(cron: string, env: Env): Promise<void> {
  console.log(`[cron] Triggered: ${cron}`);

  if (cron === '*/1 * * * *') {
    await expireClaims(env);
    return;
  }

  // Other crons will be added in M3/M5:
  // if (cron === '0 * * * *')        return autoValidate24h(env);
  // if (cron === '*/30 * * * *')     return slaEscalation(env);

  console.log(`[cron] no handler for "${cron}"`);
}
