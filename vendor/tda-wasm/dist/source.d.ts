/**
 * Turning a `load()` source into a compiled `WebAssembly.Module`, for the
 * package root and for `./ladder` (internal).
 *
 * Nothing here writes to `globalThis`. In Node the default source is read
 * with `fs`, and bytes or a compiled module are compiled or used without
 * touching `Request`, `Response` or `fetch` (Node defines those lazily; the
 * first read of one installs undici's global dispatcher on `globalThis`).
 */
/**
 * Where `load` reads a module from: a URL or request, a fetch `Response` (or
 * a promise of one), the bytes, or a compiled `WebAssembly.Module`.
 */
export type LoadSource = RequestInfo | URL | Response | BufferSource | WebAssembly.Module | Promise<RequestInfo | URL | Response | BufferSource | WebAssembly.Module>;
/**
 * The compiled module from `source`; without one, from `fallback()` (the
 * binary next to the package's code: read from the file in Node, fetched in
 * a browser).
 */
export declare function compileSource(source: LoadSource | undefined, fallback: () => URL): Promise<WebAssembly.Module>;
