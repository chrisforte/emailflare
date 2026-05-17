// Auth routes: login, logout, me
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyPassword } from '../lib/password.js';
import { getSession, saveSession, clearSession } from '../middleware/auth.js';
import { checkLoginRateLimit } from '../middleware/loginRateLimit.js';
import { rawDb } from '../db.js';
import type { HonoEnv } from '../env.js';

const app = new Hono<HonoEnv>();

const loginSchema = z.object({
  email:    z.string().email().toLowerCase(),
  password: z.string().min(1),
});

app.post('/login', zValidator('json', loginSchema), async (c) => {
  const ip =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For')?.split(',')[0].trim() ??
    'unknown';

  const allowed = await checkLoginRateLimit(ip);
  if (!allowed) return c.json({ error: 'Too many login attempts. Try again in a minute.' }, 429);

  const { email, password } = c.req.valid('json');

  const user = await rawDb.first<{ id: string; password_hash: string; role: string }>(
    'SELECT id, password_hash, role FROM users WHERE email = ? LIMIT 1',
    [email],
  );

  if (!user) {
    await verifyPassword(password, '$dummy$');
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return c.json({ error: 'Invalid email or password' }, 401);

  await saveSession(c, { userId: user.id, role: user.role as 'admin' | 'member' });
  return c.json({ ok: true });
});

app.post('/logout', (c) => {
  clearSession(c);
  return c.json({ ok: true });
});

app.get('/me', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const user = await rawDb.first<{ id: string; name: string; email: string; role: string; created_at: string }>(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1',
    [session.userId],
  );

  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json(user);
});

export default app;
