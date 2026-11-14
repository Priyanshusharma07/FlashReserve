import { readdir, readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runMigrations(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    let migrationsDir = __dirname;
    let files = await readdir(migrationsDir).catch(() => []);
    let sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();

    if (sqlFiles.length === 0) {
      const srcDir = join(process.cwd(), 'src/database/migrations');
      const srcFiles = await readdir(srcDir).catch(() => []);
      if (srcFiles.some((f) => f.endsWith('.sql'))) {
        migrationsDir = srcDir;
        files = srcFiles;
        sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();
      }
    }

    for (const sqlFile of sqlFiles) {
      const res = await client.query(
        'SELECT id FROM schema_migrations WHERE name = $1',
        [sqlFile],
      );

      if (res.rows.length === 0) {
        console.log(`[Migrations] Applying migration: ${sqlFile}`);
        const sqlContent = await readFile(join(migrationsDir, sqlFile), 'utf-8');

        await client.query('BEGIN');
        try {
          await client.query(sqlContent);
          await client.query(
            'INSERT INTO schema_migrations (name) VALUES ($1)',
            [sqlFile],
          );
          await client.query('COMMIT');
          console.log(`[Migrations] Successfully applied: ${sqlFile}`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`[Migrations] Failed applying migration: ${sqlFile}`, err);
          throw err;
        }
      }
    }
  } finally {
    client.release();
  }
}
