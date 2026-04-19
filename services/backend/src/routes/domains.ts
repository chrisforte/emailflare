import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { domains } from '../db.js';
import { createSendingSubdomain, listSendingSubdomains, getSubdomainDnsRecords, getSendingSubdomain, getZoneByHostname } from '../services/cloudflare.js';

const app = new Hono();

// GET /api/domains
app.get('/', async (c) => {
  const rows = await domains.find({ orderBy: [{ column: 'created_at', direction: 'desc' }] });
  return c.json(rows);
});

// GET /api/domains/:id
app.get('/:id', async (c) => {
  const domain = await domains.findOne({ where: { id: c.req.param('id') } });
  if (!domain) return c.json({ error: 'Domain not found' }, 404);
  return c.json(domain);
});

const createSchema = z.object({
  name: z.string().min(3),
  cfZoneId: z.string().optional(),
});

// POST /api/domains
app.post('/', zValidator('json', createSchema), async (c) => {
  const { name, cfZoneId } = c.req.valid('json');

  // Check if this subdomain is already in our DB
  const existing = await domains.findOne({ where: { name } });
  if (existing) return c.json({ error: `Domain "${name}" is already registered` }, 409);

  // Resolve zone: use provided ID or look it up from Cloudflare
  let zoneId = cfZoneId;
  if (!zoneId) {
    const zone = await getZoneByHostname(name);
    if (!zone) {
      return c.json({ error: `No active Cloudflare zone found for "${name}". Make sure the root domain is added to your Cloudflare account.` }, 422);
    }
    zoneId = zone.id;
  }

  // Check CF first — reuse existing subdomain if found, otherwise create it.
  const allSubdomains = await listSendingSubdomains(zoneId);
  const cfResult = allSubdomains.find(s => s.name === name) ?? await createSendingSubdomain(zoneId, name);

  const row = await domains.insert({
    id: nanoid(),
    name,
    cf_zone_id: zoneId,
    cf_subdomain_id: cfResult.tag,
    dkim_selector: cfResult.dkim_selector ?? null,
    return_path_domain: cfResult.return_path_domain ?? null,
    verified: cfResult.enabled ? 1 : 0,
    created_at: new Date().toISOString(),
  });

  return c.json(row, 201);
});

// GET /api/domains/:id/dns — fetch DNS records from Cloudflare
app.get('/:id/dns', async (c) => {
  const domain = await domains.findOne({ where: { id: c.req.param('id') } });
  if (!domain) return c.json({ error: 'Domain not found' }, 404);
  if (!domain.cf_subdomain_id) return c.json({ error: 'Cloudflare subdomain not yet provisioned' }, 400);

  const records = await getSubdomainDnsRecords(domain.cf_zone_id, domain.cf_subdomain_id);
  return c.json(records);
});

// POST /api/domains/:id/verify — re-check CF status and update
app.post('/:id/verify', async (c) => {
  const domain = await domains.findOne({ where: { id: c.req.param('id') } });
  if (!domain) return c.json({ error: 'Domain not found' }, 404);
  if (!domain.cf_subdomain_id) return c.json({ error: 'Cloudflare subdomain not provisioned' }, 400);

  const cfData = await getSendingSubdomain(domain.cf_zone_id, domain.cf_subdomain_id);

  await domains.update({
    where: { id: domain.id },
    set: {
      verified: cfData.enabled ? 1 : 0,
      dkim_selector: cfData.dkim_selector ?? null,
      return_path_domain: cfData.return_path_domain ?? null,
    },
  });

  return c.json({ verified: cfData.enabled, domain: cfData });
});

// DELETE /api/domains/:id
app.delete('/:id', async (c) => {
  const domain = await domains.findOne({ where: { id: c.req.param('id') } });
  if (!domain) return c.json({ error: 'Domain not found' }, 404);

  await domains.delete({ where: { id: domain.id } });
  return c.json({ deleted: true });
});

export default app;
