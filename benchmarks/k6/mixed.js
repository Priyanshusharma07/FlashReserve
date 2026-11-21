import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';

// Lifecycle Funnel Metrics
export const funnelDiscovery = new Counter('funnel_discovery_total');
export const funnelReservationAttempt = new Counter('funnel_reservation_attempt_total');
export const funnelReservationSuccess = new Counter('funnel_reservation_success_total');
export const funnelReservationSoldOut = new Counter('funnel_reservation_sold_out_total');
export const funnelCheckoutSuccess = new Counter('funnel_checkout_success_total');
export const funnelJourneyFailure = new Rate('funnel_journey_error_rate');

export const reserveLatency = new Trend('funnel_reserve_latency_ms');
export const checkoutLatency = new Trend('funnel_checkout_latency_ms');

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3000';
const CAMPAIGN_ID = __ENV.CAMPAIGN_ID || 'camp_seed_flash_sale';
const TARGET_RPS = parseInt(__ENV.TARGET_RPS || '500', 10);
const DURATION = __ENV.DURATION || '3m';

export const options = {
  scenarios: {
    customer_journey: {
      executor: 'constant-arrival-rate',
      rate: TARGET_RPS,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: Math.min(TARGET_RPS, 300),
      maxVUs: TARGET_RPS * 2,
    },
  },
  thresholds: {
    funnel_journey_error_rate: ['rate<0.02'],
    http_req_duration: ['p(95)<100', 'p(99)<250'],
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
  const userId = `buyer-${__VU}-${__ITER}`;
  const idempotencyKey = `idem-journey-${generateUUID()}`;
  const authHeader = `Bearer dev-user-${userId}`;

  // Step 1: Browse discovery catalog
  const catalogRes = http.get(`${BASE_URL}/api/v1/campaigns?limit=5`);
  funnelDiscovery.add(1);
  if (catalogRes.status !== 200) {
    funnelJourneyFailure.add(1);
    return;
  }

  // Step 2: Fetch target campaign detail with live Redis inventory
  const detailRes = http.get(`${BASE_URL}/api/v1/campaigns/${CAMPAIGN_ID}`);
  if (detailRes.status !== 200) {
    funnelJourneyFailure.add(1);
    return;
  }

  // Step 3: Attempt atomic reservation
  funnelReservationAttempt.add(1);
  const reservePayload = JSON.stringify({ quantity: 1 });
  const reserveParams = {
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      Authorization: authHeader,
    },
  };

  const reserveStart = Date.now();
  const reserveRes = http.post(
    `${BASE_URL}/api/v1/sales/${CAMPAIGN_ID}/reserve`,
    reservePayload,
    reserveParams,
  );
  reserveLatency.add(Date.now() - reserveStart);

  if (reserveRes.status === 409) {
    // Inventory depleted - expected normal condition
    funnelReservationSoldOut.add(1);
    funnelJourneyFailure.add(0);
    return;
  }

  if (reserveRes.status !== 201) {
    // Unexpected error on reservation attempt
    funnelJourneyFailure.add(1);
    return;
  }

  funnelReservationSuccess.add(1);

  let reservationId;
  try {
    const data = JSON.parse(reserveRes.body);
    reservationId = data.reservationId || (data.data && data.data.id);
  } catch {
    funnelJourneyFailure.add(1);
    return;
  }

  if (!reservationId) {
    funnelJourneyFailure.add(1);
    return;
  }

  // Step 4: Verify reservation detail
  const checkRes = http.get(`${BASE_URL}/api/v1/reservations/${reservationId}`, {
    headers: { Authorization: authHeader },
  });
  if (checkRes.status !== 200) {
    funnelJourneyFailure.add(1);
    return;
  }

  // Brief pause simulating checkout form entry
  sleep(0.05);

  // Step 5: Complete Checkout payment
  const payPayload = JSON.stringify({
    paymentToken: `tok_test_${generateUUID()}`,
  });
  const payParams = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
  };

  const payStart = Date.now();
  const payRes = http.post(
    `${BASE_URL}/api/v1/checkout/${reservationId}/pay`,
    payPayload,
    payParams,
  );
  checkoutLatency.add(Date.now() - payStart);

  const checkoutOk = check(payRes, {
    'checkout paid successfully': (r) => r.status === 200,
  });

  if (checkoutOk) {
    funnelCheckoutSuccess.add(1);
    funnelJourneyFailure.add(0);
  } else {
    funnelJourneyFailure.add(1);
  }
}
