/**
 * Stub — to be implemented
 * Durable Object: holds the last 30 minutes of Kanban events per user
 * so a reconnecting senior can replay missed notifications (CT-NOT-04).
 */
export class OfflineBuffer {
  constructor(_state: DurableObjectState, _env: unknown) {
    // TODO
  }

  async fetch(_request: Request): Promise<Response> {
    return new Response('OfflineBuffer stub — not implemented', { status: 501 });
  }
}
