/**
 * OfflineBuffer Durable Object — M3.5
 *
 * Per-user ring buffer of Kanban events, replayed on reconnect (CT-NOT-04).
 *
 * Spec: SPECIFICATIONS.md §4.2.3 + recettes/06-notifications-realtime.md
 *
 * - One DO instance per user (idFromName(`user:${userId}`)).
 * - In-memory ring buffer capped at MAX_EVENTS (oldest evicted).
 * - Each event has a `ts` (added server-side) so the client can drop stale ones.
 * - The route handlers call `record(env, userId, event)` after broadcasting
 *   on the Kanban channel.
 * - On reconnect, the client calls `GET /replay?since=<ts>` → receives events
 *   newer than `since`.
 *
 * NOTE: this is in-memory only. For durability across DO eviction, we'd
 * persist to IDEMPOTENCY_KV — out of scope for M3.
 */
import type { Env } from '../types/env';

export interface BufferedEvent {
  type: string;
  ts: number;
  payload: unknown;
}

const MAX_EVENTS = 200;
const REPLAY_WINDOW_MS = 30 * 60_000; // 30 minutes

export class OfflineBuffer implements DurableObject {
  private readonly events: BufferedEvent[] = [];

  constructor(private readonly state: DurableObjectState, private readonly env: Env) {
    // Hibernation-friendly: nothing to restore (in-memory only).
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    if (method === 'POST' && url.pathname === '/record') {
      const event = (await request.json()) as Omit<BufferedEvent, 'ts'>;
      this.events.push({ ...event, ts: Date.now() });
      // Evict oldest beyond cap
      while (this.events.length > MAX_EVENTS) {
        this.events.shift();
      }
      return new Response(JSON.stringify({ ok: true, count: this.events.length }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (method === 'GET' && url.pathname === '/replay') {
      const since = Number(url.searchParams.get('since') ?? '0');
      const cutoff = Date.now() - REPLAY_WINDOW_MS;
      const events = this.events.filter((e) => e.ts > since && e.ts >= cutoff);
      return new Response(JSON.stringify({ ok: true, data: events }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (method === 'GET' && url.pathname === '/stats') {
      return new Response(
        JSON.stringify({ ok: true, count: this.events.length, max: MAX_EVENTS }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }

    return new Response('OfflineBuffer — expected POST /record, GET /replay, GET /stats', {
      status: 400,
    });
  }
}

/**
 * Public helper — records a Kanban event for the given user.
 * Called by route handlers AFTER the global Kanban broadcast.
 */
export async function recordOfflineEvent(
  env: { OFFLINE_BUFFER: DurableObjectNamespace },
  userId: string,
  event: Omit<BufferedEvent, 'ts'>
): Promise<void> {
  const id = env.OFFLINE_BUFFER.idFromName(`user:${userId}`);
  const stub = env.OFFLINE_BUFFER.get(id);
  await stub.fetch('https://offline/record', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(event),
  });
}
