/**
 * KanbanSession Durable Object — M3.4
 *
 * WebSocket hub broadcasting Kanban events to all connected seniors.
 *
 * Spec: SPECIFICATIONS.md §4.2.3 + recettes/06-notifications-realtime.md
 * Skill: .github/skills/cloudflare-workers-modern/SKILL.md (RpcTarget + hibernation)
 *
 * Architecture:
 *   - One DO instance per "kanban channel" (id derived from a stable key, e.g. "global").
 *   - Each instance keeps N WebSocket connections alive across Worker restarts
 *     via `serializeAttachment()` + `getWebSockets()`.
 *   - When a ticket is created/claimed/delivered, the route calls
 *     `broadcast(env, event)` → forwards to the DO → fans out to every socket.
 *
 * Events emitted (see recettes/06-notifications-realtime.md CT-NOT-01):
 *   { type: "TICKET_CREATED", ticket }
 *   { type: "TICKET_GONE", ticketId }
 *   { type: "CLAIMED_BY_ME", ticket, claim }
 *   { type: "DELIVERED", ticket }
 */
import type { Env } from '../types/env';

export type KanbanEvent =
  | { type: 'TICKET_CREATED'; ticket: unknown }
  | { type: 'TICKET_GONE'; ticketId: string }
  | { type: 'CLAIMED_BY_ME'; ticket: unknown; seniorId: string }
  | { type: 'DELIVERED'; ticket: unknown }
  | { type: 'PONG'; ts: number };

export interface KanbanSessionEnv {
  KANBAN_SESSION: DurableObjectNamespace;
}

const ATTACHMENT_KEY = 'connId';
const HEARTBEAT_MS = 30_000;

/**
 * Helper for callers — resolves the "global" kanban DO id and forwards an event.
 * Safe to call from any route handler.
 */
export async function broadcastKanbanEvent(
  env: KanbanSessionEnv,
  event: KanbanEvent
): Promise<void> {
  const id = env.KANBAN_SESSION.idFromName('global');
  const stub = env.KANBAN_SESSION.get(id);
  await stub.fetch('https://kanban/broadcast', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(event),
  });
}

export class KanbanSession implements DurableObject {
  private readonly sessions = new Map<string, WebSocket>();

  constructor(private readonly state: DurableObjectState, private readonly env: Env) {
    // Hibernation: restore WebSocket map after a Worker restart
    this.state.getWebSockets().forEach((ws) => {
      const connId = ws.deserializeAttachment();
      if (typeof connId === 'string') {
        this.sessions.set(connId, ws);
      }
    });
    // Optional: schedule periodic ping to detect dead sockets
    this.state.setHibernatableWebSocketEventTimeout(HEARTBEAT_MS);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // ── Upgrade to WebSocket ────────────────────────────────────
    if (url.pathname === '/ws' || request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      const connId = crypto.randomUUID();

      server.serializeAttachment(connId);
      this.sessions.set(connId, server);

      server.accept();
      // Send a hello so the client knows the socket is live
      server.send(JSON.stringify({ type: 'PONG', ts: Date.now() }));

      // Inbound messages (ping/pong, subscribe, etc.) — minimal for now
      server.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(String(event.data)) as { type?: string };
          if (data.type === 'PING') {
            server.send(JSON.stringify({ type: 'PONG', ts: Date.now() }));
          }
        } catch {
          /* ignore malformed */
        }
      });

      server.addEventListener('close', () => {
        this.sessions.delete(connId);
      });
      server.addEventListener('error', () => {
        this.sessions.delete(connId);
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // ── Broadcast endpoint (internal, called by HTTP routes) ───
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const event = (await request.json()) as KanbanEvent;
      this.broadcast(event);
      return new Response(JSON.stringify({ ok: true, delivered: this.sessions.size }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    // ── Debug: who is connected? ────────────────────────────────
    if (url.pathname === '/stats') {
      return new Response(
        JSON.stringify({ ok: true, connections: this.sessions.size }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }

    return new Response('KanbanSession — expected /ws, /broadcast, or /stats', { status: 400 });
  }

  /**
   * Broadcasts a JSON event to every connected client.
   * Called internally by /broadcast AND from a hibernation wake-up.
   */
  broadcast(event: KanbanEvent): void {
    const payload = JSON.stringify(event);
    for (const ws of this.sessions.values()) {
      try {
        ws.send(payload);
      } catch {
        // Socket is in CLOSING/CLOSED state — drop it.
        this.sessions.delete(this.findConnIdBySocket(ws));
      }
    }
  }

  private findConnIdBySocket(target: WebSocket): string {
    for (const [id, ws] of this.sessions) {
      if (ws === target) return id;
    }
    return '';
  }
}
