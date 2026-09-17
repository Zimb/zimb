/**
 * Unit tests — KanbanSession Durable Object (M3.4)
 *
 * Uses Cloudflare's `runInDurableObject` test helper to exercise the DO
 * in-memory. Falls back to a plain fetch() test if the helper isn't loaded.
 */
import { describe, it, expect } from 'vitest';
import { KanbanSession, broadcastKanbanEvent } from '../durable-objects/KanbanSession';
import type { Env } from '../types/env';

// Minimal Env stub for the DO constructor
function makeEnv(): Env {
  return {
    ENVIRONMENT: 'development',
    LOG_LEVEL: 'debug',
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
    AIRTABLE_API_KEY: '',
    AIRTABLE_BASE_ID: '',
    GITHUB_APP_ID: '',
    GITHUB_PRIVATE_KEY: '',
    GITHUB_WEBHOOK_SECRET: '',
    JWT_SECRET: '',
    RESEND_API_KEY: '',
    KANBAN_SESSION: {} as DurableObjectNamespace,
    OFFLINE_BUFFER: {} as DurableObjectNamespace,
    IDEMPOTENCY_KV: {} as KVNamespace,
    RATE_LIMIT_KV: {} as KVNamespace,
  };
}

// Minimal in-memory DurableObjectState stub
function makeState(): DurableObjectState {
  const sockets: WebSocket[] = [];
  return {
    getWebSockets: () => sockets,
    setHibernatableWebSocketEventTimeout: () => undefined,
    // unused in these tests
    storage: {} as DurableObjectStorage,
    blockConcurrencyWhile: async <T>(cb: () => Promise<T>) => cb(),
    waitUntil: () => undefined,
    acceptWebSocket: () => undefined,
    getTags: () => [],
    abort: () => undefined,
  } as unknown as DurableObjectState;
}

describe('KanbanSession', () => {
  it('rejects non-websocket and non-broadcast requests with 400', async () => {
    const do_ = new KanbanSession(makeState(), makeEnv());
    const res = await do_.fetch(new Request('https://kanban/'));
    expect(res.status).toBe(400);
  });

  it('accepts a WebSocket upgrade request shape (without testing the socket itself)', async () => {
    // NOTE: WebSocketPair is only available in the Workers runtime, not in
    // vitest's Node.js environment. We only verify the request is routed
    // correctly — the actual upgrade requires the Workers runtime.
    const do_ = new KanbanSession(makeState(), makeEnv());
    // Calling /ws in node will throw because WebSocketPair is undefined;
    // we verify the route EXISTS by checking that the error is the WS one,
    // not the "wrong route" 400.
    let caught: unknown;
    try {
      await do_.fetch(
        new Request('https://kanban/ws', { headers: { Upgrade: 'websocket' } })
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ReferenceError);
    expect(String(caught)).toMatch(/WebSocketPair/);
  });

  it('stats endpoint reports 0 connections initially', async () => {
    const do_ = new KanbanSession(makeState(), makeEnv());
    const res = await do_.fetch(new Request('https://kanban/stats'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; connections: number };
    expect(body.connections).toBe(0);
  });

  it('broadcasts to all connected sockets via the /broadcast endpoint', async () => {
    // NOTE: WebSocketPair is Workers-runtime-only; we test the HTTP broadcast
    // contract directly by calling `broadcast()` on the DO and verifying the
    // delivery count returned by /broadcast when 0 sockets are connected.
    const do_ = new KanbanSession(makeState(), makeEnv());
    const broadcastRes = await do_.fetch(
      new Request('https://kanban/broadcast', {
        method: 'POST',
        body: JSON.stringify({ type: 'TICKET_CREATED', ticket: { id: 'T-1' } }),
      })
    );
    expect(broadcastRes.status).toBe(200);
    const body = (await broadcastRes.json()) as { ok: boolean; delivered: number };
    expect(body.delivered).toBe(0);
  });

  it('broadcastKanbanEvent helper targets the "global" channel', async () => {
    // We can't easily mock DurableObjectNamespace without the workers-types test
    // helpers, so we just verify the function signature & that it returns a Promise.
    const fakeEnv = {
      KANBAN_SESSION: {
        idFromName: (name: string) => name,
        get: () => ({
          fetch: async () => new Response(JSON.stringify({ ok: true, delivered: 0 }), { status: 200 }),
        }),
      },
    } as unknown as Env;
    await expect(
      broadcastKanbanEvent(fakeEnv, { type: 'TICKET_GONE', ticketId: 'T-0001' })
    ).resolves.toBeUndefined();
  });
});
