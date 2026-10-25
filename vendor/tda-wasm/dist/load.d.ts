import type { LoadSource } from './source.js';
export type { LoadSource };
/** The module's exports (rust/tda-wasm): called through {@link call}. */
type Engine = any;
/**
 * Owners of experimental native handles; ordinary calls retain no state. A
 * cleanup gets `trapped = true` when the instance trapped: it must then
 * drop its handle without calling into the instance.
 */
type Cleanup = (trapped: boolean) => void;
/** @internal Register a native owner's cleanup, returning its unregister function. */
export declare function onUnload(cleanup: Cleanup): () => void;
/**
 * Load the module. Without `source` it is read from `tda.wasm` next to the
 * package's code (`@topolab/tda-wasm/tda.wasm`): from the file in Node, by
 * `fetch` in a browser, where bundlers that understand
 * `new URL(…, import.meta.url)` resolve it. Nothing is written to
 * `globalThis`.
 *
 * Calling `load` again while a load is in progress or done returns the same
 * promise and ignores `source`; a failed load is not kept, so a later call
 * can retry with a corrected source.
 */
export declare function load(source?: LoadSource): Promise<void>;
/**
 * Drop the module, so that its memory (which wasm never shrinks) can be
 * reclaimed once nothing else refers to it. Results already returned are
 * copies and stay valid. Functions that need the module throw until
 * {@link load} is called again; a load in progress rejects.
 */
export declare function unload(): void;
/** Whether the module is loaded (a {@link load} has resolved and no {@link unload} followed). */
export declare function isLoaded(): boolean;
/** The package version the loaded module was built as (equal to the package's). */
export declare function version(): string;
/** @internal The loaded module; throws when none is. */
export declare function module(): Engine;
/** @internal Every engine export handles traps and recovery in its generated glue. */
export declare function call<T>(f: (m: Engine) => T): T;
