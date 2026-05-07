// Admin: user management routes
// GET    /api/admin/users
// DELETE /api/admin/users/:id

import { Hono } from 'hono';
import { requireSession, requireAdmin } from '../../middleware/auth.ts';
import type { HonoEnv } from '../../env.ts';

const app = new Hono<HonoEnv>();

// GET /api/admin/users
app.get('/', requireSession, requireAdmin, async (c) => {
  const users = await c.env.DB.prepare(
    'SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC',
  ).all();
  return c.json(users.results);
});

// DELETE /api/admin/users/:id  (revoke / deactivate)
app.delete('/:id', requireSession, requireAdmin, async (c) => {
  const id = c.req.param('id');

  // Prevent admin from deleting themselves
  if (id === c.get('userId')) return c.json({ error: 'Cannot delete own account' }, 400);

  const user = await c.env.DB.prepare('SELECT id FROM users WHERE id = ? LIMIT 1').bind(id).first();
  if (!user) return c.json({ error: 'User not found' }, 404);

  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM inbox_members WHERE user_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id),
  ]);

  return c.json({ deleted: true });
});

export default app;
