import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { templates } from '../db.js';

const app = new Hono();

// GET /api/templates
app.get('/', async (c) => {
  const domainId = c.req.query('domainId');
  const rows = await templates.find({
    where: domainId ? { domain_id: domainId } : undefined,
    orderBy: [{ column: 'updated_at', direction: 'desc' }],
  });
  return c.json(rows);
});

// GET /api/templates/:id
app.get('/:id', async (c) => {
  const row = await templates.findOne({ where: { id: c.req.param('id') } });
  if (!row) return c.json({ error: 'Template not found' }, 404);
  return c.json(row);
});

const templateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  htmlBody: z.string().min(1),
  textBody: z.string().optional(),
  layout: z.string().optional(),
  domainId: z.string().optional().nullable(),
});

// POST /api/templates
app.post('/', zValidator('json', templateSchema), async (c) => {
  const body = c.req.valid('json');
  const now = new Date().toISOString();

  const row = await templates.insert({
    id: nanoid(),
    name: body.name,
    subject: body.subject,
    html_body: body.htmlBody,
    text_body: body.textBody ?? null,
    layout: body.layout ?? null,
    domain_id: body.domainId ?? null,
    created_at: now,
    updated_at: now,
  });

  return c.json(row, 201);
});

// PUT /api/templates/:id
app.put('/:id', zValidator('json', templateSchema.partial()), async (c) => {
  const row = await templates.findOne({ where: { id: c.req.param('id') } });
  if (!row) return c.json({ error: 'Template not found' }, 404);

  const body = c.req.valid('json');
  await templates.update({
    where: { id: row.id },
    set: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.subject !== undefined && { subject: body.subject }),
      ...(body.htmlBody !== undefined && { html_body: body.htmlBody }),
      ...(body.textBody !== undefined && { text_body: body.textBody ?? null }),
      ...(body.layout !== undefined && { layout: body.layout ?? null }),
      ...(body.domainId !== undefined && { domain_id: body.domainId ?? null }),
      updated_at: new Date().toISOString(),
    },
  });

  const updated = await templates.findOne({ where: { id: row.id } });
  return c.json(updated);
});

// DELETE /api/templates/:id
app.delete('/:id', async (c) => {
  const row = await templates.findOne({ where: { id: c.req.param('id') } });
  if (!row) return c.json({ error: 'Template not found' }, 404);

  await templates.delete({ where: { id: row.id } });
  return c.json({ deleted: true });
});

export default app;
