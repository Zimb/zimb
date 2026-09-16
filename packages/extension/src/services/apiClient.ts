import type { GitHubAuthService } from '../auth/github';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  bounty: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  languages: string[];
  repoUrl: string;
  status: string;
  createdAt: string;
  claimedBy?: string;
}

/**
 * REST client for api.zimb.app.
 * Adds the `X-Zimb-Client: vscode` header on every request (CT-WEB-04).
 */
export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly auth: GitHubAuthService
  ) {}

  async getTicket(ticketId: string): Promise<Ticket> {
    const res = await this.fetch(`/tickets/${ticketId}`);
    if (!res.ok) throw new Error(`Failed to fetch ticket: ${res.status}`);
    const json = (await res.json()) as { ok: boolean; data: Ticket };
    return json.data;
  }

  async createTicket(input: Partial<Ticket>): Promise<Ticket> {
    const res = await this.fetch('/tickets', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`Failed to create ticket: ${res.status}`);
    const json = (await res.json()) as { ok: boolean; data: Ticket };
    return json.data;
  }

  private async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.auth.getAccessToken();
    const headers = new Headers(init.headers);
    headers.set('X-Zimb-Client', 'vscode');
    headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);

    return fetch(`${this.baseUrl}${path}`, { ...init, headers });
  }
}
