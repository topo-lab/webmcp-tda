/** The engines' flat pairs as a per-dimension diagram, and the `minPersistence` filter (internal). */
import { call } from './load.js';
/**
 * The engine pairs `[dimension, birth, death] * m` without the finite pairs
 * with `death - birth <= minPersistence` (GUDHI's `min_persistence`;
 * essential pairs are always kept), in the same order: the Rust core's
 * filter (rust/tda-core/src/min_persistence.rs). At 0 the pairs are returned
 * as they are: every engine already leaves out the pairs of length zero.
 */
export function longPairs(flat, minPersistence) {
    if (!(minPersistence > 0))
        return flat;
    return call((m) => m.longPairsFlat(flat, minPersistence));
}
/**
 * The pairs `[dimension, birth, death] * m` of an engine as a {@link Diagram}
 * with one array per dimension from 0 to `top` (or to the highest dimension
 * present, if higher), each `[birth, death, …]` in the engine's order,
 * without the pairs {@link longPairs} leaves out at `minPersistence`.
 */
export function diagramOf(flat_, top, scale, coeff, minPersistence = 0) {
    const flat = longPairs(flat_, minPersistence);
    const counts = new Array(Math.max(top + 1, 0)).fill(0);
    for (let i = 0; i < flat.length; i += 3) {
        const k = flat[i];
        while (counts.length <= k)
            counts.push(0);
        counts[k]++;
    }
    const pairs = counts.map((c) => new Float64Array(2 * c));
    const at = new Array(counts.length).fill(0);
    for (let i = 0; i < flat.length; i += 3) {
        const k = flat[i];
        const p = pairs[k];
        p[at[k]++] = flat[i + 1];
        p[at[k]++] = flat[i + 2];
    }
    return { pairs, scale, coeff };
}
