import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.e2e.ts',
  timeout: 30000,
  fullyParallel: true,
  retries: 1,
  reporter: [['html'], ['line']],
  use: {
    baseURL: process.env['WEB_URL'] ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 15'] },
    },
  ],
});
