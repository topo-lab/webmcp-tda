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
            const { readFile } = await import('node:fs/promises');
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
