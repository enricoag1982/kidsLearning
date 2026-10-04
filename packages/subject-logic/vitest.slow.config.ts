import { defineConfig } from 'vitest/config';

// `pnpm test:slow` (CI `slow` job): only `*.slow.test.ts` (generator runs over 1 000 seeds per parameter set, with timing budgets).
// Files run one at a time so a timing budget never shares the CPU with another test.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.slow.test.ts'],
    exclude: ['**/node_modules/**'],
    fileParallelism: false,
    testTimeout: 120_000,
  },
});
