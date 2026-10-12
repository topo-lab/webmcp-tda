// Copies a built @topolab/tda-wasm 0.3 checkout into vendor/tda-wasm, the engine the compute worker imports.
//
//   npm run vendor:tda-wasm -- <path to a built tda-wasm checkout>
//
// There is no default source: the shared sibling checkout may hold an older build, and the vendored copy changes
// only when someone runs this on purpose. The script follows topolab-site's scripts/copy-wasm.mjs. It refuses a
// source that is not a clean git checkout of @topolab/tda-wasm 0.3.x built in release mode, stages the package root
// (the ES modules index.js imports, their types, tda.mjs and tda.wasm, and the licence notices; the .js and .d.ts
// files without their sourceMappingURL line, since the maps and src/ stay behind), refuses any staged file that
// contains a local path, loads the staged module and checks that its version() is the manifest's 0.3.x and that it
// computes a known diagram, writes ENGINE.json (version, commit, build_info.json, each file's size and SHA-256), and
// only then replaces vendor/tda-wasm.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findLocalPath } from './local-paths.mjs';

const SUPPORTED = /^0\.3\.\d+$/;
const NOTICES = ['LICENSE', 'THIRD_PARTY_LICENSES.md', 'third_party/geogram_delaunay/LICENSE'];
/** Relative module specifiers in `from '…'`, `import '…'` and `import('…')`. */
const RELATIVE_IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
/** The `//# sourceMappingURL=…` line tsc ends each module and declaration file with. */
const SOURCE_MAP_COMMENT = /\n?\/\/# sourceMappingURL=\S+\s*$/;

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = join(app, 'vendor', 'tda-wasm');

class Refusal extends Error {}

let replaced = false;

function refuse(message) {
  throw new Refusal(message);
}

function readJson(path, what) {
  if (!existsSync(path)) refuse(`${what} is missing: ${path}`);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    refuse(`${what} is not valid JSON: ${path}`);
  }
}

/** Every file the package root reaches from its entries, as paths relative to the package. */
function packageFiles(source, entries) {
  const seen = new Set();
  const queue = [...entries];
  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    if (!existsSync(join(source, file))) refuse(`${file} is missing from the build; run npm run build in the checkout`);
    seen.add(file);
    // The Emscripten glue imports nothing relative; scanning its minified text would only invite false matches.
    if (!/\.(js|d\.ts)$/.test(file)) continue;
    for (const [, specifier] of readFileSync(join(source, file), 'utf8').matchAll(RELATIVE_IMPORT)) {
      let target = posix.normalize(posix.join(posix.dirname(file), specifier));
      if (file.endsWith('.d.ts')) target = target.replace(/\.js$/, '.d.ts');
      queue.push(target);
    }
  }
  return [...seen].sort();
}

