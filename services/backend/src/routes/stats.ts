import { Hono } from 'hono';
import { db, domains, templates, apiKeys, emailLogs } from '../db.js';

const app = new Hono();

// GET /api/stats
app.get('/', async (c) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalDomains,
    verifiedDomains,
    totalTemplates,
    totalKeys,
    totalEmails,
    sentToday,
    failedToday,
  ] = await Promise.all([
    domains.count(),
    domains.count({ where: { verified: 1 } }),
    templates.count(),
    apiKeys.count({ where: { active: 1 } }),
    emailLogs.count(),
    emailLogs.count({ where: { status: 'sent', sent_at: { gte: today.toISOString() } } }),
    emailLogs.count({ where: { status: 'failed', sent_at: { gte: today.toISOString() } } }),
  ]);

  return c.json({
    totalDomains,
    verifiedDomains,
    totalTemplates,
    totalKeys,
    totalEmails,
    sentToday,
    failedToday,
  });
});

export default app;
