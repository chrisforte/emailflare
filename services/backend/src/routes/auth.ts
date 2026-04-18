import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { db } from '../db.js';
import { signToken } from '../middleware/auth.js';

const app = new Hono();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

app.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  const passwordHash = createHash('sha256').update(password).digest('hex');
  const user = await db.table('admin_users').findOne({
    where: { email, password_hash: passwordHash },
  });

  if (!user) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const token = await signToken({ sub: (user as any).id, email: (user as any).email });
  return c.json({ token, email: (user as any).email });
});

app.get('/me', async (c) => {
  // Protected by requireJwt in index.ts — user is already validated
  const user = c.get('user' as never) as { sub: string; email: string };
  return c.json({ id: user.sub, email: user.email });
});

export default app;
