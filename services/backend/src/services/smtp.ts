import nodemailer from 'nodemailer';
import { env } from '../env.js';
import type { CFSendEmailParams, CFSendEmailResult } from './cloudflare.js';

function getTransporter() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    ...(env.SMTP_USER
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
      : {}),
  });
}

export async function sendEmailViaSmtp(params: CFSendEmailParams): Promise<CFSendEmailResult> {
  const transporter = getTransporter();

  const from =
    typeof params.from === 'string'
      ? params.from
      : `"${params.from.name}" <${params.from.address}>`;

  await transporter.sendMail({
    from,
    to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    ...(params.replyTo ? { replyTo: params.replyTo } : {}),
  });

  return { id: crypto.randomUUID() };
}
