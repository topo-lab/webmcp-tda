import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/webmcp/register.ts',
        'src/webmcp/tools.ts',
      ],
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage/webmcp',
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
});
