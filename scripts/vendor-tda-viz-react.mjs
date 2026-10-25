// Packs a built tda-viz-react checkout into vendor/tda-viz-react, the library the point-cloud views import.
//
//   npm run vendor:tda-viz-react -- <path to a built tda-viz-react checkout>
//
// There is no default source. The script refuses a source that is not a clean git checkout of tda-viz-react, whose
// peer @topolab/tda-wasm range is not 0.3, or whose dist/ lacks the entries this app imports. It runs `npm pack`,
// refuses a tarball with a local path in any file, and only then replaces vendor/tda-viz-react with the tarball,
// the library's LICENSE and a BUILD.json naming the commit and the tarball's size, SHA-256 and npm integrity.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findLocalPath } from './local-paths.mjs';

const ENGINE_PEER = /^\^0\.3\.\d+$/;
const ENTRIES = ['dist/2d.js', 'dist/3d.js', 'dist/filtration.js', 'dist/2d.d.ts', 'dist/3d.d.ts', 'dist/filtration.d.ts'];

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = join(app, 'vendor', 'tda-viz-react');

class Refusal extends Error {}

let replaced = false;

function refuse(message) {
  throw new Refusal(message);
}

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

function main() {
  const given = process.argv[2];
  if (!given) refuse('no source given. Usage: npm run vendor:tda-viz-react -- <built tda-viz-react checkout>');
  const source = resolve(given);
  if (!existsSync(source) || !statSync(source).isDirectory()) refuse(`${source} is not a directory`);
  const manifestPath = join(source, 'package.json');
  if (!existsSync(manifestPath)) refuse(`package.json is missing: ${manifestPath}`);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.name !== 'tda-viz-react') refuse(`${source} is ${manifest.name ?? 'an unnamed package'}, not tda-viz-react`);
  const peer = manifest.peerDependencies?.['@topolab/tda-wasm'];
  if (!ENGINE_PEER.test(peer ?? '')) {
    refuse(`its peer @topolab/tda-wasm is ${peer ?? 'missing'}; this app takes a build against @topolab/tda-wasm 0.3 only`);
  }
  for (const entry of ENTRIES) if (!existsSync(join(source, entry))) refuse(`${entry} is missing; run npm run build in the checkout`);
  if (!existsSync(join(source, 'LICENSE'))) refuse('LICENSE is missing from the checkout');

  let commit;
  try {
    commit = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    refuse(`${source} is not a git checkout; BUILD.json must name the library commit`);
  }
  const dirty = execFileSync('git', ['-C', source, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
  if (dirty) refuse(`${source} has uncommitted changes to tracked files, so no commit describes this build`);

  mkdirSync(dirname(destination), { recursive: true });
  const stage = mkdtempSync(join(dirname(destination), '.tda-viz-react-stage-'));
  const unpacked = mkdtempSync(join(tmpdir(), 'tda-viz-react-unpacked-'));
  try {
    const [packed] = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', stage], {
      cwd: source,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }));
    const tarball = join(stage, packed.filename);
    execFileSync('tar', ['-xzf', tarball, '-C', unpacked]);
    for (const file of walk(unpacked)) {
      const leaked = findLocalPath(readFileSync(file));
      if (leaked) refuse(`${relative(join(unpacked, 'package'), file)} in the tarball contains the local path ${leaked}`);
    }
    copyFileSync(join(source, 'LICENSE'), join(stage, 'LICENSE'));
    const bytes = readFileSync(tarball);
    const record = {
      package: manifest.name,
      version: manifest.version,
      repository: manifest.repository?.url ?? null,
      commit,
      peerDependencies: manifest.peerDependencies,
      tarball: {
        file: packed.filename,
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        integrity: packed.integrity,
        entryCount: packed.entryCount,
      },
    };
    writeFileSync(join(stage, 'BUILD.json'), `${JSON.stringify(record, null, 2)}\n`);

    const backup = existsSync(destination) ? `${destination}.old-${process.pid}` : null;
    if (backup) renameSync(destination, backup);
    try {
      renameSync(stage, destination);
    } catch (error) {
      if (backup) renameSync(backup, destination);
      throw error;
    }
    replaced = true;
    if (backup) rmSync(backup, { recursive: true, force: true });
    console.log(`Vendored ${manifest.name} ${manifest.version} at ${commit.slice(0, 8)} (${packed.filename}, ${bytes.length} bytes).`);
  } finally {
    rmSync(stage, { recursive: true, force: true });
    rmSync(unpacked, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(`vendor-tda-viz-react: ${error instanceof Refusal ? 'refused: ' : ''}${error instanceof Error ? error.message : error}`);
  if (!replaced) console.error('vendor/tda-viz-react was left unchanged.');
  process.exitCode = 1;
}
