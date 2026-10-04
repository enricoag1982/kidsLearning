import { defineConfig } from 'vitest/config';

// Pure transforms plus a scaffold run in a temp directory: node only.
export default defineConfig({
  test: { environment: 'node', include: ['*.test.ts'] },
});
