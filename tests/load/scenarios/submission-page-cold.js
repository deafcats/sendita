/**
 * Submission page cold load: 1000 concurrent first-load requests for different slugs
 * Tests Redis cache miss performance and Edge function cold start
 */
import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const WEB_URL = __ENV.WEB_URL || 'http://localhost:3000';
const API_URL = __ENV.API_URL || 'http://localhost:3001';

const ttfb = new Trend('ttfb_ms');

export const options = {
  stages: [
    { duration: '5s', target: 100 },
    { duration: '20s', target: 1000 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<400'],
    ttfb_ms: ['p(95)<200'],
  },
};

// Generate random slug suffixes to simulate cache misses
function randomSlug() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function () {
  const slug = randomSlug();
  const start = Date.now();

  // Test the API profile endpoint (used by submission page)
  const res = http.get(`${API_URL}/api/links/${slug}`, { timeout: '5s' });
  ttfb.add(Date.now() - start);

  // 404 is expected for random slugs — we're testing latency, not content
  check(res, {
    'no server error': (r) => r.status < 500,
    'fast response': (r) => r.timings.duration < 200,
  });
}
