import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['apps/worker-api/test/**/*.test.ts'],
  },
});
