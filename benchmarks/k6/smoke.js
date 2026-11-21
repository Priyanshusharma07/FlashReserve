import { check, sleep } from 'k6';
import http from 'k6/http';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<50'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3000';

export default function () {
  const resLive = http.get(`${BASE_URL}/health/live`);
  check(resLive, {
    'liveness probe status 200': (r) => r.status === 200,
  });

  const resReady = http.get(`${BASE_URL}/health/ready`);
  check(resReady, {
    'readiness probe status 200': (r) => r.status === 200,
  });

  const resCampaigns = http.get(`${BASE_URL}/api/v1/campaigns?limit=5`);
  check(resCampaigns, {
    'campaigns catalog status 200': (r) => r.status === 200,
  });

  sleep(1);
}
