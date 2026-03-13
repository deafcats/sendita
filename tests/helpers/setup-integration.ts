import { beforeAll, afterAll } from 'vitest';

// Integration test setup: expects real PostgreSQL and Redis
// Use docker-compose or Testcontainers in CI
beforeAll(async () => {
  if (!process.env['DATABASE_URL']) {
    throw new Error('DATABASE_URL must be set for integration tests');
  }
  if (!process.env['REDIS_URL']) {
    throw new Error('REDIS_URL must be set for integration tests');
  }
});

afterAll(async () => {
  // Cleanup handled per-test
});
