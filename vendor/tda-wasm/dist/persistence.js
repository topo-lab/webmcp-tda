/**
 * Persistence of a complex the caller holds, of Rips filtrations, of images,
 * of zigzags, and the volume-optimal cycles of a complex (internal module;
 * the package root re-exports the API).
 */
import { call, module } from './load.js';
import { coeff as checkCoeff, finite, int, kind, minPersistence as checkMinPersistence, nonNegative, num, oneOf, options, points } from './check.js';
import { distanceMatrix, gridArgs, isMatrix } from './complex.js';
import { diagramOf, isLong, keepEntries, keepRows, longPairs } from './diagram_of.js';
const SCALES = ['edgeLength', 'radius', 'squaredRadius', 'squaredRelaxation', 'epsilon', 'growthRadius', 'value'];
const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;
/**
 * A complex argument as the typed arrays the engine reads: typed arrays of
 * the right kind pass through, plain arrays (or other typed arrays) are
 * checked (32-bit integer vertex ids, non-negative integer offsets, numbers)
 * and converted. The rest (CSR shape, closure, monotonicity, NaN) the Rust
 * core checks, naming the simplex.
 */
export function complexArgs(v, name) {
    const c = v;
    const arrayLike = (x) => Array.isArray(x) || (ArrayBuffer.isView(x) && !(x instanceof DataView));
    if (c === null || typeof c !== 'object' || !arrayLike(c.vertices) || !arrayLike(c.offsets) || !arrayLike(c.filtrations)) {
        throw new TypeError(`${name} must be a complex { vertices, offsets, filtrations } (Int32Array, Uint32Array, Float64Array or arrays of numbers), got ${kind(v)}`);
    }
    let vertices;
    if (c.vertices instanceof Int32Array) {
        vertices = c.vertices;
    }
    else {
        const raw = c.vertices;
        for (let j = 0; j < raw.length; j++) {
            const x = raw[j];
            if (!Number.isInteger(x) || x < INT32_MIN || x > INT32_MAX) {
                throw new RangeError(`${name}.vertices[${j}] must be an integer from ${INT32_MIN} to ${INT32_MAX}, got ${String(x)}`);
            }
        }
        vertices = Int32Array.from(raw);
    }
    let offsets;
    if (c.offsets instanceof Uint32Array) {
        offsets = c.offsets;
    }
    else {
        const raw = c.offsets;
        for (let j = 0; j < raw.length; j++) {
            const x = raw[j];
            if (!Number.isInteger(x) || x < 0 || x > 4294967295) {
                throw new RangeError(`${name}.offsets[${j}] must be an integer from 0 to 4294967295, got ${String(x)}`);
            }
        }
        offsets = Uint32Array.from(raw);
    }
    let filtrations;
    if (c.filtrations instanceof Float64Array) {
        filtrations = c.filtrations;
    }
    else {
        const raw = c.filtrations;
        for (let j = 0; j < raw.length; j++) {
            if (typeof raw[j] !== 'number')
                throw new TypeError(`${name}.filtrations[${j}] must be a number, got ${kind(raw[j])}`);
        }
        filtrations = Float64Array.from(raw);
    }
    const scale = c.scale === undefined ? 'value' : oneOf(c.scale, `${name}.scale`, SCALES);
    let top = -1;
    for (let i = 0; i + 1 < offsets.length; i++)
        top = Math.max(top, offsets[i + 1] - offsets[i] - 1);
    return { vertices, offsets, filtrations, scale, top };
}
/**
 * The persistence diagram of a filtered simplicial complex: one a builder
 * returned, or one the caller builds as `{ vertices, offsets, filtrations }`
 * (`scale` is read when present, `'value'` otherwise).
 *
 * The complex must be closed (every face of every simplex listed, its
 * vertices included) and monotone (no face valued above a coface); no
 * simplex may be listed twice or list a vertex twice, and no value may be
 * NaN (`Infinity`, `-Infinity` and `-0` are fine). Anything else is a
 * `RangeError` naming the simplex. Vertex ids are any 32-bit integers;
 * vertex order within a simplex and simplex order do not matter.
 *
 * The Rust core puts the simplices in the documented order and its reducer
 * (rust/tda-core/src/persistence) computes the pairs over `Z/coeff`, in
 * every dimension up to the complex's top one (an empty complex has an
 * empty diagram). Within a dimension the finite pairs come in the order of
 * their death simplex, then the essential classes in the order of their
 * birth simplex: an order that depends on the complex only.
 */
