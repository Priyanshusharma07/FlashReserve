import { check } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

// Official Benchmark Targets: 1,000,000 Requests in 50 Seconds (20,000 RPS)
export const totalReservations = new Counter('benchmark_reservations_total');
export const allocationSuccess = new Counter('benchmark_allocation_success');
export const soldOutResponses = new Counter('benchmark_sold_out');
export const benchmarkErrors = new Rate('benchmark_error_rate');
export const benchmarkLatency = new Trend('benchmark_latency_p95');

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3000';
const CAMPAIGN_ID = __ENV.CAMPAIGN_ID || 'camp_seed_flash_sale';

export const options = {
  scenarios: {
    one_million_drop: {
      executor: 'constant-arrival-rate',
      rate: 20000, // 20,000 requests per second
      timeUnit: '1s',
      duration: '50s', // 50 seconds = 1,000,000 total requests
      preAllocatedVUs: 2000,
      maxVUs: 10000,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'], // Max 5% drop rate under extreme load
    http_req_duration: ['p(95)<150'], // Target P95 under 150ms
  },
};

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function () {
  const userId = `drop-user-${__VU}-${__ITER}`;
  const idempotencyKey = `idem-${generateUUID()}`;

  const payload = JSON.stringify({ quantity: 1 });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      Authorization: `Bearer dev-user-${userId}`,
    },
    timeout: '5s',
  };

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/v1/sales/${CAMPAIGN_ID}/reserve`, payload, params);
  benchmarkLatency.add(Date.now() - startTime);
  totalReservations.add(1);

  if (res.status === 201) {
    allocationSuccess.add(1);
    benchmarkErrors.add(0);
  } else if (res.status === 409) {
    soldOutResponses.add(1);
    benchmarkErrors.add(0);
  } else {
    benchmarkErrors.add(1);
  }
}

