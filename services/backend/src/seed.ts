import { createHash, randomBytes } from 'node:crypto';
import { db } from './db.js';
import { env } from './env.js';
import { nanoid } from 'nanoid';

export async function seedAdmin(): Promise<void> {
  const existing = await db.table('admin_users').findOne({ where: { email: env.ADMIN_EMAIL } });
  if (existing) {
    console.log('[seed] admin already exists, skipping');
    return;
  }

  const passwordHash = createHash('sha256').update(env.ADMIN_PASSWORD).digest('hex');

  await db.table('admin_users').insert({
    id: nanoid(),
    email: env.ADMIN_EMAIL,
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
  });

  console.log(`[seed] admin created: ${env.ADMIN_EMAIL}`);
}