export function persistence(complex, opts) {
    module();
    const o = options(opts, 'opts');
    const c = complexArgs(complex, 'complex');
    const coeff = checkCoeff(o.coeff);
    const minPersistence = checkMinPersistence(o.minPersistence);
    if (c.filtrations.length === 0)
        return diagramOf(new Float64Array(0), c.top, c.scale, coeff);
    return call((m) => diagramOf(m.persistenceFlat(c.vertices, c.offsets, c.filtrations, coeff), c.top, c.scale, coeff, minPersistence));
}
/** The kind and the dimension bit mask of a representatives request. */
function representativeRequest(v, maxDim) {
    if (v === undefined || v === false)
        return null;
    const o = v === true ? {} : options(v, 'representatives');
    const k = o.kind === undefined ? 'cycles' : oneOf(o.kind, 'representatives.kind', ['cycles', 'cocycles']);
    let mask = 0;
    if (o.dims === undefined) {
        mask = (1 << (maxDim + 1)) - 1;
    }
    else {
        if (!Array.isArray(o.dims))
            throw new TypeError(`representatives.dims must be an array of integers, got ${kind(o.dims)}`);
        o.dims.forEach((d, i) => {
            int(d, `representatives.dims[${i}]`, 0, maxDim);
            mask |= 1 << d;
        });
    }
    return { kind: k, mask };
}
/**
 * The engine's representatives as {@link RipsRepresentatives} against the
 * per-dimension diagram, without the pairs `minPersistence` leaves out and
 * their representatives.
 */
function representativesOf(raw, kindOf, minPersistence) {
    const { flat, kept } = longPairs(raw.pairs, minPersistence);
    const m = flat.length / 3;
    const within = new Uint32Array(m);
    const seen = [];
    for (let p = 0; p < m; p++) {
        const k = flat[3 * p];
        while (seen.length <= k)
            seen.push(0);
        within[p] = seen[k]++;
    }
    let index = raw.pairIndex;
    let simplexOffsets = raw.simplexOffsets;
    let vertexOffsets = raw.vertexOffsets;
    let vertices = raw.vertices;
    let coefficients = raw.coefficients;
    if (kept !== null) {
        const keep = Array.from(index, (p) => kept[p] >= 0);
        ({ offsets: simplexOffsets, values: coefficients } = keepRows(simplexOffsets, coefficients, keep));
        ({ offsets: vertexOffsets, values: vertices } = keepRows(vertexOffsets, vertices, keep));
        index = Uint32Array.from(keepEntries(index, keep), (p) => kept[p]);
    }
    const count = index.length;
    const dims = new Uint8Array(count);
    const pairIndex = new Uint32Array(count);
    const births = new Float64Array(count);
    const deaths = new Float64Array(count);
    for (let i = 0; i < count; i++) {
        const p = index[i];
        dims[i] = flat[3 * p];
        pairIndex[i] = within[p];
        births[i] = flat[3 * p + 1];
        deaths[i] = flat[3 * p + 2];
    }
    return {
        diagram: flat,
        reps: {
            kind: kindOf,
            dims,
            pairIndex,
            births,
            deaths,
            simplexOffsets,
            vertexOffsets,
            vertices,
            coefficients
        }
    };
}
/**
 * The Vietoris–Rips persistence diagram of a point cloud or of a distance
 * matrix, H_0 to H_maxDim, by the Rust core without building the complex
 * (persistent cohomology with clearing, implicit coboundaries and
 * apparent pairs, after Bauer's Ripser; an edge collapse before H_2 and up).
 * Distances are computed in double precision in GUDHI's order, so the
 * diagram is GUDHI's, value for value, on dimensions 0 to `maxDim`; the
 * classes a truncated complex reports in dimension `maxDim + 1` are not
 * reported. A distance matrix is read in its strict lower triangle;
 * `Infinity` entries are absent edges and entries must be non-negative.
 * Within a dimension the pairs come in the engine's order.
 *
 * With `representatives`, the pairs (the same multiset, every value bit;
 * the order within a dimension may differ) come with a representative cycle
 * or cocycle each ({@link RipsRepresentatives}). Representatives are
 * computed on the uncollapsed filtration, which is slower on dense
 * filtrations in dimension 2 and up; past a working column of 256 MiB,
 * cocycles are refused (an `Error`) and cycles are computed on the collapsed
 * filtration instead (still cycles of the Rips complex, of the same bars).
 */
