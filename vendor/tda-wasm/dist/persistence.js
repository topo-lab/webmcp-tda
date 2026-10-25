/**
 * Persistence of a complex the caller holds, of Rips filtrations, of images,
 * of zigzags, and the volume-optimal cycles of a complex (internal module;
 * the package root re-exports the API).
 */
import { call, module } from './load.js';
import { coeff as checkCoeff, finite, int, kind, minPersistence as checkMinPersistence, nonNegative, num, oneOf, options, points } from './check.js';
import { distanceMatrix, gridArgs, isMatrix } from './complex.js';
import { diagramOf } from './diagram_of.js';
const SCALES = ['edgeLength', 'radius', 'squaredRadius', 'squaredRelaxation', 'epsilon', 'growthRadius', 'value'];
const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;
// The object form already holds an operation object and often a boundary
// array per record. Limit its additional packed copy to a conservative 1 GiB.
// PackedZigzag accepts the same records without this second JS structure.
const ZIGZAG_OBJECT_CONVERSION_BUDGET = 1_073_741_824;
function refuseZigzagObjectConversion(operations) {
    const status = module().__oom_status();
    const memoryBytes = status.memory.buffer.byteLength;
    const declaredMaxBytes = status.limitBytes;
    const requestedBytes = operations * 5 * Float64Array.BYTES_PER_ELEMENT;
    const details = {
        function: 'zigzagPersistence', phase: 'input-conversion', requestedBytes,
        inUseBytes: null, memoryBytes, committedBytes: memoryBytes,
        limitBytes: ZIGZAG_OBJECT_CONVERSION_BUDGET, declaredMaxBytes,
        allocationLimitBytes: Math.min(declaredMaxBytes, 2_147_483_647),
        hostConversionBudgetBytes: ZIGZAG_OBJECT_CONVERSION_BUDGET,
        input: { operations }, parameters: {},
        estimateMethod: 'The request is a lower bound of five Float64 fields per operation. Boundaries add fields. The 1 GiB conversion budget is a conservative policy, not a measured JavaScript heap ceiling or a whole-input fit estimate.'
    };
    const error = new RangeError(`zigzagPersistence: input too large while building JavaScript records; at least ${requestedBytes} bytes requested by ${operations} operations, above the ${ZIGZAG_OBJECT_CONVERSION_BUDGET} byte object-conversion budget. Pass packed Float64Array records to avoid the extra copy.`);
    Object.assign(error, { code: 'TOO_LARGE', details });
    throw error;
}
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
 * per-dimension diagram. The engine has already left out the pairs
 * `minPersistence` leaves out, with their representatives
 * (rust/tda-core/src/min_persistence.rs); here each representative's pair
 * index into the flat list becomes (dimension, index within the dimension),
 * the layout {@link diagramOf} gives the pairs.
 */
