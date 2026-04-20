import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { HTTPException } from 'hono/http-exception';

import { bootstrapSchema, seedSystemTemplates } from './db.js';
import { env } from './env.js';
import { requireAdminToken } from './middleware/auth.js';
import { requireApiKey } from './middleware/apiKey.js';

import domainsRoutes  from './routes/domains.js';
import templatesRoutes from './routes/templates.js';
import keysRoutes     from './routes/keys.js';
import logsRoutes     from './routes/logs.js';
import statsRoutes    from './routes/stats.js';
import sendRoutes     from './routes/send.js';
import { LAYOUTS, renderLayout } from './emails/render.js';
import type { LayoutName } from './emails/render.js';

const app = new Hono();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ ok: true, service: 'emailflair-backend', ts: Date.now() }));

// ── Public: send (API key protected) ─────────────────────────────────────────
app.use('/v1/*', requireApiKey);
app.route('/v1/send', sendRoutes);

// ── Admin API (token protected) ─────────────────────────────────────────────
const admin = new Hono();
admin.use('*', requireAdminToken);
admin.get('/me', (c) => c.json({ ok: true }));
admin.get('/layouts', (c) => c.json(
  Object.entries(LAYOUTS).map(([id, { label, variables }]) => ({ id, label, variables }))
));

// POST /api/layouts/:id/preview — render a built-in layout with variables
admin.post('/layouts/:id/preview', async (c) => {
  const id = c.req.param('id') as LayoutName;
  if (!LAYOUTS[id]) return c.json({ error: 'Layout not found' }, 404);
  const body = await c.req.json().catch(() => ({}));
  const variables: Record<string, string> = body.variables ?? {};
  const html = await renderLayout(id, variables);
  return c.json({ html });
});
admin.route('/domains',   domainsRoutes);
admin.route('/templates', templatesRoutes);
admin.route('/keys',      keysRoutes);
admin.route('/logs',      logsRoutes);
admin.route('/stats',     statsRoutes);

app.route('/api', admin);

// ── Error handler ─────────────────────────────────────────────────────────────
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error('[error]', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// ── Startup ───────────────────────────────────────────────────────────────────
async function main() {
  await bootstrapSchema();
  await seedSystemTemplates();

  serve({ fetch: app.fetch, port: env.PORT }, () => {
    console.log(`[server] emailflair backend running on port ${env.PORT}`);
  });
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