export function ripsPersistence(points_, opts) {
    module();
    const o = options(opts, 'opts');
    const matrix = isMatrix(points_, 'points');
    const n = matrix ? distanceMatrix(points_, 'points') : points(points_, 'points');
    const maxDim = o.maxDim === undefined ? 1 : int(o.maxDim, 'maxDim', 0, 9);
    const maxEdgeLength = o.maxEdgeLength === undefined ? Infinity : nonNegative(o.maxEdgeLength, 'maxEdgeLength');
    const coeff = checkCoeff(o.coeff);
    const request = representativeRequest(o.representatives, maxDim);
    const minPersistence = checkMinPersistence(o.minPersistence);
    return call((m) => {
        const head = matrix ? [points_.distances, n] : [points_.coords, points_.d];
        if (request === null) {
            const flat = matrix
                ? m.ripsPersistenceFromDistanceMatrixFlat(...head, maxDim, maxEdgeLength, coeff)
                : m.ripsPersistenceFlat(...head, maxDim, maxEdgeLength, coeff);
            return diagramOf(flat, maxDim, 'edgeLength', coeff, minPersistence);
        }
        const kindCode = request.kind === 'cocycles' ? 1 : 0;
        const raw = matrix
            ? m.ripsRepresentativesFromDistanceMatrixFlat(...head, maxDim, maxEdgeLength, coeff, kindCode, request.mask)
            : m.ripsRepresentativesFlat(...head, maxDim, maxEdgeLength, coeff, kindCode, request.mask);
        const { diagram, reps } = representativesOf(raw, request.kind, minPersistence);
        return { ...diagramOf(diagram, maxDim, 'edgeLength', coeff), representatives: reps };
    });
}
/**
 * The sublevel-set persistence diagram of an image or a volume, homology up
 * to the number of axes. 2-D and 3-D grids run the Rust core (union-find
 * with Alexander duality; H1 of volumes by a cohomology reduction over
 * `Z/coeff`); other grids (up to 16 axes) run the Rust core's reducer
 * (rust/tda-core/src/persistence) over its cells. The T diagram
 * is GUDHI's bitmap complex's in every case (its test oracle), up to the
 * sign of a zero on input holding both -0 and +0; within a dimension the
 * pairs come in the engine's order. In 2-D the field does not change the
 * diagram.
 */
