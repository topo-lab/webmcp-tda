/**
 * Whether a pair is kept at `minPersistence` (GUDHI's `min_persistence`): an
 * essential pair (`death = Infinity`) always, a finite one when
 * `death - birth > minPersistence`.
 */
export function isLong(birth, death, minPersistence) {
    return death === Infinity || death - birth > minPersistence;
}
/**
 * The engine pairs `[dimension, birth, death] * m` without the pairs
 * {@link isLong} rejects, in the same order, and `kept[p]`, the new index of
 * pair `p` (-1 when left out). At 0 the pairs are returned as they are
 * (`kept` null): every engine already leaves out the pairs of length zero.
 */
export function longPairs(flat, minPersistence) {
    if (!(minPersistence > 0))
        return { flat, kept: null };
    const m = flat.length / 3;
    const kept = new Int32Array(m);
    let count = 0;
    for (let p = 0; p < m; p++)
        kept[p] = isLong(flat[3 * p + 1], flat[3 * p + 2], minPersistence) ? count++ : -1;
    if (count === m)
        return { flat, kept };
    const out = new Float64Array(3 * count);
    for (let p = 0; p < m; p++) {
        if (kept[p] >= 0)
            out.set(flat.subarray(3 * p, 3 * p + 3), 3 * kept[p]);
    }
    return { flat: out, kept };
}
/**
 * The rows `r` with `keep[r]` of a CSR list: entries
 * `values[offsets[r] * width .. offsets[r + 1] * width]` per row, as new
 * offsets and values.
 */
export function keepRows(offsets, values, keep, width = 1) {
    let rows = 0;
    let size = 0;
    for (let r = 0; r < keep.length; r++) {
        if (keep[r]) {
            rows++;
            size += offsets[r + 1] - offsets[r];
        }
    }
    const outOffsets = new Uint32Array(rows + 1);
    const outValues = new values.constructor(size * width);
    let row = 0;
    for (let r = 0; r < keep.length; r++) {
        if (!keep[r])
            continue;
        const from = offsets[r];
        const to = offsets[r + 1];
        const at = outOffsets[row];
        outValues.set(values.subarray(from * width, to * width), at * width);
        outOffsets[row + 1] = at + (to - from);
        row++;
    }
    return { offsets: outOffsets, values: outValues };
}
/** The entries `i` with `keep[i]` of a per-row array. */
export function keepEntries(values, keep) {
    let count = 0;
    for (let i = 0; i < keep.length; i++)
        if (keep[i])
            count++;
    const out = new values.constructor(count);
    let at = 0;
    for (let i = 0; i < keep.length; i++)
        if (keep[i])
            out[at++] = values[i];
    return out;
}
/**
 * The pairs `[dimension, birth, death] * m` of an engine as a {@link Diagram}
 * with one array per dimension from 0 to `top` (or to the highest dimension
 * present, if higher), each `[birth, death, …]` in the engine's order,
 * without the pairs {@link longPairs} leaves out at `minPersistence`.
 */
export function diagramOf(flat_, top, scale, coeff, minPersistence = 0) {
    const flat = longPairs(flat_, minPersistence).flat;
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
