import { Hono } from 'hono';
import { emailLogs } from '../db.js';

const app = new Hono();

// GET /api/logs?page=1&limit=50&domainId=&status=
app.get('/', async (c) => {
  const page   = Math.max(1, parseInt(c.req.query('page') ?? '1', 10));
  const limit  = Math.min(100, parseInt(c.req.query('limit') ?? '50', 10));
  const offset = (page - 1) * limit;
  const domainId = c.req.query('domainId');
  const status   = c.req.query('status');

  const where: Record<string, unknown> = {};
  if (domainId) where['domain_id'] = domainId;
  if (status)   where['status'] = status;

  const [rows, total] = await Promise.all([
    emailLogs.find({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [{ column: 'sent_at', direction: 'desc' }],
      limit,
      offset,
    }),
    emailLogs.count({ where: Object.keys(where).length ? where : undefined }),
  ]);

  return c.json({ data: rows, total, page, limit, pages: Math.ceil(total / limit) });
});

export default app;
