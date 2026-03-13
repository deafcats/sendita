import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 90000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
      },
    },
  },
  resolve: {
    alias: {
      '@anon-inbox/shared': resolve(__dirname, '../packages/shared/src'),
      '@anon-inbox/db': resolve(__dirname, '../packages/db/src'),
      '@anon-inbox/queue': resolve(__dirname, '../packages/queue/src'),
    },
  },
});
