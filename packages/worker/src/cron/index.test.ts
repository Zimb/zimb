/**
 * Unit tests for the cron dispatcher.
 * Uses vi.mock to stub the Airtable adapter.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the airtable adapter BEFORE importing the cron module
vi.mock('../adapters/airtable', () => ({
  listExpiredClaims: vi.fn(),
  updateClaimStatus: vi.fn(),
  getTicketByZimbId: vi.fn(),
  updateTicket: vi.fn(),
}));

import { listExpiredClaims, updateClaimStatus, getTicketByZimbId, updateTicket } from '../adapters/airtable';
import { expireClaims, runCronJobs } from './index';
import type { Env } from '../types/env';

const fakeEnv = {} as Env;

describe('expireClaims', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when no expired claims', async () => {
    vi.mocked(listExpiredClaims).mockResolvedValue([]);
    const result = await expireClaims(fakeEnv);
    expect(result.expiredCount).toBe(0);
    expect(updateClaimStatus).not.toHaveBeenCalled();
  });

  it('marks expired claims and resets tickets to open', async () => {
    vi.mocked(listExpiredClaims).mockResolvedValue([
      {
        ticketId: 'T-0001',
        seniorId: 'senior-alice',
        claimedAt: new Date(Date.now() - 60 * 60_000).toISOString(),
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
        status: 'expired',
        airtableRecordId: 'recCLAIM1',
      },
    ]);
    vi.mocked(getTicketByZimbId).mockResolvedValue({
      id: 'T-0001',
      title: '',
      description: '',
      bounty: 5000,
      urgency: 'high',
      languages: ['TypeScript'],
      repoUrl: '',
      status: 'claimed',
      channel: 'web',
      createdAt: '',
      createdBy: 'client1',
      airtableRecordId: 'recTICKET1',
    });
    vi.mocked(updateTicket).mockResolvedValue({} as never);

    const result = await expireClaims(fakeEnv);

    expect(result.expiredCount).toBe(1);
    expect(updateClaimStatus).toHaveBeenCalledWith(fakeEnv, 'recCLAIM1', 'expired');
    expect(updateTicket).toHaveBeenCalledWith(fakeEnv, 'recTICKET1', '*', { status: 'open' });
  });

  it('skips tickets that are no longer in "claimed" state', async () => {
    vi.mocked(listExpiredClaims).mockResolvedValue([
      {
        ticketId: 'T-0002',
        seniorId: 'senior-alice',
        claimedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        status: 'expired',
        airtableRecordId: 'recCLAIM2',
      },
    ]);
    // Ticket already in "delivered" status — should NOT be reset to open
    vi.mocked(getTicketByZimbId).mockResolvedValue({
      id: 'T-0002',
      title: '',
      description: '',
      bounty: 5000,
      urgency: 'high',
      languages: ['TypeScript'],
      repoUrl: '',
      status: 'delivered',
      channel: 'web',
      createdAt: '',
      createdBy: 'client1',
      airtableRecordId: 'recTICKET2',
    });

    const result = await expireClaims(fakeEnv);

    expect(result.expiredCount).toBe(1);
    expect(updateClaimStatus).toHaveBeenCalled();
    expect(updateTicket).not.toHaveBeenCalled(); // ticket was already delivered
  });

  it('continues processing even if one ticket fails', async () => {
    vi.mocked(listExpiredClaims).mockResolvedValue([
      {
        ticketId: 'T-0003',
        seniorId: 'senior-alice',
        claimedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        status: 'expired',
        airtableRecordId: 'recCLAIM3',
      },
      {
        ticketId: 'T-0004',
        seniorId: 'senior-bob',
        claimedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        status: 'expired',
        airtableRecordId: 'recCLAIM4',
      },
    ]);
    vi.mocked(getTicketByZimbId).mockRejectedValue(new Error('Airtable down'));
    vi.mocked(updateClaimStatus).mockResolvedValue();

    const result = await expireClaims(fakeEnv);

    // Both claims should be marked expired (they happen before the ticket lookup)
    expect(updateClaimStatus).toHaveBeenCalledTimes(2);
    // Both tickets fail to lookup → 0 successfully reset
    expect(result.expiredCount).toBe(0);
  });
});

describe('runCronJobs dispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches "*/1 * * * *" to expireClaims', async () => {
    vi.mocked(listExpiredClaims).mockResolvedValue([]);
    await runCronJobs('*/1 * * * *', fakeEnv);
    expect(listExpiredClaims).toHaveBeenCalled();
  });

  it('logs and does nothing for unknown crons', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runCronJobs('0 0 * * 0', fakeEnv);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('no handler'));
    consoleSpy.mockRestore();
  });
});
