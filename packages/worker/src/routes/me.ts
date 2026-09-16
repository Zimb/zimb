/**
 * Stub — to be implemented
 * Endpoints: GET /me, GET /me/tickets
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';

const me = new Hono<{ Bindings: Env }>();

me.get('/', (c) =>
  c.json({ ok: false, error: { code: 'not_implemented', message: 'GET /me — TODO' } }, 501)
);

me.get('/tickets', (c) =>
  c.json({ ok: false, error: { code: 'not_implemented', message: 'GET /me/tickets — TODO' } }, 501)
);

export default me;
