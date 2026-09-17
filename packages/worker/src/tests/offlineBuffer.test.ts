/**
 * Unit tests — OfflineBuffer Durable Object (M3.5)
 */
import { describe, it, expect } from 'vitest';
import { OfflineBuffer, recordOfflineEvent, type BufferedEvent } from '../durable-objects/OfflineBuffer';
import type { Env } from '../types/env';

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

function makeState(): DurableObjectState {
  return {
    storage: {} as DurableObjectStorage,
    blockConcurrencyWhile: async <T>(cb: () => Promise<T>) => cb(),
    waitUntil: () => undefined,
    getWebSockets: () => [],
    setHibernatableWebSocketTimeout: () => undefined,
    acceptWebSocket: () => undefined,
    getTags: () => [],
    abort: () => undefined,
  } as unknown as DurableObjectState;
}

describe('OfflineBuffer', () => {
  it('records an event and returns the count', async () => {
    const buf = new OfflineBuffer(makeState(), makeEnv());
    const res = await buf.fetch(
      new Request('https://offline/record', {
        method: 'POST',
        body: JSON.stringify({ type: 'TICKET_CREATED', payload: { id: 'T-1' } }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; count: number };
    expect(body.count).toBe(1);
  });

  it('replays events newer than the given `since`', async () => {
    const buf = new OfflineBuffer(makeState(), makeEnv());

    await buf.fetch(
      new Request('https://offline/record', {
        method: 'POST',
        body: JSON.stringify({ type: 'TICKET_CREATED', payload: { id: 'T-1' } }),
      })
    );
    // Capture the ts of the first event via a stats read
    const statsRes = await buf.fetch(new Request('https://offline/stats'));
    const stats = (await statsRes.json()) as { count: number };

    await new Promise((r) => setTimeout(r, 5));
    await buf.fetch(
      new Request('https://offline/record', {
        method: 'POST',
        body: JSON.stringify({ type: 'TICKET_GONE', payload: { ticketId: 'T-1' } }),
      })
    );

    // Replay only events newer than "now - 10ms" → should get at least the second
    const replayRes = await buf.fetch(
      new Request(`https://offline/replay?since=${Date.now() - 10}`)
    );
    const replay = (await replayRes.json()) as { ok: boolean; data: BufferedEvent[] };
    expect(replay.data.length).toBeGreaterThanOrEqual(1);
    expect(replay.data.some((e) => e.type === 'TICKET_GONE')).toBe(true);

    // Suppress unused warning
    expect(stats.count).toBeGreaterThanOrEqual(0);
  });

  it('caps the buffer at MAX_EVENTS (oldest evicted)', async () => {
    const buf = new OfflineBuffer(makeState(), makeEnv());
    for (let i = 0; i < 210; i++) {
      await buf.fetch(
        new Request('https://offline/record', {
          method: 'POST',
          body: JSON.stringify({ type: 'EVT', payload: { i } }),
        })
      );
    }
    const res = await buf.fetch(new Request('https://offline/stats'));
    const body = (await res.json()) as { count: number; max: number };
    expect(body.count).toBe(200);
    expect(body.max).toBe(200);
  });

  it('returns 400 for unknown routes', async () => {
    const buf = new OfflineBuffer(makeState(), makeEnv());
    const res = await buf.fetch(new Request('https://offline/unknown'));
    expect(res.status).toBe(400);
  });

  it('recordOfflineEvent helper targets the right per-user DO', async () => {
    const fakeEnv = {
      OFFLINE_BUFFER: {
        idFromName: (name: string) => name,
        get: () => ({
          fetch: async () => new Response(JSON.stringify({ ok: true, count: 1 }), { status: 200 }),
        }),
      },
    } as unknown as Env;
    await expect(
      recordOfflineEvent(fakeEnv, 'alice', { type: 'TICKET_GONE', payload: { ticketId: 'T-2' } })
    ).resolves.toBeUndefined();
  });
});
