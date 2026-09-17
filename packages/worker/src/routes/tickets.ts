/**
 * POST /tickets — Create a new ticket
 *
 * Spec: SPECIFICATIONS.md §4.1
 * Test scenario: recettes/01-creation-ticket.md (CT-WEB-01, CT-VSC-01, CT-INT-01)
 *
 * M1 (sans Stripe) — le ticket est créé en status "open" avec `bounty` enregistré
 * mais sans pré-authorisation. Stripe arrive en M4.
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { CreateTicketSchema, parseOrThrow, ValidationError } from '../services/ticketValidation';
import { createTicket, getTicketByZimbId, listTickets } from '../adapters/airtable';
import { DeliveryError, markTicketDelivered } from '../services/delivery';
import { requireRole } from '../middleware/auth';
import { kanbanBroadcast } from '../services/kanbanBroadcast';

const tickets = new Hono<{ Bindings: Env }>();

// ─── POST /tickets (M1) ───────────────────────────────────────
tickets.post('/', async (c) => {
  try {
    // 1. Parse + validate the body
    const body = (await c.req.json()) as unknown;
    const input = parseOrThrow(CreateTicketSchema, body);

    // 2. Idempotency check via Idempotency-Key header (CT-INT-01)
    const idemKey = c.req.header('Idempotency-Key');
    if (idemKey) {
      // Simple dedupe: check if a ticket with same title+repo+createdBy was created in the last 60s
      const recent = await listTickets(c.env, { maxRecords: 5 });
      const dupe = recent.find(
        (t) =>
          t.title === input.title &&
          t.repoUrl === input.repoUrl &&
          t.createdBy === c.get('auth').userId &&
          Date.now() - new Date(t.createdAt).getTime() < 60_000
      );
      if (dupe) {
        return c.json({ ok: true, data: dupe, idempotent: true }, 200);
      }
    }

    // 3. Create the ticket in Airtable
    const ticket = await createTicket(c.env, {
      title: input.title,
      description: input.description,
      bounty: input.bounty,
      urgency: input.urgency,
      languages: input.languages,
      repoUrl: input.repoUrl,
      channel: input.channel,
      createdBy: c.get('auth').userId,
    });

    // 4. TODO (M4): create Stripe pre-auth PaymentIntent

    // 5. M3.6: broadcast TICKET_CREATED on Kanban Durable Object (best-effort)
    try {
      await kanbanBroadcast(c.env, { type: 'TICKET_CREATED', ticket });
    } catch (err) {
      console.warn('[POST /tickets] kanban broadcast failed', err);
    }

    return c.json({ ok: true, data: ticket }, 201);
  } catch (err) {
    if (err instanceof ValidationError) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'validation_error',
            message: 'Invalid ticket payload',
            details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
          },
        },
        400
      );
    }
    console.error('[POST /tickets] unexpected error', err);
    return c.json(
      {
        ok: false,
        error: {
          code: 'internal_error',
          message: 'Failed to create ticket',
          detail: err instanceof Error ? err.message : String(err),
        },
      },
      500
    );
  }
});

// ─── GET /tickets (list tickets — for seniors) ─────────────────
tickets.get('/', async (c) => {
  const status = c.req.query('status') ?? 'open';
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 100);

  try {
    const tickets = await listTickets(c.env, { status: status as 'open', maxRecords: limit });
    return c.json({ ok: true, data: tickets, count: tickets.length });
  } catch (err) {
    console.error('[GET /tickets] error', err);
    return c.json(
      { ok: false, error: { code: 'internal_error', message: 'Failed to list tickets' } },
      500
    );
  }
});

// ─── GET /tickets/:id (ticket detail) ──────────────────────────
tickets.get('/:id', async (c) => {
  const id = c.req.param('id');
  const ticket = await getTicketByZimbId(c.env, id);
  if (!ticket) {
    return c.json({ ok: false, error: { code: 'not_found', message: 'Ticket not found' } }, 404);
  }
  return c.json({ ok: true, data: ticket });
});

// ─── POST /tickets/:id/deliver (M3.2) ─────────────────────────
// Senior marks the ticket as delivered. Triggers GitHub repo creation + invite.
// RBAC: requireRole('senior') is applied at mount time in src/index.ts.
tickets.post(
  '/:id/deliver',
  requireRole('senior'),
  async (c) => {
    const ticketId = c.req.param('id');
    if (!ticketId) {
      return c.json(
        { ok: false, error: { code: 'bad_request', message: 'Missing ticket id' } },
        400
      );
    }
    const seniorId = c.get('auth').userId;
    try {
      const ticket = await markTicketDelivered(c.env, ticketId, seniorId);
      // M3.6: broadcast DELIVERED on Kanban (best-effort)
      try {
        await kanbanBroadcast(c.env, { type: 'DELIVERED', ticket });
      } catch (err) {
        console.warn('[POST /tickets/:id/deliver] kanban broadcast failed', err);
      }
      return c.json(
        {
          ok: true,
          data: {
            ticket,
            repoUrl: ticket.repoUrl,
            deliveredAt: ticket.deliveredAt,
          },
        },
        200
      );
    } catch (err) {
      if (err instanceof DeliveryError) {
        const status =
          err.code === 'not_found' ? 404
          : err.code === 'forbidden' ? 403
          : err.code === 'invalid_state' ? 409
          : 500;
        return c.json(
          { ok: false, error: { code: err.code, message: err.message } },
          status
        );
      }
      console.error('[POST /tickets/:id/deliver] unexpected error', err);
      return c.json(
        { ok: false, error: { code: 'internal_error', message: 'Failed to mark ticket delivered' } },
        500
      );
    }
  }
);

// ─── POST /tickets/:id/validate (Stub M1-M3 — sans Stripe) ────
// M1-M3: pas de capture, juste update du statut (M4 appellera Stripe)
tickets.post('/:id/validate', async (c) => {
  const id = c.req.param('id');
  const ticket = await getTicketByZimbId(c.env, id);
  if (!ticket) {
    return c.json({ ok: false, error: { code: 'not_found', message: 'Ticket not found' } }, 404);
  }
  if (ticket.status !== 'delivered') {
    return c.json(
      { ok: false, error: { code: 'invalid_state', message: `Ticket must be 'delivered', currently '${ticket.status}'` } },
      409
    );
  }
  return c.json(
    {
      ok: false,
      error: {
        code: 'not_implemented',
        message: 'Stripe capture not yet wired — implemented in M4',
      },
    },
    501
  );
});

// ─── POST /tickets/:id/dispute (stub — implemented in M5) ──────
tickets.post('/:id/dispute', (c) =>
  c.json(
    { ok: false, error: { code: 'not_implemented', message: 'POST /tickets/:id/dispute — implemented in M5' } },
    501
  )
);

export default tickets;
