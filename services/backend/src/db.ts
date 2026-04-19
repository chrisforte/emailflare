import { SqliteHubClient } from '@sqlite-hub/client';
import { env } from './env.js';

const client = new SqliteHubClient({
  apiKey: env.SQLITE_HUB_API_KEY,
  apiUrl: env.SQLITE_HUB_API_URL,
});

export const db = client.db(env.SQLITE_HUB_DB);

// ── Table handles ─────────────────────────────────────────────────────────────

export interface DomainRow {
  id: string;
  name: string;
  cf_zone_id: string;
  cf_subdomain_id: string | null;
  dkim_selector: string | null;
  return_path_domain: string | null;
  verified: number; // 0 | 1
  created_at: string;
}

export interface TemplateRow {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  layout: string | null;
  domain_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyRow {
  id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scope: 'global' | 'domain' | 'multi';
  active: number; // 0 | 1
  created_at: string;
}

export interface ApiKeyDomainRow {
  api_key_id: string;
  domain_id: string;
}

export interface EmailLogRow {
  id: string;
  to_address: string;
  from_address: string;
  subject: string;
  status: 'pending' | 'sent' | 'failed';
  cf_message_id: string | null;
  domain_id: string | null;
  template_id: string | null;
  api_key_id: string | null;
  error: string | null;
  sent_at: string;
}

export const domains    = db.table<DomainRow>('domains');
export const templates  = db.table<TemplateRow>('templates');
export const apiKeys    = db.table<ApiKeyRow>('api_keys');
export const apiKeyDomains = db.table<ApiKeyDomainRow>('api_key_domains');
export const emailLogs  = db.table<EmailLogRow>('email_logs');

// ── Schema bootstrap ──────────────────────────────────────────────────────────

export async function bootstrapSchema(): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS domains (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL UNIQUE,
      cf_zone_id       TEXT NOT NULL,
      cf_subdomain_id  TEXT,
      dkim_selector    TEXT,
      return_path_domain TEXT,
      verified         INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT NOT NULL
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      subject     TEXT NOT NULL,
      html_body   TEXT NOT NULL,
      text_body   TEXT,
      layout      TEXT,
      domain_id   TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      key_hash    TEXT NOT NULL UNIQUE,
      key_prefix  TEXT NOT NULL,
      scope       TEXT NOT NULL DEFAULT 'global',
      active      INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS api_key_domains (
      api_key_id  TEXT NOT NULL,
      domain_id   TEXT NOT NULL,
      PRIMARY KEY (api_key_id, domain_id)
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id             TEXT PRIMARY KEY,
      to_address     TEXT NOT NULL,
      from_address   TEXT NOT NULL,
      subject        TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'pending',
      cf_message_id  TEXT,
      domain_id      TEXT,
      template_id    TEXT,
      api_key_id     TEXT,
      error          TEXT,
      sent_at        TEXT NOT NULL
    )
  `);

  console.log('[db] schema bootstrapped');
}
