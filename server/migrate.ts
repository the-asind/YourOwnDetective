/**
 * Simple forward-only migration runner.
 * Applies .sql files from server/migrations/ in alphabetical order.
 * Tracks applied migrations in a `_migrations` table.
 */
import fs from 'fs';
import path from 'path';
import { pool, query } from './db.js';

const MIGRATIONS_DIR = path.resolve(import.meta.dirname ?? __dirname, 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         SERIAL PRIMARY KEY,
      filename   TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getApplied(): Promise<Set<string>> {
  const { rows } = await query<{ filename: string }>('SELECT filename FROM _migrations ORDER BY id');
  return new Set(rows.map((r) => r.filename));
}

export async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await getApplied();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[Migrate] ✓ ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    console.log(`[Migrate] Applying ${file}...`);

    await query('BEGIN');
    try {
      await query(sql);
      await query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      await query('COMMIT');
      console.log(`[Migrate] ✓ ${file} applied.`);
    } catch (err) {
      await query('ROLLBACK');
      console.error(`[Migrate] ✗ ${file} FAILED:`, err);
      throw err;
    }
  }

  console.log('[Migrate] All migrations applied.');
}

// Allow running directly: `tsx server/migrate.ts`
if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
