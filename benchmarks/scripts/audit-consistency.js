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
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/flashreserve';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

async function runAudit() {
  console.log(`\n======================================================================`);
  console.log(`            FlashReserve Benchmark Consistency & Integrity Audit       `);
  console.log(`======================================================================`);
  console.log(`Campaign Target : ${CAMPAIGN_ID}`);
  console.log(`Timestamp       : ${new Date().toISOString()}`);
  console.log(`----------------------------------------------------------------------\n`);

  // Clean URL to prevent pg sslmode collision
  let cleanDbUrl = DATABASE_URL;
  try {
    const parsed = new URL(cleanDbUrl);
    parsed.searchParams.delete('sslmode');
    cleanDbUrl = parsed.toString();
  } catch {}

  const isCloud = DATABASE_URL.includes('aivencloud.com') || DATABASE_URL.includes('neon.tech') || DATABASE_URL.includes('sslmode');

  // 1. PostgreSQL Audit
  const pool = new pg.Pool({
    connectionString: cleanDbUrl,
    ssl: isCloud ? { rejectUnauthorized: false } : undefined,
  });

  const client = await pool.connect();
  let pgCampaign;
  let pgStats;
  let duplicateCount = 0;

  try {
    const campRes = await client.query(
      `SELECT id, title, total_inventory, reserved_count FROM flash_campaigns WHERE id = $1`,
      [CAMPAIGN_ID],
    );

    if (campRes.rows.length === 0) {
      console.error(`ERROR: Campaign ${CAMPAIGN_ID} not found in PostgreSQL!`);
      process.exit(1);
    }
    pgCampaign = campRes.rows[0];

    const statsRes = await client.query(
      `SELECT 
         COUNT(*)::int as total_records,
         COALESCE(SUM(quantity), 0)::int as total_units_claimed,
         COUNT(CASE WHEN status = 'RESERVED' THEN 1 END)::int as count_reserved,
         COUNT(CASE WHEN status = 'PAID' THEN 1 END)::int as count_paid,
         COUNT(CASE WHEN status = 'EXPIRED' THEN 1 END)::int as count_expired,
         COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END)::int as count_cancelled
       FROM reservations 
       WHERE campaign_id = $1`,
      [CAMPAIGN_ID],
    );
    pgStats = statsRes.rows[0];

    const dupRes = await client.query(
      `SELECT user_id, COUNT(*) 
       FROM reservations 
       WHERE campaign_id = $1 
       GROUP BY user_id 
       HAVING COUNT(*) > 1`,
      [CAMPAIGN_ID],
    );
    duplicateCount = dupRes.rows.length;
  } finally {
    client.release();
    await pool.end();
  }

  // 2. Redis Audit
  const redis = new Redis(REDIS_URL);
  let redisStock = null;
  let streamLen = 0;
  let pendingCount = 0;
  let redisUserKeyCount = 0;

  try {
    const stockVal = await redis.get(`flash:stock:{${CAMPAIGN_ID}}`);
    redisStock = stockVal !== null ? parseInt(stockVal, 10) : 'N/A';

    try {
      streamLen = await redis.xlen('stream:reservations');
    } catch {
      streamLen = 0;
    }

    try {
      const pendingInfo = await redis.xpending('stream:reservations', 'persistence-group');
      pendingCount = pendingInfo && pendingInfo[0] ? pendingInfo[0] : 0;
    } catch {
      pendingCount = 0;
    }

    const userKeys = await redis.keys(`flash:user:{${CAMPAIGN_ID}}:*`);
    redisUserKeyCount = userKeys.length;
  } finally {
    await redis.quit();
  }

  // 3. Evaluation of Invariants
  const totalAllocatedUnits = pgStats.total_units_claimed;
  const initialInventory = pgCampaign.total_inventory;
  const isZeroOversellingMet = totalAllocatedUnits <= initialInventory;
  const isStockNonNegative = typeof redisStock === 'number' ? redisStock >= 0 : true;
  const isIdempotencyIntact = duplicateCount === 0;
  const isStreamDrained = pendingCount === 0;

  // 4. Output Summary Table
  console.log(`[POSTGRESQL AUDIT DATA]`);
  console.log(`  Campaign Title           : ${pgCampaign.title}`);
  console.log(`  Campaign Total Inventory : ${initialInventory.toLocaleString()}`);
  console.log(`  DB Reserved Counter      : ${pgCampaign.reserved_count.toLocaleString()}`);
  console.log(`  Total Reservation Records: ${pgStats.total_records.toLocaleString()}`);
  console.log(`  Total Units Claimed      : ${totalAllocatedUnits.toLocaleString()}`);
  console.log(`  Breakdown by Status:`);
  console.log(`    - PENDING/RESERVED     : ${pgStats.count_reserved.toLocaleString()}`);
  console.log(`    - PAID / CONFIRMED     : ${pgStats.count_paid.toLocaleString()}`);
  console.log(`    - EXPIRED              : ${pgStats.count_expired.toLocaleString()}`);
  console.log(`    - CANCELLED            : ${pgStats.count_cancelled.toLocaleString()}`);
  console.log(`  Duplicate Idempotency Keys: ${duplicateCount}`);

  console.log(`\n[REDIS AUDIT DATA]`);
  console.log(`  Authoritative Stock Left : ${redisStock}`);
  console.log(`  Active User Lock Keys    : ${redisUserKeyCount.toLocaleString()}`);
  console.log(`  Stream Total Length      : ${streamLen.toLocaleString()}`);
  console.log(`  Stream Unacknowledged Msg: ${pendingCount}`);

  console.log(`\n----------------------------------------------------------------------`);
  console.log(`                      INVARIANT AUDIT RESULTS                         `);
  console.log(`----------------------------------------------------------------------`);

  let allPassed = true;

  // Invariant 1
  if (isZeroOversellingMet) {
    console.log(`  [PASS] ZERO OVERSELLING INVARIANT: Total units claimed (${totalAllocatedUnits}) <= Inventory (${initialInventory})`);
  } else {
    console.log(`  [FAIL] OVERSELLING DETECTED! Claimed (${totalAllocatedUnits}) > Inventory (${initialInventory})`);
    allPassed = false;
  }

  // Invariant 2
  if (isStockNonNegative) {
    console.log(`  [PASS] NON-NEGATIVE INVENTORY: Redis stock remaining (${redisStock}) >= 0`);
  } else {
    console.log(`  [FAIL] NEGATIVE INVENTORY: Redis stock dipped below zero (${redisStock})`);
    allPassed = false;
  }

  // Invariant 3
  if (isIdempotencyIntact) {
    console.log(`  [PASS] IDEMPOTENCY CONSISTENCY: 0 duplicate idempotency submissions found`);
  } else {
    console.log(`  [FAIL] IDEMPOTENCY VIOLATION: ${duplicateCount} duplicate reservations detected`);
    allPassed = false;
  }

  // Invariant 4
  if (isStreamDrained) {
    console.log(`  [PASS] STREAM PERSISTENCE: Worker has fully drained all reservations (0 pending lag)`);
  } else {
    console.log(`  [WARN] STREAM BACKLOG: Worker has ${pendingCount} pending unacknowledged reservations`);
  }

  console.log(`======================================================================\n`);

  if (!allPassed) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Audit script failed with error:', err);
  process.exit(1);
});
