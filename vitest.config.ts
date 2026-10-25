import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Load the vendored engine and its wasm-bindgen glue as native ES modules,
    // so `import.meta.url` resolves tda.wasm next to them.
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
