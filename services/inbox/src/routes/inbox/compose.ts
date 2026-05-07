// Inbox compose / reply routes
// POST /api/inbox/compose    — send new email to a person
// POST /api/inbox/reply      — reply to an inbound email

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
import { sendEmail, type CFSendEmailParams } from '../../services/cloudflare.ts';
import type { HonoEnv } from '../../env.ts';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 21);
const app = new Hono<HonoEnv>();

const sendSchema = z.object({
  to: z.string().email(),
  from: z.string().email(),
  fromName: z.string().optional(),
  subject: z.string().min(1),
  html: z.string().optional(),
  text: z.string().optional(),
  inReplyTo: z.string().optional(),
  personId: z.string().optional(),
});

async function upsertPerson(env: HonoEnv['Bindings'], email: string): Promise<string> {
  const existing = await env.DB.prepare('SELECT id FROM people WHERE email = ? LIMIT 1').bind(email).first<{ id: string }>();
  if (existing) return existing.id;
  const id = nanoid();
  await env.DB.prepare('INSERT INTO people (id, email, name, created_at) VALUES (?, ?, NULL, ?)').bind(id, email, new Date().toISOString()).run();
  return id;
}

// POST /api/inbox/compose
app.post('/compose', zValidator('json', sendSchema), async (c) => {
  const body = c.req.valid('json');
  const now  = new Date().toISOString();

  const personId = body.personId ?? (await upsertPerson(c.env, body.to));

  const fromField: CFSendEmailParams['from'] = body.fromName
    ? { address: body.from, name: body.fromName }
    : body.from;

  const result = await sendEmail(
    { from: fromField, to: body.to, subject: body.subject, html: body.html, text: body.text },
    c.env.CF_ACCOUNT_ID,
    c.env.CF_API_TOKEN,
  );

  const id = nanoid();
  await c.env.DB.prepare(
    `INSERT INTO sent_inbox_emails (id, person_id, in_reply_to, from_address, to_address, subject, status, cf_message_id, sent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, personId, body.inReplyTo ?? null, body.from, body.to, body.subject, 'sent', result?.id ?? null, now).run();

  return c.json({ ok: true, id });
});

export default app;
