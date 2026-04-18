import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { HTTPException } from 'hono/http-exception';

import { bootstrapSchema } from './db.js';
import { env } from './env.js';
import { requireAdminToken } from './middleware/auth.js';
import { requireApiKey } from './middleware/apiKey.js';

import domainsRoutes  from './routes/domains.js';
import templatesRoutes from './routes/templates.js';
import keysRoutes     from './routes/keys.js';
import logsRoutes     from './routes/logs.js';
import statsRoutes    from './routes/stats.js';
import sendRoutes     from './routes/send.js';

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

  serve({ fetch: app.fetch, port: env.PORT }, () => {
    console.log(`[server] emailflair backend running on port ${env.PORT}`);
  });
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
