/**
 * Stub — to be implemented
 * Public ticket tracking for clients: GET /track/:ticketId
 * No auth required.
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';

const track = new Hono<{ Bindings: Env }>();

track.get('/:ticketId', (c) =>
  c.json(
    { ok: false, error: { code: 'not_implemented', message: 'GET /track/:ticketId — TODO' } },
    501
  )
);

export default track;
