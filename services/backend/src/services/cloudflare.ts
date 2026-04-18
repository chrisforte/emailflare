import { env } from '../env.js';

const CF_BASE = 'https://api.cloudflare.com/client/v4';

interface CFResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: T;
}

async function cfFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${CF_BASE}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const json = (await res.json()) as CFResponse<T>;

  if (!json.success) {
    const msg = json.errors?.[0]?.message ?? 'Cloudflare API error';
    throw new Error(`CF API error: ${msg}`);
  }

  return json.result;
}

// ── Sending Subdomains ────────────────────────────────────────────────────────

export interface CFSubdomain {
  tag: string;
  name: string;
  enabled: boolean;
  dkim_selector: string | null;
  return_path_domain: string | null;
  created: string | null;
  modified: string | null;
}

export async function createSendingSubdomain(zoneId: string, name: string): Promise<CFSubdomain> {
  return cfFetch<CFSubdomain>(`/zones/${zoneId}/email/sending/subdomains`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function getSendingSubdomain(zoneId: string, subdomainId: string): Promise<CFSubdomain> {
  return cfFetch<CFSubdomain>(`/zones/${zoneId}/email/sending/subdomains/${subdomainId}`);
}

export async function listSendingSubdomains(zoneId: string): Promise<CFSubdomain[]> {
  return cfFetch<CFSubdomain[]>(`/zones/${zoneId}/email/sending/subdomains`);
}

// ── DNS Records ────────────────────────────────────────────────────────────────

export interface CFDnsRecord {
  type: string;
  name: string;
  content: string;
  ttl: number | 1;
  priority?: number;
}

export async function getSubdomainDnsRecords(zoneId: string, subdomainId: string): Promise<CFDnsRecord[]> {
  return cfFetch<CFDnsRecord[]>(`/zones/${zoneId}/email/sending/subdomains/${subdomainId}/dns`);
}

// ── Email Sending ─────────────────────────────────────────────────────────────

export interface CFSendEmailParams {
  from: string | { address: string; name: string };
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

export interface CFSendEmailResult {
  id: string;
}

export async function sendEmail(params: CFSendEmailParams): Promise<CFSendEmailResult> {
  return cfFetch<CFSendEmailResult>(`/accounts/${env.CF_ACCOUNT_ID}/email/sending/send`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
