/**
 * Viral inbox scenario: 10,000 concurrent senders to the same slug
 * Run: k6 run tests/load/scenarios/viral-inbox.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { randomBytes } from 'k6/crypto';

const API_URL = __ENV.API_URL || 'http://localhost:3001';

// Pre-register a target inbox (set TARGET_SLUG env var)
const TARGET_SLUG = __ENV.TARGET_SLUG || 'loadtest';

const successRate = new Counter('successful_sends');
const failedRate = new Counter('failed_sends');
const sendLatency = new Trend('send_latency_ms');
const throttledRate = new Counter('throttled_sends');

export const options = {
  stages: [
    { duration: '10s', target: 100 },
    { duration: '30s', target: 1000 },
    { duration: '30s', target: 5000 },
    { duration: '20s', target: 10000 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<200'],
    http_req_failed: ['rate<0.01'],
    send_latency_ms: ['p(95)<100'],
  },
};

export default function () {
  const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const payload = JSON.stringify({
    slug: TARGET_SLUG,
    body: 'Load test message — sent anonymously',
    idempotencyKey,
    sendDelayMs: 2000,
    website: '',
  });

  const start = Date.now();
  const res = http.post(`${API_URL}/api/messages`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: '5s',
  });
  sendLatency.add(Date.now() - start);

  const ok = check(res, {
    'status is 202': (r) => r.status === 202,
    'no server error': (r) => r.status < 500,
  });

  if (res.status === 202) {
    successRate.add(1);
  } else if (res.status === 429) {
    throttledRate.add(1);
  } else {
    failedRate.add(1);
  }

  sleep(0.01);
}