function fileRecord(path) {
  const bytes = readFileSync(path);
  return { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}

async function main() {
  const given = process.argv[2];
  if (!given) refuse('no source given. Usage: npm run vendor:tda-wasm -- <built tda-wasm checkout>');
  const source = resolve(given);
  if (!existsSync(source) || !statSync(source).isDirectory()) refuse(`${source} is not a directory`);

  const manifest = readJson(join(source, 'package.json'), 'package.json');
  if (manifest.name !== '@topolab/tda-wasm') refuse(`${source} is ${manifest.name ?? 'an unnamed package'}, not @topolab/tda-wasm`);
  if (!SUPPORTED.test(manifest.version ?? '')) refuse(`package.json says ${manifest.version}; this app takes 0.3.x only`);
  const root = manifest.exports?.['.'];
  const wasm = manifest.exports?.['./tda.wasm'];
  if (!root?.import || !root?.types || typeof wasm !== 'string') refuse('package.json does not export . and ./tda.wasm as 0.3 does');
  const buildInfo = readJson(join(source, 'dist', 'build_info.json'), 'dist/build_info.json');
  if (buildInfo.build_mode !== 'release') refuse(`dist/build_info.json says build_mode ${buildInfo.build_mode}; vendor a release build`);

  let commit;
  try {
    commit = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    refuse(`${source} is not a git checkout; ENGINE.json must name the engine commit`);
  }
  const dirty = execFileSync('git', ['-C', source, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
  if (dirty) refuse(`${source} has uncommitted changes to tracked files, so no commit describes this build`);

  const strip = (path) => path.replace(/^\.\//, '');
  const files = packageFiles(source, [strip(root.import), strip(root.types), strip(wasm), 'dist/tda.mjs']);
  for (const notice of NOTICES) if (!existsSync(join(source, notice))) refuse(`${notice} is missing from the checkout`);

  mkdirSync(dirname(destination), { recursive: true });
  const stage = mkdtempSync(join(dirname(destination), '.tda-wasm-stage-'));
  try {
    chmodSync(stage, 0o755);
    for (const file of [...files, ...NOTICES]) {
      mkdirSync(dirname(join(stage, file)), { recursive: true });
      if (/\.(js|d\.ts)$/.test(file)) {
        // The source maps point at ../src, which is not vendored: drop the comment rather than ship a dangling map.
        writeFileSync(join(stage, file), readFileSync(join(source, file), 'utf8').replace(SOURCE_MAP_COMMENT, '\n'));
      } else {
        cpSync(join(source, file), join(stage, file));
      }
      chmodSync(join(stage, file), 0o644);
      const leaked = findLocalPath(readFileSync(join(stage, file)));
      if (leaked) refuse(`${file} contains the local path ${leaked}; rebuild with the path remapping of scripts/build_ph.sh`);
    }
    // The package root only: ./mapper and ./ladder are not vendored, so their exports are left out.
    const vendored = {
      name: manifest.name,
      version: manifest.version,
      private: true,
      description: 'The root of @topolab/tda-wasm, vendored by scripts/vendor-tda-wasm.mjs; ENGINE.json names the build.',
      license: manifest.license,
      type: 'module',
      sideEffects: false,
      main: root.import,
      types: root.types,
      exports: { '.': root, './tda.wasm': wasm, './package.json': './package.json' },
    };
    writeFileSync(join(stage, 'package.json'), `${JSON.stringify(vendored, null, 2)}\n`);

    // Check the staged copy itself: the glue and the binary as they will be committed.
    const engine = await import(pathToFileURL(join(stage, strip(root.import))).href);
    if (typeof engine.load !== 'function' || typeof engine.version !== 'function') {
      refuse(`${root.import} does not export load() and version(), so it is not a 0.3 build`);
    }
    await engine.load(readFileSync(join(stage, strip(wasm))));
    const built = engine.version();
    if (built !== manifest.version || !SUPPORTED.test(built)) {
      refuse(`the module reports version() ${built}, package.json ${manifest.version}; this app takes 0.3.x only`);
    }
    const square = { coords: new Float64Array([0, 0, 1, 0, 1, 1, 0, 1]), d: 2 };
    const complex = engine.ripsComplex(square, { maxEdgeLength: 1, maxSimplexDim: 3 });
    const diagram = engine.persistence(complex, { coeff: 2 });
    const loop = Array.from(diagram.pairs[1] ?? []).join(',');
    if (complex.filtrations.length !== 8 || loop !== '1,Infinity') {
      refuse(`the staged module gives ${complex.filtrations.length} simplices and H1 [${loop}] for a unit square, not 8 and [1,Infinity]`);
    }

    const record = {
      package: manifest.name,
      version: built,
      repository: manifest.repository?.url ?? null,
      commit,
      build: buildInfo,
      files: Object.fromEntries([...files, ...NOTICES].sort().map((file) => [file, fileRecord(join(stage, file))])),
    };
    writeFileSync(join(stage, 'ENGINE.json'), `${JSON.stringify(record, null, 2)}\n`);

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
    const binary = record.files[strip(wasm)];
    console.log(`Vendored ${manifest.name} ${built} at ${commit.slice(0, 8)} (${files.length} files; tda.wasm ${binary.bytes} bytes).`);
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  console.error(`vendor-tda-wasm: ${error instanceof Refusal ? 'refused: ' : ''}${error instanceof Error ? error.message : error}`);
  if (!replaced) console.error('vendor/tda-wasm was left unchanged.');
  process.exitCode = 1;
}
