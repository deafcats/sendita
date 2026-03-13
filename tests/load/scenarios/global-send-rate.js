/**
 * Global send rate scenario: sustained 1000 messages/second across many inboxes
 * Run: k6 run tests/load/scenarios/global-send-rate.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Counter } from 'k6/metrics';

const API_URL = __ENV.API_URL || 'http://localhost:3001';

// Load target slugs from env (comma-separated) or use generated ones
const TARGET_SLUGS = (__ENV.TARGET_SLUGS || 'inbox001,inbox002,inbox003').split(',');

const p95Latency = new Trend('p95_latency');
const errors = new Counter('errors');

export const options = {
  scenarios: {
    sustained_load: {
      executor: 'constant-arrival-rate',
      rate: 1000,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 200,
      maxVUs: 500,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const slug = TARGET_SLUGS[Math.floor(Math.random() * TARGET_SLUGS.length)];
  const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const start = Date.now();
  const res = http.post(
    `${API_URL}/api/messages`,
    JSON.stringify({
      slug,
      body: 'Sustained load test message',
      idempotencyKey,
      sendDelayMs: 2000,
      website: '',
    }),
    { headers: { 'Content-Type': 'application/json' }, timeout: '3s' },
  );
  p95Latency.add(Date.now() - start);

  check(res, {
    'accepted or rate-limited': (r) => r.status === 202 || r.status === 429,
    'no server error': (r) => r.status < 500,
  });

  if (res.status >= 500) errors.add(1);
}
