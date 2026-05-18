// Database migrations runner.
// Reads SQL files from MIGRATIONS_DIR and applies any that haven't run yet.
// Tracks applied migrations in a `schema_migrations` table inside MesaHub.

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { mesaDb } from './db.js';
import { env } from './env.js';

// Split a SQL file into individual statements.
// Strips -- line comments and /* */ block comments, then splits on semicolons.
// MesaHub's REST API only accepts one statement per request.
function splitStatements(sql: string): string[] {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '') // strip /* */ block comments
    .replace(/--[^\n]*/g, '')          // strip -- line comments
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function ensureMigrationsTable(): Promise<void> {
  console.log('[migrations] Ensuring schema_migrations table exists...');
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
  const names = result.rows.map(r => (r as { name: string }).name);
  if (names.length > 0) {
    console.log(`[migrations] Already applied: ${names.join(', ')}`);
  } else {
    console.log('[migrations] No migrations applied yet.');
  }
  return new Set(names);
}

export async function runMigrations(): Promise<void> {
  const dir = env.MIGRATIONS_DIR;
  console.log(`[migrations] Using directory: ${dir}`);

  let files: string[];
  try {
    const entries = await readdir(dir);
    files = entries.filter(f => f.endsWith('.sql')).sort();
    console.log(`[migrations] Found ${files.length} file(s): ${files.join(', ')}`);
  } catch (err) {
    console.warn(`[migrations] Directory not found: ${dir} — skipping migrations`);
    console.warn(`[migrations] Error:`, err);
    return;
  }

  await ensureMigrationsTable();
  const applied = await appliedMigrations();

  let appliedCount = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[migrations] Skipping ${file} (already applied)`);
      continue;
    }

    const filePath = join(dir, file);
    console.log(`[migrations] ── Applying ${file} ──────────────────────`);

    let sql: string;
    try {
      sql = await readFile(filePath, 'utf-8');
    } catch (err) {
      console.error(`[migrations] Failed to read ${file}:`, err);
      throw err;
    }

    const statements = splitStatements(sql);
    console.log(`[migrations]   ${statements.length} statement(s) to execute`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.replace(/\s+/g, ' ').slice(0, 80);
      console.log(`[migrations]   [${i + 1}/${statements.length}] ${preview}${stmt.length > 80 ? '…' : ''}`);
      try {
        await mesaDb.exec(stmt, []);
      } catch (err) {
        console.error(`[migrations]   FAILED statement [${i + 1}]: ${stmt}`);
        console.error(`[migrations]   Error:`, err);
        throw new Error(`Migration ${file} failed at statement ${i + 1}: ${err}`);
      }
    }

    try {
      await mesaDb.exec(
        'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)',
        [file, new Date().toISOString()],
      );
    } catch (err) {
      console.error(`[migrations]   Failed to record migration ${file} as applied:`, err);
      throw err;
    }

    console.log(`[migrations] ✓ Applied ${file} (${statements.length} statements)`);
    appliedCount++;
  }

  if (appliedCount === 0) {
    console.log('[migrations] All migrations already applied — nothing to do.');
  } else {
    console.log(`[migrations] Done — applied ${appliedCount} migration file(s).`);
  }
}

// Allow running as a standalone script: `node dist/migrate.js`
if (process.argv[1]?.endsWith('migrate.js')) {
  runMigrations()
    .then(() => { console.log('[migrations] All done.'); process.exit(0); })
    .catch(err => { console.error('[migrations] Failed:', err); process.exit(1); });
}