export function cubicalPersistence(image, opts) {
    module();
    const o = options(opts, 'opts');
    const extents = gridArgs(image, 'image');
    const construction = o.construction === undefined ? 'T' : oneOf(o.construction, 'construction', ['T', 'V']);
    const coeff = checkCoeff(o.coeff);
    const minPersistence = checkMinPersistence(o.minPersistence);
    const top = image.shape.length;
    if (construction === 'V') {
        if (image.shape.length !== 2) {
            throw new RangeError(`construction 'V' takes a 2-D image (image.shape of length 2), got ${image.shape.length} axes`);
        }
        return call((m) => diagramOf(m.cubicalVertexPersistenceFlat(image.values, image.shape[1], image.shape[0]), top, 'value', coeff, minPersistence));
    }
    return call((m) => diagramOf(m.cubicalPersistenceFlat(extents, image.values, coeff), top, 'value', coeff, minPersistence));
}
/** Insert cell `cell` of dimension `dim` with faces `boundary`, at `value` if given. */
export function insertOp(cell, boundary, dim, value) {
    return value === undefined ? { type: 'insert', cell, boundary, dim } : { type: 'insert', cell, boundary, dim, value };
}
/** Remove cell `cell`, at `value` if given. */
export function removeOp(cell, value) {
    return value === undefined ? { type: 'remove', cell } : { type: 'remove', cell, value };
}
/**
 * Zigzag persistence of a sequence of insertions and removals of cells,
 * by the FastZigzag conversion of Dey and Hou ("Fast Computation of Zigzag
 * Persistence", ESA 2022, arXiv:2204.11080): the zigzag becomes one ordinary
 * filtration of the cone over a non-repetitive copy of it, reduced over Z/2
 * and read back as zigzag intervals (docs/ZIGZAG_BACKEND.md). Homology up to
 * the highest cell dimension. Z/2 only; no representatives.
 *
 * The operations must describe a zigzag of cell complexes, or the call is
 * refused with a `RangeError` naming the operation: every face of an
 * inserted cell is in the complex at that moment and has one dimension
 * less; a vertex has no face, an edge two; a cell is not inserted while it
 * is in the complex, nor removed while it is not or while a coface of it is.
 * When the operations have values, the values must be monotone (all
 * non-decreasing or all non-increasing) and not NaN; either every operation
 * has a value or none has.
 */
export function zigzagPersistence(ops, opts) {
    module();
    const o = options(opts, 'opts');
    if (!Array.isArray(ops))
        throw new TypeError(`ops must be an array of operations, got ${kind(ops)}`);
    if (ops.length === 0)
        throw new RangeError('ops must hold at least one operation');
    let length = 0;
    let valued = 0;
    let top = -1;
    ops.forEach((op, i) => {
        if (op === null || typeof op !== 'object')
            throw new TypeError(`ops[${i}] must be an operation, got ${kind(op)}`);
        oneOf(op.type, `ops[${i}].type`, ['insert', 'remove']);
        int(op.cell, `ops[${i}].cell`, INT32_MIN, INT32_MAX);
        if (op.value !== undefined) {
            num(op.value, `ops[${i}].value`);
            valued++;
        }
        if (op.type === 'insert') {
            if (!Array.isArray(op.boundary))
                throw new TypeError(`ops[${i}].boundary must be an array of cell ids, got ${kind(op.boundary)}`);
            op.boundary.forEach((id, j) => int(id, `ops[${i}].boundary[${j}]`, INT32_MIN, INT32_MAX));
            top = Math.max(top, int(op.dim, `ops[${i}].dim`, 0));
            length += 5 + op.boundary.length;
        }
        else {
            length += 5;
        }
    });
    if (valued !== 0 && valued !== ops.length) {
        const missing = ops.findIndex((op) => op.value === undefined);
        throw new RangeError(`ops[${missing}].value is missing: give every operation a value, or none`);
    }
    const records = new Float64Array(length);
    let at = 0;
    for (const op of ops) {
        records[at++] = op.type === 'insert' ? 0 : 1;
        records[at++] = op.cell;
        records[at++] = op.type === 'insert' ? op.dim : 0;
        records[at++] = op.value ?? 0;
        const boundary = op.type === 'insert' ? op.boundary : [];
        records[at++] = boundary.length;
        for (const id of boundary)
            records[at++] = id;
    }
    const withValues = valued === ops.length;
    const minPersistence = checkMinPersistence(o.minPersistence);
    return call((m) => {
        const raw = m.zigzagPersistenceFlat(records, withValues);
        const indices = raw.indices;
        for (let i = 2; i < indices.length; i += 3)
            if (indices[i] === -1)
                indices[i] = Infinity;
        const indexPairs = diagramOf(indices, top, 'value', 2, withValues ? 0 : minPersistence).pairs;
        const result = { indexPairs, scale: 'value', coeff: 2 };
        if (withValues)
            result.pairs = diagramOf(raw.values, top, 'value', 2, minPersistence).pairs;
        return result;
    });
}
/** The engine's cycles, without those of the pairs `minPersistence` leaves out. */
function cyclesOf(raw, minPersistence = 0) {
    if (minPersistence > 0) {
        const births = raw.births;
        const keep = Array.from(births, (b, r) => isLong(b, raw.deaths[r], minPersistence));
        if (keep.includes(false)) {
            const dim = raw.dimension;
            const volume = keepRows(raw.volumeOffsets, raw.volumeVertices, keep, dim + 2);
            const boundary = keepRows(raw.boundaryOffsets, raw.boundaryVertices, keep, dim + 1);
            const cycle = keepRows(raw.cycleVertexOffsets, raw.cycleVertices, keep);
            raw = {
                dimension: dim,
                births: keepEntries(births, keep),
                deaths: keepEntries(raw.deaths, keep),
                found: keepEntries(raw.found, keep),
                volumeOffsets: volume.offsets,
                volumeVertices: volume.values,
                boundaryOffsets: boundary.offsets,
                boundaryVertices: boundary.values,
                cycleVertexOffsets: cycle.offsets,
                cycleVertices: cycle.values
            };
        }
    }
    return {
        dim: raw.dimension,
        births: raw.births,
        deaths: raw.deaths,
        found: raw.found,
        volumeOffsets: raw.volumeOffsets,
        volumeVertices: raw.volumeVertices,
        boundaryOffsets: raw.boundaryOffsets,
        boundaryVertices: raw.boundaryVertices,
        cycleVertexOffsets: raw.cycleVertexOffsets,
        cycleVertices: raw.cycleVertices
    };
}
/**
 * Experimental: volume-optimal cycles of `H_dim`, by the merge-tree /
 * Alexander-duality method of Obayashi (2018, arXiv:1712.05103, §5;
 * clean-room, no HomCloud code). Meaningful for triangulations of convex
 * domains in R^(dim + 1), such as alpha complexes. With `pair`, the cycle of
 * that one finite pair (or the pair echoed with `found[0] === 0`); without,
 * every finite pair's (longer than `minPersistence`), sorted by birth then
 * death. The engine orders and checks the complex itself (closed, values
 * non-decreasing from face to coface; a simplex's vertices in any order,
 * none listed twice). The general L1 problem and stable volumes are not
 * implemented.
 */
