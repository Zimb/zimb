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

const { OctokitGithubBot } = await import('../adapters/githubBot.real');

const ENV = {
  GITHUB_APP_ID: '4972133',
  GITHUB_PRIVATE_KEY: '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----',
  GITHUB_WEBHOOK_SECRET: 'whsec_test',
};

beforeEach(() => {
  mockRequest.mockReset();
  mockRequest.mockImplementation(async (route: string) => {
    if (route === 'GET /repos/{owner}/{repo}/installation' || route === 'GET /orgs/{org}/installation') {
      return { data: { id: 162363820 } };
    }
    if (route === 'GET /users/{username}') {
      return { data: { type: 'Organization' } };
    }
    throw new Error(`Unexpected unmocked request: ${route}`);
  });
});

describe('OctokitGithubBot', () => {
  it('createTicketRepo POSTs the right payload', async () => {
    mockRequest.mockImplementation(async (route: string) => {
      if (route === 'GET /repos/{owner}/{repo}/installation' || route === 'GET /orgs/{org}/installation') {
        return { data: { id: 162363820 } };
      }
      if (route === 'GET /users/{username}') {
        return { data: { type: 'Organization' } };
      }
      if (route === 'POST /orgs/{org}/repos') {
        return { data: { html_url: 'https://github.com/Zimb/zimb-T-0001' } };
      }
      throw new Error(`Unexpected unmocked request: ${route}`);
    });
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
    mockRequest.mockImplementation(async (route: string) => {
      if (route === 'GET /repos/{owner}/{repo}/installation' || route === 'GET /orgs/{org}/installation') {
        return { data: { id: 162363820 } };
      }
      if (route === 'GET /users/{username}') {
        return { data: { type: 'Organization' } };
      }
      if (route === 'POST /orgs/{org}/repos') {
        const error = new Error('Already exists');
        (error as { status?: number }).status = 422;
        throw error;
      }
      if (route === 'GET /repos/{owner}/{repo}') {
        return { data: { html_url: 'https://github.com/Zimb/zimb-T-0002' } };
      }
      throw new Error(`Unexpected unmocked request: ${route}`);
    });
    const bot = new OctokitGithubBot(ENV);
    const url = await bot.createTicketRepo({ ticketId: 'T-0002', title: 'x' });
    expect(url).toBe('https://github.com/Zimb/zimb-T-0002');
  });

  it('createBranch fetches main SHA then creates ref', async () => {
    mockRequest.mockImplementation(async (route: string) => {
      if (route === 'GET /repos/{owner}/{repo}/installation' || route === 'GET /orgs/{org}/installation') {
        return { data: { id: 162363820 } };
      }
      if (route === 'GET /repos/{owner}/{repo}/git/ref/{ref}') {
        return { data: { object: { sha: 'abc123' } } };
      }
      if (route === 'POST /repos/{owner}/{repo}/git/refs') {
        return { data: {} };
      }
      throw new Error(`Unexpected unmocked request: ${route}`);
    });
    const bot = new OctokitGithubBot(ENV);
    const branch = await bot.createBranch({ ticketId: 'T-0001', title: 'x' });
    expect(branch).toBe('zimb/T-0001');
    expect(mockRequest).toHaveBeenCalledWith(
      'GET /repos/{owner}/{repo}/git/ref/{ref}',
      expect.objectContaining({ ref: 'heads/main' })
    );
    expect(mockRequest).toHaveBeenCalledWith(
      'POST /repos/{owner}/{repo}/git/refs',
      expect.objectContaining({ ref: 'refs/heads/zimb/T-0001', sha: 'abc123' })
    );
  });

  it('createBranch is idempotent on 422', async () => {
    mockRequest.mockImplementation(async (route: string) => {
      if (route === 'GET /repos/{owner}/{repo}/installation' || route === 'GET /orgs/{org}/installation') {
        return { data: { id: 162363820 } };
      }
      if (route === 'GET /repos/{owner}/{repo}/git/ref/{ref}') {
        return { data: { object: { sha: 'abc' } } };
      }
      if (route === 'POST /repos/{owner}/{repo}/git/refs') {
        const error = new Error('Ref already exists');
        (error as { status?: number }).status = 422;
        throw error;
      }
      throw new Error(`Unexpected unmocked request: ${route}`);
    });
    const bot = new OctokitGithubBot(ENV);
    const branch = await bot.createBranch({ ticketId: 'T-0001', title: 'x' });
    expect(branch).toBe('zimb/T-0001');
  });

  it('inviteSenior always uses permission=push', async () => {
    mockRequest.mockImplementation(async (route: string) => {
      if (route === 'GET /repos/{owner}/{repo}/installation' || route === 'GET /orgs/{org}/installation') {
        return { data: { id: 162363820 } };
      }
      if (route === 'PUT /repos/{owner}/{repo}/collaborators/{username}') {
        return { data: {} };
      }
      throw new Error(`Unexpected unmocked request: ${route}`);
    });
    const bot = new OctokitGithubBot(ENV);
    await bot.inviteSenior({ ticketId: 'T-0001', seniorGhLogin: 'bob' });
    expect(mockRequest).toHaveBeenCalledWith(
      'PUT /repos/{owner}/{repo}/collaborators/{username}',
      expect.objectContaining({ username: 'bob', permission: 'push' })
    );
  });

  it('inviteSenior swallows 422 (already collaborator)', async () => {
    mockRequest.mockImplementation(async (route: string) => {
      if (route === 'GET /repos/{owner}/{repo}/installation' || route === 'GET /orgs/{org}/installation') {
        return { data: { id: 162363820 } };
      }
      if (route === 'PUT /repos/{owner}/{repo}/collaborators/{username}') {
        const error = new Error('Already collaborator');
        (error as { status?: number }).status = 422;
        throw error;
      }
      throw new Error(`Unexpected unmocked request: ${route}`);
    });
    const bot = new OctokitGithubBot(ENV);
    await expect(
      bot.inviteSenior({ ticketId: 'T-0001', seniorGhLogin: 'bob' })
    ).resolves.toBeUndefined();
  });

  it('inviteSenior rethrows non-422 errors', async () => {
    mockRequest.mockImplementation(async (route: string) => {
      if (route === 'GET /repos/{owner}/{repo}/installation' || route === 'GET /orgs/{org}/installation') {
        return { data: { id: 162363820 } };
      }
      if (route === 'PUT /repos/{owner}/{repo}/collaborators/{username}') {
        const error = new Error('Server error');
        (error as { status?: number }).status = 500;
        throw error;
      }
      throw new Error(`Unexpected unmocked request: ${route}`);
    });
    const bot = new OctokitGithubBot(ENV);
    await expect(
      bot.inviteSenior({ ticketId: 'T-0001', seniorGhLogin: 'bob' })
    ).rejects.toMatchObject({ status: 500 });
  });

  it('revokeSenior swallows 404', async () => {
    mockRequest.mockImplementation(async (route: string) => {
      if (route === 'GET /repos/{owner}/{repo}/installation' || route === 'GET /orgs/{org}/installation') {
        return { data: { id: 162363820 } };
      }
      if (route === 'DELETE /repos/{owner}/{repo}/collaborators/{username}') {
        const error = new Error('Not found');
        (error as { status?: number }).status = 404;
        throw error;
      }
      throw new Error(`Unexpected unmocked request: ${route}`);
    });
    const bot = new OctokitGithubBot(ENV);
    await expect(
      bot.revokeSenior({ ticketId: 'T-0001', seniorGhLogin: 'bob' })
    ).resolves.toBeUndefined();
  });

  it('revokeSenior rethrows non-404 errors', async () => {
    mockRequest.mockImplementation(async (route: string) => {
      if (route === 'GET /repos/{owner}/{repo}/installation' || route === 'GET /orgs/{org}/installation') {
        return { data: { id: 162363820 } };
      }
      if (route === 'DELETE /repos/{owner}/{repo}/collaborators/{username}') {
        const error = new Error('Server error');
        (error as { status?: number }).status = 500;
        throw error;
      }
      throw new Error(`Unexpected unmocked request: ${route}`);
    });
    const bot = new OctokitGithubBot(ENV);
    await expect(
      bot.revokeSenior({ ticketId: 'T-0001', seniorGhLogin: 'bob' })
    ).rejects.toMatchObject({ status: 500 });
  });
});
