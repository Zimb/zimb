/**
 * Unit tests — OctokitGithubBot (M3.x)
 *
 * Mock @octokit/rest so we can verify every GitHub API call deterministically.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRequest = vi.fn();

vi.mock('@octokit/rest', () => {
  return {
    Octokit: class FakeOctokit {
      request = mockRequest;
    },
  };
});

// Import AFTER the mock is registered
const { OctokitGithubBot } = await import('../adapters/githubBot.real');

const ENV = {
  GITHUB_APP_ID: '4972133',
  GITHUB_PRIVATE_KEY: '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----',
  GITHUB_WEBHOOK_SECRET: 'whsec_test',
};

beforeEach(() => {
  mockRequest.mockReset();
  // Always make the installation lookup succeed on the second call.
  // The first call (list installations) sets the cached installationId.
  mockRequest.mockImplementation(async (route: string) => {
    if (route === 'GET /orgs/{org}/installations') {
      return { data: { installations: [{ id: 162363820 }] } };
    }
    throw new Error(`Unexpected unmocked request: ${route}`);
  });
});

describe('OctokitGithubBot', () => {
  it('createTicketRepo POSTs the right payload', async () => {
    mockRequest
      .mockResolvedValueOnce({ data: { installations: [{ id: 162363820 }] } })
      .mockResolvedValueOnce({ data: { html_url: 'https://github.com/Zimb/zimb-T-0001' } });
    const bot = new OctokitGithubBot(ENV);
    const url = await bot.createTicketRepo({ ticketId: 'T-0001', title: 'CORS bug' });
    expect(url).toBe('https://github.com/Zimb/zimb-T-0001');
    expect(mockRequest).toHaveBeenCalledWith(
      'POST /orgs/{org}/repos',
      expect.objectContaining({
        org: 'Zimb',
        name: 'zimb-T-0001',
        private: true,
        description: 'Zimb ticket T-0001 — CORS bug',
        auto_init: true,
      })
    );
  });

  it('createTicketRepo returns existing URL on 422', async () => {
    mockRequest
      .mockResolvedValueOnce({ data: { installations: [{ id: 162363820 }] } })
      .mockRejectedValueOnce({ status: 422 })
      .mockResolvedValueOnce({ data: { html_url: 'https://github.com/Zimb/zimb-T-0002' } });
    const bot = new OctokitGithubBot(ENV);
    const url = await bot.createTicketRepo({ ticketId: 'T-0002', title: 'x' });
    expect(url).toBe('https://github.com/Zimb/zimb-T-0002');
    expect(mockRequest).toHaveBeenCalledTimes(3);
  });

  it('createBranch fetches main SHA then creates ref', async () => {
    mockRequest
      .mockResolvedValueOnce({ data: { installations: [{ id: 162363820 }] } })
      .mockResolvedValueOnce({ data: { object: { sha: 'abc123' } } })
      .mockResolvedValueOnce({ data: {} });
    const bot = new OctokitGithubBot(ENV);
    const branch = await bot.createBranch({ ticketId: 'T-0001', title: 'x' });
    expect(branch).toBe('zimb/T-0001');
    expect(mockRequest).toHaveBeenNthCalledWith(
      2,
      'GET /repos/{owner}/{repo}/git/ref/{ref}',
      expect.objectContaining({ ref: 'heads/main' })
    );
    expect(mockRequest).toHaveBeenNthCalledWith(
      3,
      'POST /repos/{owner}/{repo}/git/refs',
      expect.objectContaining({ ref: 'refs/heads/zimb/T-0001', sha: 'abc123' })
    );
  });

  it('createBranch is idempotent on 422', async () => {
    mockRequest
      .mockResolvedValueOnce({ data: { installations: [{ id: 162363820 }] } })
      .mockResolvedValueOnce({ data: { object: { sha: 'abc' } } })
      .mockRejectedValueOnce({ status: 422 });
    const bot = new OctokitGithubBot(ENV);
    const branch = await bot.createBranch({ ticketId: 'T-0001', title: 'x' });
    expect(branch).toBe('zimb/T-0001');
  });

  it('inviteSenior always uses permission=push', async () => {
    mockRequest
      .mockResolvedValueOnce({ data: { installations: [{ id: 162363820 }] } })
      .mockResolvedValueOnce({ data: {} });
    const bot = new OctokitGithubBot(ENV);
    await bot.inviteSenior({ ticketId: 'T-0001', seniorGhLogin: 'bob' });
    expect(mockRequest).toHaveBeenLastCalledWith(
      'PUT /repos/{owner}/{repo}/collaborators/{username}',
      expect.objectContaining({ username: 'bob', permission: 'push' })
    );
  });

  it('inviteSenior swallows 422 (already collaborator)', async () => {
    mockRequest
      .mockResolvedValueOnce({ data: { installations: [{ id: 162363820 }] } })
      .mockRejectedValueOnce({ status: 422 });
    const bot = new OctokitGithubBot(ENV);
    await expect(
      bot.inviteSenior({ ticketId: 'T-0001', seniorGhLogin: 'bob' })
    ).resolves.toBeUndefined();
  });

  it('inviteSenior rethrows non-422 errors', async () => {
    mockRequest
      .mockResolvedValueOnce({ data: { installations: [{ id: 162363820 }] } })
      .mockRejectedValueOnce({ status: 500 });
    const bot = new OctokitGithubBot(ENV);
    await expect(
      bot.inviteSenior({ ticketId: 'T-0001', seniorGhLogin: 'bob' })
    ).rejects.toMatchObject({ status: 500 });
  });

  it('revokeSenior swallows 404', async () => {
    mockRequest
      .mockResolvedValueOnce({ data: { installations: [{ id: 162363820 }] } })
      .mockRejectedValueOnce({ status: 404 });
    const bot = new OctokitGithubBot(ENV);
    await expect(
      bot.revokeSenior({ ticketId: 'T-0001', seniorGhLogin: 'bob' })
    ).resolves.toBeUndefined();
  });

  it('revokeSenior rethrows non-404 errors', async () => {
    mockRequest
      .mockResolvedValueOnce({ data: { installations: [{ id: 162363820 }] } })
      .mockRejectedValueOnce({ status: 500 });
    const bot = new OctokitGithubBot(ENV);
    await expect(
      bot.revokeSenior({ ticketId: 'T-0001', seniorGhLogin: 'bob' })
    ).rejects.toMatchObject({ status: 500 });
  });
});
