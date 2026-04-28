import { serve } from '@hono/node-server';
import type { ServerType } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { HTTPException } from 'hono/http-exception';

import { bootstrapSchema, seedSystemTemplates } from './db.js';
import { env } from './env.js';
import { requireAdminToken } from './middleware/auth.js';
import { requireApiKey } from './middleware/apiKey.js';
import { checkRateLimit } from './middleware/rateLimit.js';

import authRoutes      from './routes/auth.js';
import domainsRoutes   from './routes/domains.js';
import templatesRoutes from './routes/templates.js';
import keysRoutes      from './routes/keys.js';
import logsRoutes      from './routes/logs.js';
import statsRoutes     from './routes/stats.js';
import cloudflareRoutes from './routes/cloudflare.js';
import sendRoutes      from './routes/send.js';
import { LAYOUTS, renderLayout } from './emails/render.js';
import type { LayoutName } from './emails/render.js';

// Allowed origins for the admin UI
const ADMIN_ORIGINS = env.NODE_ENV === 'production'
  ? (process.env.ADMIN_ORIGIN ? [process.env.ADMIN_ORIGIN] : [])
  : ['http://localhost:5173', 'http://admin:5173', 'http://emailflare.localhost:1355'];

const app = new Hono();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use('*', logger());
app.use('*', secureHeaders());

// Public API: wide-open CORS (callers send from any origin)
app.use('/v1/*', cors({
  origin: '*',
  allowMethods: ['POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Admin UI: origin-restricted + credentials (for session cookie)
app.use('/api/*', cors({
  origin: ADMIN_ORIGINS,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  credentials: true,
}));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({
  ok: true,
  service: 'emailflare-backend',
  ts: Date.now(),
  git: {
    commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    branch: process.env.RAILWAY_GIT_BRANCH ?? 'local',
  },
}));

// ── Public: send (API key protected + rate limited) ───────────────────────────
app.use('/v1/*', requireApiKey);
app.use('/v1/*', async (c, next) => {
  const apiKey = c.get('apiKey' as never) as { keyId: string };
  const rl = checkRateLimit(apiKey.keyId);
  c.header('X-RateLimit-Limit',     String(rl.limit));
  c.header('X-RateLimit-Remaining', String(rl.remaining));
  c.header('X-RateLimit-Reset',     String(Math.ceil(rl.resetAt / 1000)));
  if (!rl.allowed) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }
  await next();
});
app.route('/v1/send', sendRoutes);

// ── Auth routes (public — login/logout/me) ───────────────────────────────────
app.route('/api/auth', authRoutes);

// ── Admin API (session protected) ────────────────────────────────────────────
const admin = new Hono();
admin.use('*', requireAdminToken);
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
admin.route('/cloudflare', cloudflareRoutes);

app.route('/api', admin);

// ── Error handler ─────────────────────────────────────────────────────────────
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error('[error]', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// ── Startup + graceful shutdown ────────────────────────────────────────────────
async function main() {
  console.log('[startup] NODE_ENV:', env.NODE_ENV);
  console.log('[startup] PORT:', env.PORT);
  console.log('[startup] MESAHUB_URL:', env.MESAHUB_URL.replace(/mh:\/\/[^@]+@/, 'mh://***@'));
  console.log('[startup] ADMIN_TOKEN:', env.ADMIN_TOKEN ? 'set' : '*** MISSING ***');
  console.log('[startup] CF_API_TOKEN:', env.CF_API_TOKEN ? 'set' : 'not set');

  console.log('[startup] bootstrapping schema...');
  await bootstrapSchema();
  console.log('[startup] seeding system templates...');
  await seedSystemTemplates();

  const server: ServerType = serve({ fetch: app.fetch, port: env.PORT }, () => {
    console.log(`[server] emailflair backend running on port ${env.PORT}`);
  });

  function shutdown(signal: string) {
    console.log(`[server] ${signal} received — shutting down`);
    server.close(() => {
      console.log('[server] closed');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
