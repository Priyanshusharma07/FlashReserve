import { check } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics for campaign discovery benchmark
export const readSuccesses = new Counter('flash_read_success');
export const readErrors = new Rate('flash_read_error_rate');
export const listLatency = new Trend('flash_read_list_latency_ms');
export const detailLatency = new Trend('flash_read_detail_latency_ms');

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3000';
const CAMPAIGN_ID = __ENV.CAMPAIGN_ID || 'camp_seed_flash_sale';
const TARGET_RPS = parseInt(__ENV.TARGET_RPS || '2000', 10);
const DURATION = __ENV.DURATION || '2m';

export const options = {
  scenarios: {
    discovery_read_traffic: {
      executor: 'constant-arrival-rate',
      rate: TARGET_RPS,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: Math.min(TARGET_RPS, 400),
      maxVUs: TARGET_RPS * 2,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // < 1% error rate
    'flash_read_list_latency_ms': ['p(95)<30', 'p(99)<60'], // Fast read SLA
    'flash_read_detail_latency_ms': ['p(95)<25', 'p(99)<50'],
  },
};

export default function () {
  // 60% list campaigns, 40% get specific campaign details
  const isList = Math.random() < 0.6;

  if (isList) {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/v1/campaigns?limit=10&page=1`, {
      headers: { Accept: 'application/json' },
    });
    listLatency.add(Date.now() - start);

    const ok = check(res, {
      'campaign list status is 200': (r) => r.status === 200,
      'has items array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.items);
        } catch {
          return false;
        }
      },
    });

    if (ok) {
      readSuccesses.add(1);
      readErrors.add(0);
    } else {
      readErrors.add(1);
    }
  } else {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/v1/campaigns/${CAMPAIGN_ID}`, {
      headers: { Accept: 'application/json' },
    });
    detailLatency.add(Date.now() - start);

    const ok = check(res, {
      'campaign detail status is 200': (r) => r.status === 200,
      'has campaign id': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id === CAMPAIGN_ID;
        } catch {
          return false;
        }
      },
    });

    if (ok) {
      readSuccesses.add(1);
      readErrors.add(0);
    } else {
      readErrors.add(1);
    }
  }
}
