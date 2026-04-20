import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createHash, randomBytes } from 'node:crypto';
import { nanoid } from 'nanoid';
import { apiKeys, apiKeyDomains } from '../db.js';

const app = new Hono();

// GET /api/keys
app.get('/', async (c) => {
  const rows = await apiKeys.find({ orderBy: [{ column: 'created_at', direction: 'desc' }] });
  // Never expose hashes
  return c.json(rows.map(({ key_hash: _, ...r }) => r));
});

const createSchema = z.object({
  name: z.string().min(1),
  scope: z.enum(['global', 'domain', 'multi']).default('global'),
  domainIds: z.array(z.string()).optional(),
});

// POST /api/keys
app.post('/', zValidator('json', createSchema), async (c) => {
  const { name, scope, domainIds } = c.req.valid('json');

  // Generate key: emailflair_<40 hex chars>
  const rawKey = `emailflair_${randomBytes(20).toString('hex')}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 18); // "emailflair_" + first 7 hex chars

  const row = await apiKeys.insert({
    id: nanoid(),
    name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    scope,
    active: 1,
    last_used_at: null,
    send_count: 0,
    created_at: new Date().toISOString(),
  });

  // Store domain associations for domain/multi scope
  if ((scope === 'domain' || scope === 'multi') && domainIds?.length) {
    await apiKeyDomains.insertMany(
      domainIds.map(domainId => ({ api_key_id: row.id, domain_id: domainId })),
      { onConflict: 'ignore' },
    );
  }

  const { key_hash: _, ...safeRow } = row;
  return c.json({ ...safeRow, key: rawKey }, 201); // Plaintext key shown ONCE
});

// DELETE /api/keys/:id  (revoke)
app.delete('/:id', async (c) => {
  const row = await apiKeys.findOne({ where: { id: c.req.param('id') } });
  if (!row) return c.json({ error: 'API key not found' }, 404);

  await apiKeys.update({ where: { id: row.id }, set: { active: 0 } });
  return c.json({ revoked: true });
});

export default app;
