// Admin: user management routes
import { Hono } from 'hono';
import { requireSession, requireAdmin } from '../../middleware/auth.js';
import { rawDb } from '../../db.js';
import type { HonoEnv } from '../../env.js';

const app = new Hono<HonoEnv>();

app.get('/', requireSession, requireAdmin, async (c) => {
  const { rows } = await rawDb.query(
    'SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC',
  );
  return c.json(rows);
});

app.delete('/:id', requireSession, requireAdmin, async (c) => {
  const id = c.req.param('id');
  if (id === c.get('userId')) return c.json({ error: 'Cannot delete own account' }, 400);

  const user = await rawDb.first('SELECT id FROM users WHERE id = ? LIMIT 1', [id]);
  if (!user) return c.json({ error: 'User not found' }, 404);

  await rawDb.batch([
    { sql: 'DELETE FROM inbox_members     WHERE user_id = ?',  params: [id] },
    { sql: 'DELETE FROM push_subscriptions WHERE user_id = ?', params: [id] },
    { sql: 'DELETE FROM users             WHERE id = ?',       params: [id] },
  ]);

  return c.json({ deleted: true });
});

export default app;
