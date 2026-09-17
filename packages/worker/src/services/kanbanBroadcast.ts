/**
 * Kanban broadcast service — M3.6
 *
 * Glues the global Kanban Durable Object (live broadcast) with the
 * per-user OfflineBuffer DO (replay-on-reconnect).
 *
 * Use this from any route handler:
 *   await kanbanBroadcast(c.env, { type: 'TICKET_CREATED', ticket });
 *   await kanbanBroadcast(c.env, { type: 'CLAIMED_BY_ME', ticket, seniorId }, seniorId);
 */
import { broadcastKanbanEvent, type KanbanEvent } from '../durable-objects/KanbanSession';
import { recordOfflineEvent } from '../durable-objects/OfflineBuffer';

interface BroadcastEnv {
  KANBAN_SESSION: DurableObjectNamespace;
  OFFLINE_BUFFER: DurableObjectNamespace;
}

export async function kanbanBroadcast(
  env: BroadcastEnv,
  event: KanbanEvent,
  recordForUserId?: string
): Promise<void> {
  // 1. Live broadcast on the global Kanban channel
  await broadcastKanbanEvent(env, event);

  // 2. Record into the targeted user's offline buffer (if applicable)
  if (recordForUserId) {
    await recordOfflineEvent(env, recordForUserId, {
      type: event.type,
      payload: event,
    });
  }
}
