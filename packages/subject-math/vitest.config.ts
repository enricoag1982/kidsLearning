import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Two projects: `node` (core, kinds, content) and `web` (jsdom: `*.test.tsx` and `src/web`).
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['**/node_modules/**', 'src/web/**'],
          // Template tests draw 1 000 seeds per param set (under 1 s alone); `pnpm -r test` runs every package at once, so on a
          // CI runner one passed 5 s (pv-which, 2026-10-04). Same guard as chess's content solvers: the timeout only catches a hang.
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
