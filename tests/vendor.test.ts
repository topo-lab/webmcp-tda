import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findLocalPath } from '../scripts/local-paths.mjs';
import { LICENSE_FILES } from '../vite.config';

const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

function* walk(directory: string): Generator<string> {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

describe('vendored engine and library', () => {
  it('ships the @topolab/tda-wasm 0.3 build ENGINE.json names, file for file', () => {
    const record = JSON.parse(readFileSync('vendor/tda-wasm/ENGINE.json', 'utf8'));
    expect(record).toMatchObject({ package: '@topolab/tda-wasm', repository: 'https://github.com/topo-lab/tda-wasm', build: { build_mode: 'release' } });
    expect(record.version).toMatch(/^0\.3\.\d+$/);
    expect(record.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(JSON.parse(readFileSync('vendor/tda-wasm/package.json', 'utf8'))).toMatchObject({ name: '@topolab/tda-wasm', version: record.version });
    for (const notice of ['LICENSE', 'THIRD_PARTY_LICENSES.md', 'third_party/geogram_delaunay/LICENSE']) expect(record.files).toHaveProperty([notice]);
    for (const [file, { bytes, sha256: digest }] of Object.entries(record.files as Record<string, { bytes: number; sha256: string }>)) {
      expect(readFileSync(join('vendor/tda-wasm', file)).length, file).toBe(bytes);
      expect(sha256(join('vendor/tda-wasm', file)), file).toBe(digest);
    }
  });

  it('ships the tda-viz-react tarball BUILD.json names, built against @topolab/tda-wasm 0.3', () => {
    const record = JSON.parse(readFileSync('vendor/tda-viz-react/BUILD.json', 'utf8'));
    expect(record.peerDependencies['@topolab/tda-wasm']).toMatch(/^\^0\.3\./);
    expect(record.commit).toMatch(/^[0-9a-f]{40}$/);
    const tarball = join('vendor/tda-viz-react', record.tarball.file);
    expect(sha256(tarball)).toBe(record.tarball.sha256);
    expect(JSON.parse(readFileSync('package.json', 'utf8')).dependencies['tda-viz-react']).toBe(`file:${tarball}`);
    expect(existsSync('vendor/tda-viz-react/LICENSE')).toBe(true);
  });

  it('contains no path of the machine that built it', () => {
    for (const file of walk('vendor')) {
      // The tarball is compressed; scripts/vendor-tda-viz-react.mjs scans its unpacked files before vendoring it.
      if (file.endsWith('.tgz')) continue;
      expect(findLocalPath(readFileSync(file)), file).toBeNull();
    }
    expect(findLocalPath(Buffer.from('at /Users/someone/src/x.cpp'))).toBe('/Users/someone');
    expect(findLocalPath(Buffer.from('/home/web_user and /tmp are Emscripten paths'))).toBeNull();
  });

  it('serves every licence notice the footer links to', () => {
    for (const source of Object.values(LICENSE_FILES)) expect(existsSync(source), source).toBe(true);
  });
});
