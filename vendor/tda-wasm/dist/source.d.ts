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
 * Where `load` reads a module from: a URL (or its string) or request, a fetch
 * `Response` (or a promise of one), the bytes (`ArrayBuffer` or a view), or a
 * compiled `WebAssembly.Module`. Written without DOM-only names so that a Node
 * project compiles without the DOM lib: the compiled module is typed
 * `WebAssembly.Module` where the environment's types declare it, otherwise
 * any object.
 */
export type LoadSource = string | Request | URL | Response | ArrayBuffer | ArrayBufferView | (typeof globalThis extends {
    WebAssembly: {
        Module: abstract new (...args: never[]) => infer M;
    };
} ? M & object : object) | Promise<string | Request | URL | Response | ArrayBuffer | ArrayBufferView | (typeof globalThis extends {
    WebAssembly: {
        Module: abstract new (...args: never[]) => infer M;
    };
} ? M & object : object)>;
/**
 * The compiled module from `source`; without one, from `fallback()` (the
 * binary next to the package's code: read from the file in Node, fetched in
 * a browser).
 */
export declare function compileSource(source: LoadSource | undefined, fallback: () => URL): Promise<Exclude<Awaited<LoadSource>, string | Request | URL | Response | ArrayBuffer | ArrayBufferView>>;
