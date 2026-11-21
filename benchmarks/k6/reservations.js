import { check } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics for accurate portfolio reporting
export const successfulReservations = new Counter('flash_successful_reservations');
export const soldOutResponses = new Counter('flash_sold_out_responses');
export const reservationErrors = new Rate('flash_reservation_error_rate');
export const reservationLatency = new Trend('flash_reservation_latency_ms');

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3000';
const CAMPAIGN_ID = __ENV.CAMPAIGN_ID || 'camp_seed_flash_sale';
const TARGET_RPS = parseInt(__ENV.TARGET_RPS || '1000', 10);
const DURATION = __ENV.DURATION || '2m';

export const options = {
  scenarios: {
    reservation_hot_path: {
      executor: 'constant-arrival-rate',
      rate: TARGET_RPS,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: Math.min(TARGET_RPS, 500),
      maxVUs: TARGET_RPS * 2,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'], // <2% network/5xx failures
    http_req_duration: ['p(95)<50', 'p(99)<100'], // P95 under 50ms, P99 under 100ms
  },
};

// Generates a random UUID v4 for the Idempotency-Key
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function () {
  // Use unique user identity per VU and iteration
  const userId = `bench-user-${__VU}-${__ITER}`;
  const idempotencyKey = `bench-idem-${generateUUID()}`;

  const payload = JSON.stringify({
    quantity: 1,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      Authorization: `Bearer dev-user-${userId}`,
    },
  };

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/v1/sales/${CAMPAIGN_ID}/reserve`, payload, params);
  const latency = Date.now() - startTime;
  reservationLatency.add(latency);

  if (res.status === 201) {
    successfulReservations.add(1);
    reservationErrors.add(0);
    check(res, {
      'reservation status is 201': (r) => r.status === 201,
      'has reservation ID': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && body.data.id;
        } catch {
          return false;
        }
      },
    });
  } else if (res.status === 409) {
    // 409 Conflict = Inventory Sold Out (Valid business outcome, not an infrastructure failure)
    soldOutResponses.add(1);
    reservationErrors.add(0);
  } else {
    // Unexpected 5xx or 4xx error
    reservationErrors.add(1);
    check(res, {
      'unexpected error': (r) => r.status < 500,
    });
  }
}
