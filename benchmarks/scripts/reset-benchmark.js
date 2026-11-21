import fs from 'fs';
import path from 'path';
import pg from 'pg';
import Redis from 'ioredis';

// Automatically load environment variables from apps/backend/.env if not present
function loadEnv() {
  if (!process.env.DATABASE_URL) {
    const envPaths = [
      path.resolve('.env'),
      path.resolve('apps/backend/.env'),
      path.resolve('../../apps/backend/.env'),
    ];
    for (const p of envPaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [k, ...v] = trimmed.split('=');
            if (!process.env[k.trim()]) {
              process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
            }
          }
        }
        break;
      }
    }
  }
}
loadEnv();

const CAMPAIGN_ID = process.env.CAMPAIGN_ID || 'camp_seed_flash_sale';
const INVENTORY = parseInt(process.env.INVENTORY || '100000', 10);
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/flashreserve';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

async function resetBenchmark() {
  console.log(`=======================================================`);
  console.log(`       FlashReserve Benchmark Environment Reset        `);
  console.log(` Target Campaign : ${CAMPAIGN_ID}`);
  console.log(` Target Inventory: ${INVENTORY.toLocaleString()} units`);
  console.log(`=======================================================`);

  // Clean URL to prevent pg sslmode collision with rejectUnauthorized: false
  let cleanDbUrl = DATABASE_URL;
  try {
    const parsed = new URL(cleanDbUrl);
    parsed.searchParams.delete('sslmode');
    cleanDbUrl = parsed.toString();
  } catch {}

  const isCloud = DATABASE_URL.includes('aivencloud.com') || DATABASE_URL.includes('neon.tech') || DATABASE_URL.includes('sslmode');

  // 1. PostgreSQL Reset
  const pool = new pg.Pool({
    connectionString: cleanDbUrl,
    ssl: isCloud ? { rejectUnauthorized: false } : undefined,
  });

  const client = await pool.connect();
  try {
    console.log('Clearing old reservation records from PostgreSQL...');
    await client.query('DELETE FROM reservations WHERE campaign_id = $1', [CAMPAIGN_ID]);

    const startsAt = new Date(Date.now() - 3600 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

    console.log(`Updating ${CAMPAIGN_ID} to ${INVENTORY} units in PostgreSQL...`);
    await client.query(
      `UPDATE flash_campaigns 
       SET total_inventory = $1, 
           reserved_count = 0, 
           starts_at = $2,
           ends_at = $3,
           updated_at = NOW() 
       WHERE id = $4`,
      [INVENTORY, startsAt, endsAt, CAMPAIGN_ID],
    );
  } finally {
    client.release();
    await pool.end();
  }

  // 2. Redis Reset
  const redis = new Redis(REDIS_URL);
  try {
    console.log('Flushing benchmark reservation keys in Redis...');

    const keysToDelete = await redis.keys(`flash:*:{${CAMPAIGN_ID}}*`);
    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
      console.log(`Deleted ${keysToDelete.length} campaign keys in Redis.`);
    }

    // Reset Stream
    await redis.del('stream:reservations');
    console.log('Reset stream:reservations.');

    // Preload Redis Campaign Metadata & Stock
    const stockKey = `flash:stock:{${CAMPAIGN_ID}}`;
    const metaKey = `flash:meta:{${CAMPAIGN_ID}}`;

    const now = Date.now();
    const startsAtMs = (now - 3600 * 1000).toString();
    const endsAtMs = (now + 7 * 24 * 3600 * 1000).toString();

    await redis.set(stockKey, INVENTORY);
    await redis.hset(metaKey, {
      id: CAMPAIGN_ID,
      title: 'FlashReserve Benchmark Sale',
      priceCents: '99900',
      totalInventory: INVENTORY.toString(),
      isActive: 'true',
      startsAt: startsAtMs,
      endsAt: endsAtMs,
      startsAtIso: new Date(now - 3600 * 1000).toISOString(),
      endsAtIso: new Date(now + 7 * 24 * 3600 * 1000).toISOString(),
    });

    console.log(`Initialized Redis stock to ${INVENTORY} units.`);
    console.log('Environment is 100% ready for k6 benchmark execution!');
  } finally {
    await redis.quit();
  }
}

resetBenchmark().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
