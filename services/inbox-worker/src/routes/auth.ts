// Auth routes: login, logout, me
// Uses email+password with PBKDF2 via Web Crypto API.

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { verifyPassword } from '../lib/password.ts';
import { getSession, saveSession, clearSession } from '../middleware/auth.ts';
import { checkLoginRateLimit } from '../middleware/loginRateLimit.ts';
import type { HonoEnv } from '../env.ts';
import { userLoginSchema } from '@emailflare/inbox-core';

const app = new Hono<HonoEnv>();

// POST /api/auth/login
app.post('/login', zValidator('json', userLoginSchema), async (c) => {
  const ip =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For')?.split(',')[0].trim() ??
    'unknown';

  const allowed = await checkLoginRateLimit(ip, c.env.RATE_LIMIT_KV);
  if (!allowed) return c.json({ error: 'Too many login attempts. Try again in a minute.' }, 429);

  const { email, password } = c.req.valid('json');

  const user = await c.env.DB.prepare(
    'SELECT id, password_hash, role FROM users WHERE email = ? LIMIT 1',
  ).bind(email).first<{ id: string; password_hash: string; role: string }>();

  if (!user) {
    // Constant-time dummy hash comparison to prevent user enumeration
    await verifyPassword(password, '$dummy$');
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return c.json({ error: 'Invalid email or password' }, 401);

  await saveSession(c, { userId: user.id, role: user.role as 'admin' | 'member' });
  return c.json({ ok: true });
});

// POST /api/auth/logout
app.post('/logout', (c) => {
  clearSession(c);
  return c.json({ ok: true });
});

// GET /api/auth/me
app.get('/me', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const user = await c.env.DB.prepare(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1',
  ).bind(session.userId).first<{ id: string; name: string; email: string; role: string; created_at: string }>();

  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json(user);
});

export default app;
