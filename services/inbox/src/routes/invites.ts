// Invite management routes
// POST /api/admin/invites           — create invite (admin only)
// GET  /api/invites/:token          — validate token (public)
// POST /api/invites/:token/accept   — accept invite + create user (public)

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
import { requireSession, requireAdmin, saveSession } from '../middleware/auth.ts';
import { hashPassword } from '../lib/password.ts';
import type { HonoEnv } from '../env.ts';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 21);
const app = new Hono<HonoEnv>();

// Hash the raw token for storage (only hash is stored; raw token goes in URL)
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// POST /api/admin/invites
app.post('/admin/invites', requireSession, requireAdmin, zValidator('json', z.object({ email: z.string().email().toLowerCase() })), async (c) => {
  const { email } = c.req.valid('json');

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? LIMIT 1').bind(email).first();
  if (existing) return c.json({ error: 'already_exists' }, 409);

  const rawToken = nanoid() + nanoid(); // 42-char URL-safe token
  const tokenHash = await sha256Hex(rawToken);
  const id = nanoid();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48h

  await c.env.DB.prepare(
    'INSERT INTO invites (id, email, token_hash, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)',
  ).bind(id, email, tokenHash, expiresAt, new Date().toISOString()).run();

  const origin = new URL(c.req.url).origin;
  return c.json({ inviteUrl: `${origin}/invite/${rawToken}` }, 201);
});

// GET /api/invites/:token
app.get('/invites/:token', async (c) => {
  const rawToken = c.req.param('token');
  const tokenHash = await sha256Hex(rawToken);

  const invite = await c.env.DB.prepare(
    'SELECT id, email, expires_at, used FROM invites WHERE token_hash = ? LIMIT 1',
  ).bind(tokenHash).first<{ id: string; email: string; expires_at: string; used: number }>();

  if (!invite) return c.json({ error: 'invite_not_found' }, 404);
  if (invite.used) return c.json({ error: 'invite_not_found' }, 404);
  if (new Date(invite.expires_at) < new Date()) return c.json({ error: 'invite_expired' }, 410);

  return c.json({ email: invite.email });
});

const acceptSchema = z.object({
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});

// POST /api/invites/:token/accept
app.post('/invites/:token/accept', zValidator('json', acceptSchema), async (c) => {
  const rawToken = c.req.param('token');
  const tokenHash = await sha256Hex(rawToken);

  const invite = await c.env.DB.prepare(
    'SELECT id, email, expires_at, used FROM invites WHERE token_hash = ? LIMIT 1',
  ).bind(tokenHash).first<{ id: string; email: string; expires_at: string; used: number }>();

  if (!invite) return c.json({ error: 'invite_not_found' }, 404);
  if (invite.used) return c.json({ error: 'invite_not_found' }, 404);
  if (new Date(invite.expires_at) < new Date()) return c.json({ error: 'invite_expired' }, 410);

  const { name, password } = c.req.valid('json');
  const passwordHash = await hashPassword(password);
  const userId = nanoid();
  const now = new Date().toISOString();

  // Atomic: create user + mark invite used in a batch
  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(userId, name, invite.email, passwordHash, 'member', now),
    c.env.DB.prepare('UPDATE invites SET used = 1 WHERE id = ?').bind(invite.id),
  ]);

  await saveSession(c, { userId, role: 'member' });
  return c.json({ ok: true }, 201);
});

export default app;
