import nodemailer from 'nodemailer';
import { env } from '../env.js';
import type { CFSendEmailParams, CFSendEmailResult } from './cloudflare.js';

function getTransporter() {
  const isImplicitTls = env.SMTP_PORT === 465;
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: isImplicitTls,
    ...(env.SMTP_USER
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
      : {}),
    tls: { rejectUnauthorized: env.NODE_ENV === 'production' },
  });
}

export async function sendEmailViaSmtp(params: CFSendEmailParams): Promise<CFSendEmailResult> {
  const transporter = getTransporter();

  const from =
    typeof params.from === 'string'
      ? params.from
      : `"${params.from.name.replace(/[\r\n]/g, ' ')}" <${params.from.address}>`;

  await transporter.sendMail({
    from,
    to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    attachments: params.attachments,
    ...(params.replyTo ? { replyTo: params.replyTo } : {}),
  });

  return { id: crypto.randomUUID() };
}
