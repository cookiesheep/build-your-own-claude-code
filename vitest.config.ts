import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tasks/**/tests/**/*.test.ts', 'src/**/*.test.ts'],
    testTimeout: 10000,
    // Each task's tests can be run independently
    // e.g.: npx vitest run tasks/task-01-messages/tests/
  },
});
