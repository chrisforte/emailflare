import { timingSafeEqual } from 'node:crypto';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { env } from '../env.js';
import { getSession, saveSession, clearSession } from '../middleware/auth.js';

const app = new Hono();

const loginSchema = z.object({
  token: z.string().min(1),
});

// POST /api/auth/login — public, no session required
app.post('/login', zValidator('json', loginSchema), async (c) => {
  const { token } = c.req.valid('json');

  const expected = Buffer.from(env.ADMIN_TOKEN);
  const provided = Buffer.from(token);
  const valid =
    provided.length === expected.length &&
    timingSafeEqual(expected, provided);

  if (!valid) return c.json({ error: 'Invalid token' }, 401);

  await saveSession(c, { isLoggedIn: true });
  return c.json({ ok: true });
});

// POST /api/auth/logout — public, clears session
app.post('/logout', (c) => {
  clearSession(c);
  return c.json({ ok: true });
});

// GET /api/auth/me — protected by requireAdminToken in index.ts
app.get('/me', async (c) => {
  const session = await getSession(c);
  return c.json({ ok: session.isLoggedIn });
});

export default app;
