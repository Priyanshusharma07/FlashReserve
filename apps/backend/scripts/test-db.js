import fs from 'fs';
import path from 'path';
import pg from 'pg';

async function testConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set in environment.');
    process.exit(1);
  }

  const caCertPath = process.env.DATABASE_CA_CERT_PATH;
  let ca = process.env.DATABASE_CA_CERT;
  if (!ca && caCertPath) {
    const fullPath = path.isAbsolute(caCertPath)
      ? caCertPath
      : path.join(process.cwd(), caCertPath);
    if (fs.existsSync(fullPath)) {
      ca = fs.readFileSync(fullPath, 'utf-8');
    }
  }

  const isCloud =
    databaseUrl.includes('sslmode') ||
    databaseUrl.includes('neon.tech') ||
    databaseUrl.includes('aivencloud.com');

  let connectionUrl = databaseUrl;
  let ssl = undefined;
  if (ca) {
    ssl = { rejectUnauthorized: true, ca };
    try {
      const parsed = new URL(connectionUrl);
      parsed.searchParams.delete('sslmode');
      connectionUrl = parsed.toString();
    } catch {
      // ignore
    }
  } else if (isCloud) {
    ssl = { rejectUnauthorized: false };
  }

  console.log(`Testing connection to: ${connectionUrl.replace(/:([^:@]+)@/, ':****@')}`);
  console.log(`SSL CA configured: ${ca ? 'Yes (Aiven CA Certificate)' : 'No'}`);

  const pool = new pg.Pool({
    connectionString: connectionUrl,
    ssl,
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    const res = await client.query('SELECT version();');
    console.log('Connection successful!');
    console.log('PostgreSQL version:', res.rows[0].version);

    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );
    console.log('Tables present in DB:', tables.rows.map((r) => r.table_name).join(', '));

    const campaigns = await client.query('SELECT id, title, total_inventory FROM flash_campaigns;');
    console.log(`Active campaigns found (${campaigns.rowCount}):`);
    campaigns.rows.forEach((c) => {
      console.log(` - [${c.id}] ${c.title} (Stock: ${c.total_inventory})`);
    });

    client.release();
  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    await pool.end();
  }
}

testConnection();
