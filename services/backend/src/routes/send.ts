import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { db, emailLogs, templates, domains } from '../db.js';
import { sendEmail } from '../services/cloudflare.js';
import { renderLayout } from '../emails/render.js';
import type { LayoutName } from '../emails/render.js';
import type { ApiKeyContext } from '../middleware/apiKey.js';

const app = new Hono();

const sendSchema = z.object({
  from: z.string().email(),
  fromName: z.string().optional(),
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1).optional(),
  html: z.string().optional(),
  text: z.string().optional(),
  templateId: z.string().optional(),
  templateSlug: z.string().optional(),
  variables: z.record(z.string()).optional(),
  replyTo: z.string().email().optional(),
}).refine(d => d.templateId || d.templateSlug || d.html || d.text, {
  message: 'Provide templateId, templateSlug, or at least one of html/text',
});

// POST /v1/send
app.post('/', zValidator('json', sendSchema), async (c) => {
  const body = c.req.valid('json');
  const apiKey = c.get('apiKey' as never) as ApiKeyContext;

  let html = body.html;
  let text = body.text;
  let subject = body.subject ?? '';
  let templateId: string | null = null;
  let domainId: string | null = null;

  // Resolve template (custom or system/layout)
  if (body.templateSlug || body.templateId) {
    const template = body.templateSlug
      ? await templates.findOne({ where: { slug: body.templateSlug } })
      : await templates.findOne({ where: { id: body.templateId! } });
    if (!template) return c.json({ error: 'Template not found' }, 404);

    const vars = body.variables ?? {};
    subject = applyVariables(body.subject ?? template.subject, vars);

    if (template.layout) {
      // System template — render via React Email
      html = await renderLayout(template.layout as LayoutName, vars);
    } else {
      // Custom template — use stored HTML
      html = applyVariables(template.html_body, vars);
      text = template.text_body ? applyVariables(template.text_body, vars) : undefined;
    }
    templateId = template.id;
    domainId = template.domain_id;
  }

  // Resolve domain from sender address if not set via template
  if (!domainId) {
    const senderDomain = body.from.split('@')[1];
    if (senderDomain) {
      // Match by name substring (sending subdomain like "mail.example.com" vs "example.com")
      const result = await db.query(
        `SELECT id FROM domains WHERE name = ? OR name LIKE ? LIMIT 1`,
        [senderDomain, `%.${senderDomain}`],
      );
      domainId = (result.rows[0] as any)?.id ?? null;
    }
  }

  // Enforce domain-scoped key restrictions
  if (apiKey.scope !== 'global' && domainId && !apiKey.allowedDomainIds.includes(domainId)) {
    return c.json({ error: 'API key not authorized for this domain' }, 403);
  }

  const logId = nanoid();
  const now = new Date().toISOString();
  const toList = Array.isArray(body.to) ? body.to : [body.to];

  // Send each recipient (CF API accepts single recipient per call)
  const results: Array<{ to: string; cfId?: string; error?: string }> = [];

  for (const recipient of toList) {
    try {
      const cfResult = await sendEmail({
        from: body.fromName ? { address: body.from, name: body.fromName } : body.from,
        to: recipient,
        subject,
        html,
        text,
        replyTo: body.replyTo,
      });

      await emailLogs.insert({
        id: nanoid(),
        to_address: recipient,
        from_address: body.from,
        subject,
        status: 'sent',
        cf_message_id: cfResult.id ?? null,
        domain_id: domainId,
        template_id: templateId,
        api_key_id: apiKey.keyId,
        error: null,
        sent_at: now,
      });

      results.push({ to: recipient, cfId: cfResult.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      await emailLogs.insert({
        id: nanoid(),
        to_address: recipient,
        from_address: body.from,
        subject,
        status: 'failed',
        cf_message_id: null,
        domain_id: domainId,
        template_id: templateId,
        api_key_id: apiKey.keyId,
        error: message,
        sent_at: now,
      });

      results.push({ to: recipient, error: message });
    }
  }

  const allFailed = results.every(r => r.error);
  return c.json({ results }, allFailed ? 502 : 200);
});

function applyVariables(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export default app;
