/**
 * Object forms of typed-array results, built on request, and point clouds
 * from rows (internal module; the package root re-exports the API). Pure
 * TypeScript: none of these needs the module loaded.
 */
import { kind, oneOf } from './check.js';
/**
 * A point cloud from one array of coordinates per point. Every row must have
 * the same positive length `d`.
 */
export function pointCloud(rows) {
    if (rows === null || typeof rows !== 'object' || typeof rows.length !== 'number')
        throw new TypeError(`rows must be an array of rows, got ${kind(rows)}`);
    if (rows.length === 0)
        throw new RangeError('rows must hold at least one point');
    const first = rows[0];
    if (first === null || typeof first !== 'object' || typeof first.length !== 'number')
        throw new TypeError(`rows[0] must be an array of numbers, got ${kind(first)}`);
    const d = first.length;
    if (d === 0)
        throw new RangeError('rows[0] must have at least one coordinate');
    const coords = new Float64Array(rows.length * d);
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row === null || typeof row !== 'object' || typeof row.length !== 'number')
            throw new TypeError(`rows[${i}] must be an array of numbers, got ${kind(row)}`);
        if (row.length !== d)
            throw new RangeError(`rows[${i}] has ${row.length} coordinates, rows[0] has ${d}`);
        for (let c = 0; c < d; c++)
            coords[i * d + c] = row[c];
    }
    return { coords, d };
}
/** Rows of `width` ids from flat `values`, rows [from, to). */
function idRows(values, from, to, width) {
    const out = [];
    for (let s = from; s < to; s++)
        out.push(Array.from(values.subarray(s * width, (s + 1) * width)));
    return out;
}
export function materialize(input) {
    if (input === null || typeof input !== 'object') {
        throw new TypeError(`materialize takes a complex, volume-optimal cycles or Rips representatives, got ${kind(input)}`);
    }
    if ('coefficients' in input && 'pairIndex' in input) {
        const r = input;
        const out = [];
        for (let i = 0; i < r.pairIndex.length; i++) {
            const dim = r.dims[i];
            const simplices = [];
            const coefficients = [];
            let at = r.vertexOffsets[i];
            for (let s = r.simplexOffsets[i]; s < r.simplexOffsets[i + 1]; s++) {
                simplices.push(Array.from(r.vertices.subarray(at, at + dim + 1)));
                at += dim + 1;
                coefficients.push(r.coefficients[s]);
            }
            const touched = Array.from(new Set(r.vertices.subarray(r.vertexOffsets[i], r.vertexOffsets[i + 1]))).sort((a, b) => a - b);
            out.push({ dim, pairIndex: r.pairIndex[i], birth: r.births[i], death: r.deaths[i], simplices, coefficients, vertices: touched });
        }
        return out;
    }
    if ('births' in input && 'found' in input) {
        const c = input;
        const out = [];
        for (let r = 0; r < c.births.length; r++) {
            out.push({
                dim: c.dim,
                birth: c.births[r],
                death: c.deaths[r],
                cycleVertices: Array.from(c.cycleVertices.subarray(c.cycleVertexOffsets[r], c.cycleVertexOffsets[r + 1])),
                cycleSimplices: idRows(c.boundaryVertices, c.boundaryOffsets[r], c.boundaryOffsets[r + 1], c.dim + 1),
                volumeSimplices: idRows(c.volumeVertices, c.volumeOffsets[r], c.volumeOffsets[r + 1], c.dim + 2),
                found: c.found[r] === 1
            });
        }
        return out;
    }
    const { vertices, offsets, filtrations } = input;
    if (vertices === undefined || offsets === undefined || filtrations === undefined) {
        throw new TypeError(`materialize takes a complex, volume-optimal cycles or Rips representatives, got ${kind(input)}`);
    }
    const out = [];
    for (let i = 0; i < filtrations.length; i++) {
        const simplex = [];
        for (let j = offsets[i]; j < offsets[i + 1]; j++)
            simplex.push(vertices[j]);
        out.push({ vertices: simplex, filtration: filtrations[i] });
    }
    return out;
}
/**
 * A `{ vertices, filtration }[]` list as a {@link Complex} (same order of
 * the simplices, each simplex's vertices sorted increasing), on `scale`
 * (default `'value'`): the inverse of {@link materialize} on a complex, for
 * handing object lists to the functions that take a complex. Vertex ids must
 * be integers that fit 32 bits, distinct within a simplex, and values
 * numbers; anything else is refused rather than truncated.
 */
export function flatten(simplices, scale = 'value') {
    oneOf(scale, 'scale', ['edgeLength', 'radius', 'squaredRadius', 'squaredRelaxation', 'epsilon', 'growthRadius', 'value']);
    if (!Array.isArray(simplices))
        throw new TypeError(`simplices must be an array of { vertices, filtration }, got ${kind(simplices)}`);
    const offsets = new Uint32Array(simplices.length + 1);
    let total = 0;
    for (let i = 0; i < simplices.length; i++) {
        const s = simplices[i];
        if (!s || !Array.isArray(s.vertices))
            throw new TypeError(`simplices[${i}].vertices must be an array of vertex ids, got ${kind(s?.vertices)}`);
        if (typeof s.filtration !== 'number')
            throw new TypeError(`simplices[${i}].filtration must be a number, got ${kind(s.filtration)}`);
        for (let j = 0; j < s.vertices.length; j++) {
            const v = s.vertices[j];
            if (!Number.isInteger(v) || v < -2147483648 || v > 2147483647) {
                throw new RangeError(`simplices[${i}].vertices[${j}] must be an integer from -2147483648 to 2147483647, got ${String(v)}`);
            }
        }
        total += s.vertices.length;
        offsets[i + 1] = total;
    }
    const vertices = new Int32Array(total);
    const filtrations = new Float64Array(simplices.length);
    for (let i = 0; i < simplices.length; i++) {
        const row = vertices.subarray(offsets[i], offsets[i + 1]);
        row.set(simplices[i].vertices);
        row.sort();
        for (let j = 1; j < row.length; j++) {
            if (row[j] === row[j - 1]) {
                throw new RangeError(`simplices[${i}].vertices lists the vertex ${row[j]} twice; a simplex is a set of distinct vertices`);
            }
        }
        filtrations[i] = simplices[i].filtration;
    }
    return { vertices, offsets, filtrations, scale };
}
