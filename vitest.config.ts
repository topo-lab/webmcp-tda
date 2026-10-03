import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Keep generated Emscripten glue in its native ESM scope. Vite's SSR
    // transform otherwise injects a CommonJS `module` into Geogram's hook.
    server: { deps: { external: [/\/vendor\/tda-wasm\//] } },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
      reporter: ['text', 'json', 'json-summary', 'html'],
      reportsDirectory: 'coverage/all',
      thresholds: {
        'src/webmcp/{register,tools,agentView}.ts': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
    },
  },
});
