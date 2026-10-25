/**
 * Turning a `load()` source into a compiled `WebAssembly.Module`, for the
 * package root and for `./ladder` (internal).
 *
 * Nothing here writes to `globalThis`. In Node the default source is read
 * with `fs`, and bytes or a compiled module are compiled or used without
 * touching `Request`, `Response` or `fetch` (Node defines those lazily; the
 * first read of one installs undici's global dispatcher on `globalThis`).
 */
const isNode = typeof process !== 'undefined' && typeof process.versions?.node === 'string';
/**
 * Node's `fs/promises`, reached so that no bundler sees a dependency on it:
 * a literal `import('node:fs/promises')` stops esbuild ("Could not resolve"),
 * fails webpack 5 (UnhandledSchemeError) and makes Vite warn that the module
 * was externalized, in every browser bundle of the package, although this
 * branch only runs in Node. `process.getBuiltinModule` (Node 22.3 and later)
 * needs no import; the fallback (Node 22.0 to 22.2) builds the specifier at
 * run time, which bundlers leave alone.
 */
async function nodeFs() {
    const get = process.getBuiltinModule;
    if (typeof get === 'function')
        return get.call(process, 'node:fs/promises');
    return import(/* @vite-ignore */ /* webpackIgnore: true */ ['node', 'fs/promises'].join(':'));
}
/**
 * The compiled module from `source`; without one, from `fallback()` (the
 * binary next to the package's code: read from the file in Node, fetched in
 * a browser).
 */
export async function compileSource(source, fallback) {
    let s = await source;
    if (s === undefined)
        s = fallback();
    if (s instanceof WebAssembly.Module)
        return s;
    if (s instanceof ArrayBuffer || ArrayBuffer.isView(s))
        return WebAssembly.compile(s);
    if (isNode && (s instanceof URL || (typeof s === 'string' && s.startsWith('file:')))) {
        const url = s instanceof URL ? s : new URL(s);
        if (url.protocol === 'file:') {
            const { readFile } = await nodeFs();
            return WebAssembly.compile((await readFile(url)));
        }
    }
    if (typeof s === 'string' || s instanceof URL || (typeof Request !== 'undefined' && s instanceof Request)) {
        s = await fetch(s);
    }
    if (typeof Response !== 'undefined' && s instanceof Response) {
        if (!s.ok)
            throw new Error(`fetching the WebAssembly module failed: ${s.status} ${s.statusText} (${s.url})`);
        if (typeof WebAssembly.compileStreaming === 'function' && s.headers.get('Content-Type') === 'application/wasm') {
            return WebAssembly.compileStreaming(s);
        }
        return WebAssembly.compile(await s.arrayBuffer());
    }
    throw new TypeError('source must be a URL, a Request, a Response, the bytes or a WebAssembly.Module');
}