function representativesOf(raw, kindOf) {
    const flat = raw.pairs;
    const m = flat.length / 3;
    const within = new Uint32Array(m);
    const seen = [];
    for (let p = 0; p < m; p++) {
        const k = flat[3 * p];
        while (seen.length <= k)
            seen.push(0);
        within[p] = seen[k]++;
    }
    const index = raw.pairIndex;
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
            simplexOffsets: raw.simplexOffsets,
            vertexOffsets: raw.vertexOffsets,
            vertices: raw.vertices,
            coefficients: raw.coefficients
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
            ? m.ripsRepresentativesFromDistanceMatrixFlat(...head, maxDim, maxEdgeLength, coeff, kindCode, request.mask, minPersistence)
            : m.ripsRepresentativesFlat(...head, maxDim, maxEdgeLength, coeff, kindCode, request.mask, minPersistence);
        const { diagram, reps } = representativesOf(raw, request.kind);
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
    let top = -1;
    let records;
    let withValues;
    if (Array.isArray(ops)) {
        if (ops.length * 5 * Float64Array.BYTES_PER_ELEMENT > ZIGZAG_OBJECT_CONVERSION_BUDGET)
            refuseZigzagObjectConversion(ops.length);
        if (ops.length === 0)
            throw new RangeError('ops must hold at least one operation');
        let length = 0;
        let valued = 0;
        ops.forEach((op, i) => {
            if (op === null || typeof op !== 'object')
                throw new TypeError(`ops[${i}] must be an operation, got ${kind(op)}`);
            // Build parameter paths only on refusal, preserving the existing checks
            // and messages without allocating a string for every valid cell/face.
            const type = op.type;
            if (type !== 'insert' && type !== 'remove')
                oneOf(type, `ops[${i}].type`, ['insert', 'remove']);
            if (!Number.isInteger(op.cell) || op.cell < INT32_MIN || op.cell > INT32_MAX)
                int(op.cell, `ops[${i}].cell`, INT32_MIN, INT32_MAX);
            if (op.value !== undefined) {
                if (typeof op.value !== 'number')
                    num(op.value, `ops[${i}].value`);
                valued++;
            }
            if (op.type === 'insert') {
                if (!Array.isArray(op.boundary))
                    throw new TypeError(`ops[${i}].boundary must be an array of cell ids, got ${kind(op.boundary)}`);
                op.boundary.forEach((id, j) => {
                    if (!Number.isInteger(id) || id < INT32_MIN || id > INT32_MAX)
                        int(id, `ops[${i}].boundary[${j}]`, INT32_MIN, INT32_MAX);
                });
                if (!Number.isSafeInteger(op.dim) || op.dim < 0 || op.dim > INT32_MAX)
                    int(op.dim, `ops[${i}].dim`, 0);
                top = Math.max(top, op.dim);
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
        records = new Float64Array(length);
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
        withValues = valued === ops.length;
    }
    else {
        if (ops === null || typeof ops !== 'object' || !(ops.records instanceof Float64Array)) {
            throw new TypeError(`ops must be an array of operations, got ${kind(ops)}`);
        }
        if (ops.withValues !== undefined && typeof ops.withValues !== 'boolean')
            throw new TypeError('withValues must be a boolean');
        records = ops.records;
        withValues = ops.withValues ?? false;
        // Discover the output's dimensions in constant heap space. The engine
        // checks the record contents and operation semantics; reject incomplete
        // headers/counts here so this scan never skips outside the typed array.
        for (let at = 0; at < records.length;) {
            if (records.length - at < 5)
                throw new RangeError('truncated zigzag record header');
            const count = records[at + 4];
            if (!Number.isSafeInteger(count) || count < 0 || count > records.length - at - 5)
                throw new RangeError('invalid zigzag boundary length');
            if (records[at] === 0)
                top = Math.max(top, records[at + 2]);
            at += 5 + count;
        }
    }
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
/**
 * The engine's one array (`volumeOptimalCyclesFlat`, rust/tda-wasm/src/api.rs) cut into the typed
 * arrays of {@link VolumeOptimalCycles}: `[count, volume rows, boundary
 * rows, cycle vertices]`, then births, deaths, found, and the three CSR
 * lists, each offsets then ids.
 */
function cyclesOf(out, dim) {
    const [count, volumeRows, boundaryRows, cycleLength] = [out[0], out[1], out[2], out[3]];
    let at = 4;
    const take = (length) => out.subarray(at, (at += length));
    const births = take(count).slice();
    const deaths = take(count).slice();
    const found = Uint8Array.from(take(count));
    const volumeOffsets = Uint32Array.from(take(count + 1));
    const volumeVertices = Int32Array.from(take(volumeRows * (dim + 2)));
    const boundaryOffsets = Uint32Array.from(take(count + 1));
    const boundaryVertices = Int32Array.from(take(boundaryRows * (dim + 1)));
    const cycleVertexOffsets = Uint32Array.from(take(count + 1));
    const cycleVertices = Int32Array.from(take(cycleLength));
    return { dim, births, deaths, found, volumeOffsets, volumeVertices, boundaryOffsets, boundaryVertices, cycleVertexOffsets, cycleVertices };
}
/**
 * Experimental: volume-optimal cycles of `H_dim`, by the merge-tree /
 * Alexander-duality method of Obayashi (2018, arXiv:1712.05103, §5).
 * Meaningful for triangulations of convex
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
    if (c.filtrations.length === 0 && pair === null)
        return cyclesOf(Float64Array.of(0, 0, 0, 0, 0, 0, 0), dim);
    if (c.filtrations.length === 0)
        throw new RangeError('complex must hold at least one simplex to find the cycle of a pair');
    const [birth, death] = pair ?? [0, 0];
    const out = call((m) => m.volumeOptimalCyclesFlat(c.vertices, c.offsets, c.filtrations, dim + 1, pair !== null, birth, death, minPersistence));
    return cyclesOf(out, dim);
}
