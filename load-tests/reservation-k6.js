import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// Custom metric trends for FlashReserve
const reservationLatency = new Trend('reservation_duration_ms', true);
const successCounter = new Counter('reservations_success');
const soldOutCounter = new Counter('reservations_sold_out');
const alreadyReservedCounter = new Counter('reservations_already_reserved');

export const options = {
  scenarios: {
    flash_sale_surge: {
      executor: 'ramping-arrival-rate',
      startRate: 500,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 1000,
      stages: [
        { target: 2000, duration: '10s' }, // Warm-up
        { target: 5000, duration: '20s' }, // High traffic surge
        { target: 10000, duration: '30s' }, // Peak benchmark rate
        { target: 0, duration: '10s' }, // Scale down
      ],
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<10'], // SLA: P95 under 10ms for client edge, <2.5ms hot path
    'http_req_failed': ['rate<0.01'], // Less than 1% unexpected infrastructure errors
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const CAMPAIGN_ID = __ENV.CAMPAIGN_ID || 'camp_seed_flash_sale';

export default function () {
  // Distinct virtual user ID and idempotency key per iteration
  const userId = `k6_usr_${__VU}_${__ITER}`;
  const idempotencyKey = `k6_idem_${__VU}_${__ITER}`;

  const url = `${BASE_URL}/api/v1/sales/${CAMPAIGN_ID}/reserve`;
  const payload = JSON.stringify({ quantity: 1 });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer dev-user-${userId}`,
      'Idempotency-Key': idempotencyKey,
    },
  };

  const start = Date.now();
  const res = http.post(url, payload, params);
  reservationLatency.add(Date.now() - start);

  if (res.status === 201) {
    successCounter.add(1);
    check(res, {
      'status is 201 (RESERVED)': (r) => r.status === 201,
      'has reservationId': (r) => r.json('reservationId') !== undefined,
    });
  } else if (res.status === 409) {
    const errorMsg = res.json('message') || '';
    if (errorMsg.includes('sold out')) {
      soldOutCounter.add(1);
    } else {
      alreadyReservedCounter.add(1);
    }
  } else {
    check(res, {
      'unexpected status': (r) => [201, 409].includes(r.status),
    });
  }
}
