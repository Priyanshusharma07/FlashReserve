import fs from 'fs';
import { randomBytes, scryptSync } from 'node:crypto';
import path from 'path';
import pg from 'pg';
import { runMigrations } from '../migrations/migration-runner.js';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function seed() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    'postgresql://flashuser:flashpassword@localhost:5432/flashreserve';

  console.log(`Connecting to PostgreSQL at ${databaseUrl.replace(/:([^:@]+)@/, ':****@')}...`);

  const caCertPath = process.env.DATABASE_CA_CERT_PATH;
  let ca = process.env.DATABASE_CA_CERT;
  if (!ca && caCertPath) {
    try {
      const fullPath = path.isAbsolute(caCertPath)
        ? caCertPath
        : path.join(process.cwd(), caCertPath);
      if (fs.existsSync(fullPath)) {
        ca = fs.readFileSync(fullPath, 'utf-8');
      }
    } catch (err) {
      console.warn(`Could not read CA certificate: ${err}`);
    }
  }

  const isCloud =
    databaseUrl.includes('sslmode') ||
    databaseUrl.includes('neon.tech') ||
    databaseUrl.includes('aivencloud.com');

  let connectionUrl = databaseUrl;
  let ssl: pg.ConnectionConfig['ssl'] = undefined;
  if (ca) {
    ssl = { rejectUnauthorized: true, ca };
    try {
      const parsed = new URL(connectionUrl);
      parsed.searchParams.delete('sslmode');
      connectionUrl = parsed.toString();
    } catch {
      // Leave as is
    }
  } else if (isCloud) {
    ssl = { rejectUnauthorized: false };
  }

  const pool = new pg.Pool({
    connectionString: connectionUrl,
    ssl,
  });

  console.log('Applying database migrations...');
  await runMigrations(pool);

  const client = await pool.connect();
  try {
    const campaignId = 'camp_seed_flash_sale';
    const startsAt = new Date(Date.now() - 3600 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const sql = `
      INSERT INTO flash_campaigns (
        id, title, price_cents, total_inventory, reserved_count, version, starts_at, ends_at
      ) VALUES ($1, $2, $3, $4, 0, 1, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        total_inventory = EXCLUDED.total_inventory,
        starts_at = EXCLUDED.starts_at,
        ends_at = EXCLUDED.ends_at,
        updated_at = NOW();
    `;

    await client.query(sql, [
      campaignId,
      'FlashReserve iPhone 16 Pro Flagship Sale',
      99900,
      10000,
      startsAt,
      endsAt,
    ]);

    console.log(`Successfully seeded sample campaign: ${campaignId}`);

    // Seed default admin and user
    const adminPasswordHash = hashPassword('Admin@12345');
    const userPasswordHash = hashPassword('User@12345');

    const userSql = `
      INSERT INTO users (id, email, password_hash, name, role)
      VALUES
        ('user_admin_1', 'admin@flashreserve.io', $1, 'Admin User', 'admin'),
        ('user_customer_1', 'user@flashreserve.io', $2, 'Customer User', 'user')
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = NOW();
    `;
    await client.query(userSql, [adminPasswordHash, userPasswordHash]);
    console.log('Successfully seeded default users: admin@flashreserve.io & user@flashreserve.io');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
