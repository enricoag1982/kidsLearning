import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// `pnpm test` (default `vitest run`): fast tests only. `*.slow.test.ts` (generator runs over 1 000 seeds, timing budgets) is excluded
// here and run by `pnpm test:slow` (`vitest.slow.config.ts`) instead.
// Two projects: `node` (core, kinds, content) and `web` (jsdom: `*.test.tsx` and `src/web`).
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['**/node_modules/**', 'src/**/*.slow.test.ts', 'src/web/**'],
          // Puzzle generators draw 200 seeds per parameter set (under 1 s alone); `pnpm -r test` runs every package at once, so the
          // timeout only catches a hang (same guard as subject-math's templates).
          testTimeout: 20_000,
        },
      },
      {
        // `__APP_VERSION__` (each app's `vite.config.ts` `define`): the services stamp it.
        define: { __APP_VERSION__: JSON.stringify('0.0.0-test') },
        plugins: [react()],
        test: {
          name: 'web',
          environment: 'jsdom',
          setupFiles: ['./vitest.web.setup.ts'],
          include: ['src/**/*.test.tsx', 'src/web/**/*.test.ts'],
          exclude: ['**/node_modules/**'],
          testTimeout: 15_000,
        },
      },
    ],
  },
});
