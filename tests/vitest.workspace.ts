import { defineWorkspace } from 'vitest/config';
import { resolve } from 'path';

const dir = __dirname;

const aliases = {
  '@anon-inbox/shared': resolve(dir, '../packages/shared/src'),
  '@anon-inbox/db': resolve(dir, '../packages/db/src'),
  '@anon-inbox/queue': resolve(dir, '../packages/queue/src'),
};

export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      include: [`${dir}/unit/**/*.test.ts`],
      testTimeout: 30000,
    },
    resolve: { alias: aliases },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'integration',
      include: [
        `${dir}/integration/**/*.test.ts`,
        `${dir}/security/**/*.test.ts`,
        `${dir}/edge-cases/**/*.test.ts`,
        `${dir}/race-conditions/**/*.test.ts`,
      ],
      testTimeout: 60000,
      hookTimeout: 90000,
    },
    resolve: { alias: aliases },
  },
]);
