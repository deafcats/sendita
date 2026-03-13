/**
 * Inbox dashboard read scenario: 500 concurrent authenticated inbox owners
 * Run: k6 run tests/load/scenarios/inbox-dashboard-read.js
 * Requires: TEST_TOKENS env var (comma-separated JWT tokens for registered users)
 */
import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const API_URL = __ENV.API_URL || 'http://localhost:3001';
const tokens = (__ENV.TEST_TOKENS || '').split(',').filter(Boolean);

const dashboardLatency = new Trend('dashboard_latency_ms');

export const options = {
  stages: [
    { duration: '10s', target: 100 },
    { duration: '30s', target: 500 },
    { duration: '30s', target: 500 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<400'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  if (tokens.length === 0) {
    console.warn('No TEST_TOKENS provided — skipping authenticated test');
    return;
  }

  const token = tokens[Math.floor(Math.random() * tokens.length)];
  const start = Date.now();

  const res = http.get(`${API_URL}/api/messages/inbox`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: '5s',
  });

  dashboardLatency.add(Date.now() - start);

  check(res, {
    'status 200': (r) => r.status === 200,
    'has items array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.items);
      } catch { return false; }
    },
  });
}
