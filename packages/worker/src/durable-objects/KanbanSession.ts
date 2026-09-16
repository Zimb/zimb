/**
 * Stub — to be implemented
 * WebSocket Durable Object: maintains active WebSocket connections per senior
 * and broadcasts `TICKET_GONE` / `CLAIMED_BY_ME` / `TICKET_CREATED` events.
 * See SPECIFICATIONS.md §4.2.3 + recettes/06-notifications-realtime.md.
 */
export class KanbanSession {
  constructor(_state: DurableObjectState, _env: unknown) {
    // TODO
  }

  async fetch(_request: Request): Promise<Response> {
    return new Response('KanbanSession stub — not implemented', { status: 501 });
  }
}
