import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

/** Served path → vendored notice. The texts come from vendor/, so a re-vendor updates them. */
export const LICENSE_FILES: Record<string, string> = {
  'licenses/tda-wasm/LICENSE.txt': 'vendor/tda-wasm/LICENSE',
  'licenses/tda-wasm/THIRD_PARTY_LICENSES.txt': 'vendor/tda-wasm/THIRD_PARTY_LICENSES.md',
  'licenses/geogram/LICENSE.txt': 'vendor/tda-wasm/third_party/geogram_delaunay/LICENSE',
  'licenses/tda-viz-react/LICENSE.txt': 'vendor/tda-viz-react/LICENSE',
};

function licenseNotices(): Plugin {
  return {
    name: 'webmcp-tda:license-notices',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const source = LICENSE_FILES[(request.url ?? '').split('?')[0]!.replace(/^\//, '')];
        if (!source) return next();
        response.setHeader('Content-Type', 'text/plain; charset=utf-8');
        response.end(readFileSync(source));
      });
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(LICENSE_FILES)) {
        this.emitFile({ type: 'asset', fileName, source: readFileSync(source) });
      }
    },
  };
}

export default defineConfig({
  plugins: [licenseNotices()],
  resolve: {
    dedupe: ['react', 'react-dom', 'playcanvas'],
  },
  server: {
    host: '127.0.0.1',
    port: 5180,
    strictPort: true,
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@topolab/tda-wasm'],
  },
  build: {
    sourcemap: true,
  },
});
