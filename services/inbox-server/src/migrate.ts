// Database migrations runner.
// Reads SQL files from MIGRATIONS_DIR and applies any that haven't run yet.
// Tracks applied migrations in a `schema_migrations` table inside MesaHub.

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { mesaDb } from './db.js';
import { env } from './env.js';

async function ensureMigrationsTable(): Promise<void> {
  await mesaDb.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name       TEXT PRIMARY KEY,
       applied_at TEXT NOT NULL
     )`,
    [],
  );
}

async function appliedMigrations(): Promise<Set<string>> {
  const result = await mesaDb.query(
    'SELECT name FROM schema_migrations ORDER BY name ASC',
    [],
  );
  return new Set(result.rows.map(r => (r as { name: string }).name));
}

export async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();

  const dir = env.MIGRATIONS_DIR;
  let files: string[];
  try {
    const entries = await readdir(dir);
    files = entries.filter(f => f.endsWith('.sql')).sort();
  } catch {
    console.warn(`[migrations] Directory not found: ${dir} — skipping migrations`);
    return;
  }

  const applied = await appliedMigrations();

  for (const file of files) {
    if (applied.has(file)) continue;

    console.log(`[migrations] Applying ${file}...`);
    const sql = await readFile(join(dir, file), 'utf-8');
    await mesaDb.exec(sql, []);

    await mesaDb.exec(
      'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)',
      [file, new Date().toISOString()],
    );
    console.log(`[migrations] Applied ${file}`);
  }
}

// Allow running as a standalone script: `node dist/migrate.js`
if (process.argv[1]?.endsWith('migrate.js')) {
  runMigrations()
    .then(() => { console.log('[migrations] All done.'); process.exit(0); })
    .catch(err => { console.error('[migrations] Failed:', err); process.exit(1); });
}
