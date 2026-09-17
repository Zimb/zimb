/**
 * Unit tests — Delivery service (M3.2)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeliveryError, markTicketDelivered } from '../services/delivery';
import type { GithubBotService } from '../adapters/githubBot';
import type { Ticket } from '../types/ticket';

// ── Mocks ──────────────────────────────────────────────────────
const mockGetTicketByZimbId = vi.fn();
const mockUpdateTicket = vi.fn();

vi.mock('../adapters/airtable', () => ({
  getTicketByZimbId: (...args: unknown[]) => mockGetTicketByZimbId(...args),
  updateTicket: (...args: unknown[]) => mockUpdateTicket(...args),
}));

const fakeBot: GithubBotService = {
  createTicketRepo: vi.fn(async () => 'https://github.com/zimb-app/zimb-T-0001'),
  createBranch: vi.fn(async () => 'zimb/T-0001'),
  inviteSenior: vi.fn(async () => undefined),
  revokeSenior: vi.fn(async () => undefined),
};

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'T-0001',
    title: 'CORS bug',
    description: 'fix cors',
    bounty: 5000,
    urgency: 'high',
    languages: ['TypeScript'],
    repoUrl: 'https://github.com/zimb-app/zimb-T-0001',
    status: 'claimed',
    channel: 'web',
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'alice',
    claimedBy: 'bob',
    airtableRecordId: 'recABC123',
    ...overrides,
  };
}

const ENV = { ENVIRONMENT: 'development' } as never;

describe('markTicketDelivered', () => {
  beforeEach(() => {
    mockGetTicketByZimbId.mockReset();
    mockUpdateTicket.mockReset();
    vi.mocked(fakeBot.createTicketRepo).mockClear();
    vi.mocked(fakeBot.inviteSenior).mockClear();
    vi.mocked(fakeBot.revokeSenior).mockClear();
  });

  it('happy path: stamps delivered without touching GitHub (done at /claim)', async () => {
    const ticket = makeTicket();
    mockGetTicketByZimbId.mockResolvedValueOnce(ticket);
    mockUpdateTicket.mockResolvedValueOnce({ ...ticket, status: 'delivered', deliveredAt: '2026-01-01T01:00:00.000Z' });

    const result = await markTicketDelivered(ENV, 'T-0001', 'bob', fakeBot);

    expect(result.status).toBe('delivered');
    expect(result.deliveredAt).toBeDefined();
    // GitHub ops happen at /claim, not /deliver.
    expect(fakeBot.createTicketRepo).not.toHaveBeenCalled();
    expect(fakeBot.inviteSenior).not.toHaveBeenCalled();
    expect(mockUpdateTicket).toHaveBeenCalledWith(
      ENV,
      'recABC123',
      '*',
      expect.objectContaining({
        status: 'delivered',
        deliveredAt: expect.any(String),
      })
    );
  });

  it('throws not_found when ticket is missing', async () => {
    mockGetTicketByZimbId.mockResolvedValueOnce(null);
    await expect(markTicketDelivered(ENV, 'T-9999', 'bob', fakeBot)).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('throws forbidden when senior is not the claimer', async () => {
    mockGetTicketByZimbId.mockResolvedValue(makeTicket({ claimedBy: 'charlie' }));
    await expect(markTicketDelivered(ENV, 'T-0001', 'bob', fakeBot)).rejects.toBeInstanceOf(
      DeliveryError
    );
    await expect(markTicketDelivered(ENV, 'T-0001', 'bob', fakeBot)).rejects.toMatchObject({
      code: 'forbidden',
    });
  });

  it('throws invalid_state when ticket is open', async () => {
    mockGetTicketByZimbId.mockResolvedValueOnce(makeTicket({ status: 'open' }));
    await expect(markTicketDelivered(ENV, 'T-0001', 'bob', fakeBot)).rejects.toMatchObject({
      code: 'invalid_state',
    });
  });

  it('throws invalid_state when ticket is already delivered', async () => {
    mockGetTicketByZimbId.mockResolvedValueOnce(makeTicket({ status: 'delivered' }));
    await expect(markTicketDelivered(ENV, 'T-0001', 'bob', fakeBot)).rejects.toMatchObject({
      code: 'invalid_state',
    });
  });

  it('accepts in_progress as a valid prior state', async () => {
    mockGetTicketByZimbId.mockResolvedValueOnce(makeTicket({ status: 'in_progress' }));
    mockUpdateTicket.mockResolvedValueOnce(makeTicket({ status: 'delivered' }));
    const result = await markTicketDelivered(ENV, 'T-0001', 'bob', fakeBot);
    expect(result.status).toBe('delivered');
  });

  it('retries on concurrent modification then succeeds', async () => {
    const ticket = makeTicket();
    mockGetTicketByZimbId
      .mockResolvedValueOnce(ticket)
      .mockResolvedValueOnce(ticket);
    mockUpdateTicket.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...ticket, status: 'delivered' });

    const result = await markTicketDelivered(ENV, 'T-0001', 'bob', fakeBot);
    expect(result.status).toBe('delivered');
    expect(mockUpdateTicket).toHaveBeenCalledTimes(2);
  });

  it('throws concurrent_modification after retries exhausted', async () => {
    const ticket = makeTicket();
    mockGetTicketByZimbId.mockResolvedValue(ticket);
    mockUpdateTicket.mockResolvedValue(null);

    await expect(markTicketDelivered(ENV, 'T-0001', 'bob', fakeBot)).rejects.toMatchObject({
      code: 'concurrent_modification',
    });
  });
});
