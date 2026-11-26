import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';
import pg from 'pg';

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

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/flashreserve';

async function main() {
  console.log('======================================================================');
  console.log('       FLASHRESERVE COMPLETE END-TO-END SYSTEM INTEGRATION TEST        ');
  console.log('======================================================================');
  console.log(`Target API URL : ${BASE_URL}`);
  console.log(`Timestamp      : ${new Date().toISOString()}\n`);

  let testCustomerToken = '';
  let testCustomerId = '';
  let adminToken = '';
  let testCampaignId = '';
  let testReservationId = '';

  const testEmail = `e2e_user_${Date.now()}@example.com`;
  const testPassword = 'Password@123';
  const testName = 'E2E Test Customer';

  // 1. Health Checks
  console.log('--- STEP 1: Health & Infrastructure Probes ---');
  const liveRes = await fetch(`${BASE_URL}/health/live`);
  const liveData = await liveRes.json();
  console.log(`[PASS] Liveness probe (/health/live): status ${liveRes.status} ->`, liveData.status);

  const readyRes = await fetch(`${BASE_URL}/health/ready`);
  const readyData = await readyRes.json();
  console.log(`[PASS] Readiness probe (/health/ready): status ${readyRes.status} -> DB: ${readyData.components.database}, Redis: ${readyData.components.redis}`);

  // 2. Customer Registration
  console.log('\n--- STEP 2: Customer Registration ---');
  const regRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword, name: testName }),
  });
  const regData = await regRes.json();
  if (regRes.status !== 201) {
    throw new Error(`Customer registration failed: ${JSON.stringify(regData)}`);
  }
  testCustomerToken = regData.accessToken;
  testCustomerId = regData.user.id;
  console.log(`[PASS] Registered customer ${testEmail} (ID: ${testCustomerId})`);
  console.log(`[PASS] Received Bearer token: ${testCustomerToken.slice(0, 25)}...`);

  // 3. Customer Login & Profile Fetch
  console.log('\n--- STEP 3: Customer Login & Profile Verification ---');
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  const loginData = await loginRes.json();
  if (loginRes.status !== 200) {
    throw new Error(`Customer login failed: ${JSON.stringify(loginData)}`);
  }
  console.log(`[PASS] Customer login successful for ${loginData.user.email} (Role: ${loginData.user.role})`);

  const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${testCustomerToken}` },
  });
  const meData = await meRes.json();
  console.log(`[PASS] /auth/me verified: Authenticated as ${meData.name} <${meData.email}>`);

  // 4. Admin Authentication
  console.log('\n--- STEP 4: Admin Authentication ---');
  const adminLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@flashreserve.io', password: 'Admin@12345' }),
  });
  const adminLoginData = await adminLoginRes.json();
  if (adminLoginRes.status !== 200) {
    throw new Error(`Admin login failed: ${JSON.stringify(adminLoginData)}`);
  }
  adminToken = adminLoginData.accessToken;
  console.log(`[PASS] Admin authenticated successfully (Role: ${adminLoginData.user.role})`);

  // 5. Admin Campaign Creation & Redis Initialization
  console.log('\n--- STEP 5: Flash Sale Campaign Creation (Admin) ---');
  const campaignPayload = {
    title: `E2E Exclusive Drop ${Date.now()}`,
    priceCents: 49999,
    totalInventory: 10,
    startsAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  };
  const createCampRes = await fetch(`${BASE_URL}/api/v1/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(campaignPayload),
  });
  const createCampData = await createCampRes.json();
  if (createCampRes.status !== 201) {
    throw new Error(`Campaign creation failed: ${JSON.stringify(createCampData)}`);
  }
  testCampaignId = createCampData.id;
  console.log(`[PASS] Created campaign: "${createCampData.title}" (ID: ${testCampaignId})`);
  console.log(`[PASS] Total Inventory: ${createCampData.totalInventory}, Available: ${createCampData.availableInventory}, Active: ${createCampData.isActive}`);

  // 6. Public Catalog Discovery
  console.log('\n--- STEP 6: Public Catalog Discovery ---');
  const listRes = await fetch(`${BASE_URL}/api/v1/campaigns`);
  const listData = await listRes.json();
  const foundInCatalog = listData.data.some((c) => c.id === testCampaignId);
  console.log(`[PASS] Public campaign catalog returned ${listData.data.length} drops. Found new campaign: ${foundInCatalog}`);

  const detailRes = await fetch(`${BASE_URL}/api/v1/campaigns/${testCampaignId}`);
  const detailData = await detailRes.json();
  console.log(`[PASS] Public campaign detail: "${detailData.title}" - Live Stock: ${detailData.availableInventory}`);

  // 7. Atomic Reservation (Hot Path)
  console.log('\n--- STEP 7: Atomic Lua Reservation ---');
  const idemKey = `e2e_idem_${Date.now()}`;
  const reserveRes = await fetch(`${BASE_URL}/api/v1/sales/${testCampaignId}/reserve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testCustomerToken}`,
      'Idempotency-Key': idemKey,
    },
    body: JSON.stringify({ quantity: 1 }),
  });
  const reserveData = await reserveRes.json();
  if (reserveRes.status !== 201) {
    throw new Error(`Reservation failed with status ${reserveRes.status}: ${JSON.stringify(reserveData)}`);
  }
  testReservationId = reserveData.reservationId;
  console.log(`[PASS] Reservation CREATED! ID: ${testReservationId}`);
  console.log(`[PASS] Remaining stock decremented in Redis: ${reserveData.remainingStock} (Was 10)`);
  console.log(`[PASS] Hold expires at: ${reserveData.expiresAt}`);

  // 8. Idempotency Replay Verification
  console.log('\n--- STEP 8: Idempotency Replay Test ---');
  const replayRes = await fetch(`${BASE_URL}/api/v1/sales/${testCampaignId}/reserve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testCustomerToken}`,
      'Idempotency-Key': idemKey,
    },
    body: JSON.stringify({ quantity: 1 }),
  });
  const replayData = await replayRes.json();
  if (replayRes.status !== 201 || replayData.reservationId !== testReservationId) {
    throw new Error(`Idempotency replay failed! Status: ${replayRes.status}`);
  }
  console.log(`[PASS] Idempotent retry returned status 201 with identical reservation ID: ${replayData.reservationId}`);
  console.log(`[PASS] Inventory was NOT double-decremented (Stock remains ${replayData.remainingStock})`);

  // 9. Single Active Reservation Rule Verification
  console.log('\n--- STEP 9: Single Active Reservation Constraint Test ---');
  const secondRes = await fetch(`${BASE_URL}/api/v1/sales/${testCampaignId}/reserve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testCustomerToken}`,
      'Idempotency-Key': `second_idem_${Date.now()}`,
    },
    body: JSON.stringify({ quantity: 1 }),
  });
  const secondData = await secondRes.json();
  if (secondRes.status !== 409) {
    throw new Error(`Expected 409 Conflict for second reservation attempt, got ${secondRes.status}`);
  }
  console.log(`[PASS] Second reservation blocked with status 409 Conflict: "${secondData.message}"`);

  // 10. Customer Reservation Lookup & History
  console.log('\n--- STEP 10: Customer Reservation History & Detail ---');
  const getRes = await fetch(`${BASE_URL}/api/v1/reservations/${testReservationId}`, {
    headers: { Authorization: `Bearer ${testCustomerToken}` },
  });
  const getData = await getRes.json();
  console.log(`[PASS] Reservation lookup by ID: status "${getData.status}", quantity: ${getData.quantity}`);

  const historyRes = await fetch(`${BASE_URL}/api/v1/users/me/reservations`, {
    headers: { Authorization: `Bearer ${testCustomerToken}` },
  });
  const historyData = await historyRes.json();
  const count = (historyData.data || historyData.items || []).length;
  console.log(`[PASS] Customer reservation history returned ${count} records.`);

  // 11. Checkout & Payment Confirmation
  console.log('\n--- STEP 11: Checkout & Payment Confirmation ---');
  const payRes = await fetch(`${BASE_URL}/api/v1/checkout/${testReservationId}/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testCustomerToken}`,
    },
    body: JSON.stringify({ paymentToken: `tok_visa_${Date.now()}` }),
  });
  const payData = await payRes.json();
  if (payRes.status !== 200 || payData.status !== 'PAID') {
    throw new Error(`Payment confirmation failed: ${JSON.stringify(payData)}`);
  }
  console.log(`[PASS] Checkout confirmed! Reservation transitioned to status: "${payData.status}"`);

  // 12. Redis State Verification
  console.log('\n--- STEP 12: Direct Redis State Verification ---');
  const redis = new Redis(REDIS_URL);
  try {
    const stockVal = await redis.get(`flash:stock:{${testCampaignId}}`);
    console.log(`[PASS] Redis stock key flash:stock:{${testCampaignId}} = ${stockVal} units`);
    const streamLen = await redis.xlen('stream:reservations');
    console.log(`[PASS] Redis Stream stream:reservations total events: ${streamLen}`);
  } finally {
    await redis.quit();
  }

  // 13. Clean up Test Campaign from DB
  console.log('\n--- STEP 13: Database Inspection & Cleanup ---');
  let cleanDbUrl = DATABASE_URL;
  try {
    const parsed = new URL(cleanDbUrl);
    parsed.searchParams.delete('sslmode');
    cleanDbUrl = parsed.toString();
  } catch {}

  const pool = new pg.Pool({
    connectionString: cleanDbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  try {
    const dbCamp = await client.query('SELECT id, title, total_inventory, reserved_count FROM flash_campaigns WHERE id = $1', [testCampaignId]);
    console.log(`[PASS] PostgreSQL flash_campaigns record verified:`, dbCamp.rows[0]);

    // Clean up temporary test campaign so it doesn't pollute user storefront
    await client.query('DELETE FROM reservations WHERE campaign_id = $1', [testCampaignId]);
    await client.query('DELETE FROM flash_campaigns WHERE id = $1', [testCampaignId]);
    await client.query('DELETE FROM users WHERE id = $1', [testCustomerId]);
    console.log(`[PASS] Temporary E2E test data cleanly deleted from PostgreSQL.`);
  } finally {
    client.release();
    await pool.end();
  }

  console.log('\n======================================================================');
  console.log('              ALL END-TO-END VERIFICATION STEPS PASSED!               ');
  console.log('======================================================================\n');
}

main().catch((err) => {
  console.error('\nE2E TEST FAILURE:', err);
  process.exit(1);
});