export function volumeOptimalCycles(complex, opts) {
    module();
    const o = options(opts, 'opts');
    const c = complexArgs(complex, 'complex');
    const dim = int(o.dim, 'dim', 0, 0x7ffffffe);
    let pair = null;
    if (o.pair !== undefined) {
        if (!Array.isArray(o.pair) || o.pair.length !== 2)
            throw new TypeError(`pair must be [birth, death], got ${kind(o.pair)}`);
        pair = [finite(o.pair[0], 'pair[0]'), finite(o.pair[1], 'pair[1]')];
    }
    const minPersistence = checkMinPersistence(o.minPersistence);
    if (c.filtrations.length === 0 && pair === null) {
        return cyclesOf({
            dimension: dim,
            births: new Float64Array(0),
            deaths: new Float64Array(0),
            found: new Uint8Array(0),
            volumeOffsets: Uint32Array.of(0),
            volumeVertices: new Int32Array(0),
            boundaryOffsets: Uint32Array.of(0),
            boundaryVertices: new Int32Array(0),
            cycleVertexOffsets: Uint32Array.of(0),
            cycleVertices: new Int32Array(0)
        });
    }
    if (c.filtrations.length === 0)
        throw new RangeError('complex must hold at least one simplex to find the cycle of a pair');
    return call((m) => cyclesOf(pair === null
        ? m.volumeOptimalCyclesFlat(c.vertices, c.offsets, c.filtrations, dim + 1)
        : m.volumeOptimalCycleFlat(c.vertices, c.offsets, c.filtrations, dim + 1, pair[0], pair[1]), pair === null ? minPersistence : 0));
}
