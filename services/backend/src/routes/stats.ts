import { Hono } from 'hono';
import { db, domains, templates, apiKeys, emailLogs } from '../db.js';

const CF_DAILY_LIMIT = 1000;

const app = new Hono();

// GET /api/stats
app.get('/', async (c) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [
    totalDomains,
    verifiedDomains,
    totalTemplates,
    totalKeys,
    totalEmails,
    sentToday,
    failedToday,
    domainBreakdownResult,
  ] = await Promise.all([
    domains.count(),
    domains.count({ where: { verified: 1 } }),
    templates.count(),
    apiKeys.count({ where: { active: 1 } }),
    emailLogs.count(),
    emailLogs.count({ where: { status: 'sent', sent_at: { gte: todayIso } } }),
    emailLogs.count({ where: { status: 'failed', sent_at: { gte: todayIso } } }),
    db.query(
      `SELECT
         COALESCE(d.name, el.from_address) AS domain_name,
         SUM(CASE WHEN el.status = 'sent'   THEN 1 ELSE 0 END) AS sent,
         SUM(CASE WHEN el.status = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM email_logs el
       LEFT JOIN domains d ON el.domain_id = d.id
       WHERE el.sent_at >= ?
       GROUP BY el.domain_id, d.name, el.from_address
       ORDER BY sent DESC`,
      [todayIso],
    ),
  ]);

  return c.json({
    totalDomains,
    verifiedDomains,
    totalTemplates,
    totalKeys,
    totalEmails,
    sentToday,
    failedToday,
    cfDailyLimit: CF_DAILY_LIMIT,
    domainBreakdown: (domainBreakdownResult.rows as Array<{ domain_name: string; sent: number; failed: number }>).map(r => ({
      name: r.domain_name,
      sent: Number(r.sent),
      failed: Number(r.failed),
    })),
  });
});

export default app;
