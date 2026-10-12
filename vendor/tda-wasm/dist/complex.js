/**
 * The filtered complexes, the shapes some of them are built from, and the
 * persistence of each builder's own complex in one call (internal module;
 * the package root re-exports the API).
 */
import { call, module } from './load.js';
import { allFinite, boolOption, noNaN, numbers, finite, int, intOption, kind, nonNegative, num, options, points, positive, sized, u32 } from './check.js';
import { diagramOf } from './diagram_of.js';
import { coeff as checkCoeff, minPersistence as checkMinPersistence } from './check.js';
/** A builder's typed arrays as a {@link Complex} on `scale`. */
function complexOf(raw, scale) {
    return { vertices: raw.vertices, offsets: raw.offsets, filtrations: raw.filtrations, scale };
}
function fused(o) {
    return {
        coeff: checkCoeff(o.coeff),
        complex: boolOption(o.complex, 'complex', false),
        minPersistence: checkMinPersistence(o.minPersistence)
    };
}
/**
 * The result of a pipeline call (`{ pairs, simplices?, empty?, … }`) as a
 * diagram with homology up to `top` (without the pairs `minPersistence`
 * leaves out), and the complex (built by `shape`) when asked for.
 */
function persistenceOf(raw, scale, f, top, withComplex, shape) {
    const diagram = diagramOf(raw.empty ? new Float64Array(0) : raw.pairs, top, scale, f.coeff, f.minPersistence);
    if (!withComplex)
        return diagram;
    return { ...diagram, complex: shape(Object.assign({}, raw, raw.simplices ?? emptyComplex())) };
}
function emptyComplex() {
    return { vertices: new Int32Array(0), offsets: Uint32Array.of(0), filtrations: new Float64Array(0) };
}
/** A non-negative integer that caps the simplex dimension, with a default. */
function maxSimplexDim(v, fallback, max = 0x7fffffff) {
    return intOption(v, 'maxSimplexDim', fallback, 0, max);
}
// ---------------------------------------------------------------------------
// Rips
// ---------------------------------------------------------------------------
/** The number of points of a distance matrix, after its checks. */
export function distanceMatrix(v, name) {
    const { distances } = v;
    if (!(distances instanceof Float64Array)) {
        throw new TypeError(`${name}.distances must be a Float64Array, got ${kind(distances)}`);
    }
    const n = Math.round(Math.sqrt(distances.length));
    if (distances.length === 0 || n * n !== distances.length) {
        throw new RangeError(`${name}.distances must hold n × n entries for a positive integer n, got length ${distances.length}`);
    }
    noNaN(distances, `${name}.distances`);
    for (let i = 1; i < n; i++) {
        for (let j = 0; j < i; j++) {
            const x = distances[i * n + j];
            if (!(x >= 0)) {
                throw new RangeError(`${name}.distances[${i * n + j}] (row ${i}, column ${j}) must be non-negative or Infinity, got ${x}`);
            }
        }
    }
    return n;
}
/** Whether the input of a Rips function is a distance matrix, after the type check of either form. */
export function isMatrix(v, name) {
    if (v !== null && typeof v === 'object' && 'distances' in v && !('coords' in v))
        return true;
    if (v === null || typeof v !== 'object' || !('coords' in v)) {
        throw new TypeError(`${name} must be a point cloud { coords: Float64Array, d: number } or a distance matrix { distances: Float64Array }, got ${kind(v)}`);
    }
    return false;
}
/**
 * The Vietoris–Rips complex of a point cloud or of a distance matrix: every
 * point a vertex at 0, every pair at distance `<= maxEdgeLength` an edge at
 * that distance, every clique of up to `maxSimplexDim + 1` points a simplex
 * at its longest edge. Built by the Rust core (clique enumeration over a
 * sorted neighbour graph); distances in double precision in GUDHI's order,
 * so the values are GUDHI's `Rips_complex`'s, bit for bit. A distance matrix
 * is read in its strict lower triangle, as GUDHI reads it; its entries must
 * not be NaN or negative (`Infinity` is an absent edge). Complexes above
 * 2^25 simplices are refused (an `Error`). Values on the `'edgeLength'`
 * scale.
 */
export function ripsComplex(points_, opts) {
    module();
    const o = options(opts, 'opts');
    const matrix = isMatrix(points_, 'points');
    const n = matrix ? distanceMatrix(points_, 'points') : points(points_, 'points');
    const maxEdgeLength = positive(o.maxEdgeLength, 'maxEdgeLength');
    const cap = maxSimplexDim(o.maxSimplexDim, 3);
    return call((m) => {
        if (matrix) {
            return complexOf(m.ripsComplexFromMatrixFlat(points_.distances, n, maxEdgeLength, cap), 'edgeLength');
        }
        const { coords, d } = points_;
        return complexOf(m.ripsComplexFlat(coords, d, maxEdgeLength, cap), 'edgeLength');
    });
}
/**
 * The Čech complex of a point cloud (at least 2 points): every vertex set
 * whose smallest enclosing ball has radius `<= maxRadius`, up to
 * `maxSimplexDim`, valued by that radius (exact geometry; scale
 * `'radius'`). It grows combinatorially; {@link cechPersistence} computes
 * its diagram from the far smaller Delaunay–Čech complex for points in
 * dimension 1 to 3. Where the input's ties are not exact in double precision
 * a face can come out one ulp above a coface, which {@link persistence}
 * refuses (WASM_HONESTY.md, row "Čech: filtration monotonicity").
 */
export function cechComplex(points_, opts) {
    module();
    const o = options(opts, 'opts');
    points(points_, 'points', { min: 2 });
    const maxRadius = positive(o.maxRadius, 'maxRadius');
    const cap = maxSimplexDim(o.maxSimplexDim, 3);
    const { coords, d } = points_;
    return call((m) => complexOf(m.cechComplexFlat(coords, d, maxRadius, cap), 'radius'));
}
/**
 * The persistence of the Čech complex of a point cloud ({@link cechComplex}),
 * built and reduced in one call. For points in dimension 1 to 3 it is
 * computed on the Delaunay–Čech complex, whose diagram is the Čech
 * complex's (Bauer and Edelsbrunner, Trans. AMS 2017), and `complex: true`
 * returns that complex; above dimension 3 on the full Čech complex, each
 * face lowered to its smallest coface first (see {@link cechComplex}).
 * Homology up to `maxSimplexDim`; in that top dimension a truncated full
 * Čech complex has classes only the truncation creates, the Delaunay–Čech
 * complex none once `maxSimplexDim` reaches the point dimension.
 */
export function cechPersistence(points_, opts) {
    module();
    const o = options(opts, 'opts');
    points(points_, 'points', { min: 2 });
    const maxRadius = positive(o.maxRadius, 'maxRadius');
    const cap = maxSimplexDim(o.maxSimplexDim, 3);
    const f = fused(o);
    const { coords, d } = points_;
    return call((m) => persistenceOf(m.cechPipeline(coords, d, maxRadius, cap, f.coeff, f.complex), 'radius', f, cap, f.complex, (raw) => complexOf(raw, 'radius')));
}
/**
 * The Delaunay–Čech complex of points in dimension 1, 2 or 3: every face of
 * the Delaunay triangulation, valued by the radius of the smallest ball
 * enclosing its vertices (for a simplex of both complexes the value
 * {@link cechComplex} gives it, bit for bit; scale `'radius'`). Its diagram
 * is the Čech complex's, from a far smaller complex. Repeated points keep
 * their first copy. Cospherical points are triangulated by Geogram's exact
 * predicates with symbolic perturbation and a fixed insertion order, so the
 * complex is a pure function of the input.
 */
export function delaunayCechComplex(points_, opts) {
    module();
    const o = options(opts, 'opts');
    points(points_, 'points', { dims: [1, 2, 3] });
    const maxRadius = positive(o.maxRadius, 'maxRadius');
    const cap = maxSimplexDim(o.maxSimplexDim, 3);
    const { coords, d } = points_;
    return call((m) => complexOf(m.delaunayCechComplexFlat(coords, d, maxRadius, cap), 'radius'));
}
/** `[x, y, z, weight] * n` for the engine, after the checks of the alpha functions. */
function alphaArgs(points_, o) {
    const n = points(points_, 'points', { dims: [3] });
    const weights = o.weights === undefined ? null : numbers(o.weights, 'weights');
    if (weights !== null) {
        sized(weights.length, n, 'weights', 'one weight per point');
        for (let i = 0; i < n; i++) {
            const w = weights[i];
            if (!(w >= 0) || !Number.isFinite(w))
                throw new RangeError(`weights[${i}] must be finite and non-negative, got ${w}`);
        }
    }
    // Non-positive is the engine's "no cutoff": an omitted or infinite one.
    const max = o.maxSquaredRadius === undefined ? Infinity : positive(o.maxSquaredRadius, 'maxSquaredRadius');
    const coords = new Float64Array(4 * n);
    for (let i = 0; i < n; i++) {
        coords[4 * i] = points_.coords[3 * i];
        coords[4 * i + 1] = points_.coords[3 * i + 1];
        coords[4 * i + 2] = points_.coords[3 * i + 2];
        coords[4 * i + 3] = weights === null ? 0 : weights[i];
    }
    return { coords, cutoff: Number.isFinite(max) ? max : 0 };
}
/**
 * The (weighted) alpha complex of points in three dimensions, over Geogram's
 * regular triangulation: values are squared radii (scale `'squaredRadius'`),
 * a vertex at minus its weight. Without a cutoff, near-degenerate input can
 * end with astronomically large values for the last tetrahedra, genuine
 * values but rarely wanted; the filtration is monotone, so a cutoff leaves a
 * closed complex.
 */
export function alphaComplex(points_, opts) {
    module();
    const { coords, cutoff } = alphaArgs(points_, options(opts, 'opts'));
    return call((m) => complexOf(m.weightedAlphaComplexFlat(coords, cutoff), 'squaredRadius'));
}
/** The persistence of {@link alphaComplex}, built and reduced in one call: homology up to dimension 3. */
export function alphaPersistence(points_, opts) {
    module();
    const o = options(opts, 'opts');
    const { coords, cutoff } = alphaArgs(points_, o);
    const f = fused(o);
    return call((m) => persistenceOf(m.weightedAlphaPipeline(coords, cutoff, f.coeff, f.complex), 'squaredRadius', f, 3, f.complex, (raw) => complexOf(raw, 'squaredRadius')));
}
/**
 * The coupled alpha complex of a planar two-colour point cloud: the nerve of
 * the sets `B(p, r) ∩ Vor(p, points of p's colour)` (closed balls cut by
 * each colour's own Voronoi cells; Reani and Bobrowski, "A Coupled Alpha
 * Complex", Definition 3.1). A simplex is born at the smallest squared
 * radius at which its vertices' sets meet (scale `'squaredRadius'`). The
 * simplices whose vertices all have colour 0 form the alpha complex of the
 * survivors, with that complex's values up to rounding, and the whole
 * complex has, at every radius, the homotopy type of the union of all the
 * balls, so the two rows of a commutative ladder come from one call (see
 * docs/COUPLED_ALPHA_2D.md). Vertex ids are input indices, coincident points
 * included. No flag completion and no perturbation.
 *
 * Bounded by design: at most 24 points and simplices up to dimension 3,
 * each birth found by enumerating every candidate minimizer of a planar
 * convex problem in long double. Dimension 3 holds the whole nerve for
 * generic input; dimension 2 suffices for H0, H1 and their inclusion maps.
 * Cell membership uses a relative tolerance of 1e-12 after the input is
 * translated and scaled to unit size.
 *
 * There is no `coupledAlphaPersistence`: the whole complex has the
 * homotopy type of the union of all the balls (the diagram of the planar
 * alpha complex of all the points), and its use is the inclusion of the
 * survivors' subcomplex, which {@link persistence} of either complex does
 * not give.
 */
export function coupledAlphaComplex(points_, opts) {
    module();
    const o = options(opts, 'opts');
    const n = points(points_, 'points', { dims: [2] });
    if (n > 24)
        throw new RangeError(`points must hold at most 24 points, got ${n}`);
    const colors = o.colors;
    if (colors === null || typeof colors !== 'object' || typeof colors.length !== 'number') {
        throw new TypeError(`colors must be an array of 0s and 1s, got ${kind(colors)}`);
    }
    sized(colors.length, n, 'colors', 'one colour per point');
    const c = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        if (colors[i] !== 0 && colors[i] !== 1)
            throw new RangeError(`colors[${i}] must be 0 or 1, got ${String(colors[i])}`);
        c[i] = colors[i];
    }
    const cutoff = o.maxSquaredRadius === undefined ? Infinity : nonNegative(o.maxSquaredRadius, 'maxSquaredRadius');
    const cap = maxSimplexDim(o.maxSimplexDim, 3, 3);
    return call((m) => complexOf(m.coupledAlphaComplex2DFlat(points_.coords, c, cutoff, cap), 'squaredRadius'));
}
/**
 * The Euclidean (relaxed weak) witness complex of a point cloud (de Silva
 * and Carlsson 2004, relaxed as by Boissonnat, Guibas and Oudot 2009, on
 * squared distances): a set of landmarks is a simplex at the smallest
 * `a <= maxSquaredRelaxation` at which it and its faces are a-witnessed, a
 * witness w a-witnessing it when its squared distance to the farthest of
 * them is at most `a` more than its squared distance to the nearest other
 * landmark (scale `'squaredRelaxation'`). Landmarks are chosen by
 * deterministic farthest-point sampling; vertex ids index the landmarks in
 * selection order, not the input points. The strong witness complex is not
 * implemented.
 */
export function witnessComplex(points_, opts) {
    module();
    const o = options(opts, 'opts');
    points(points_, 'points');
    const landmarks = int(o.landmarks, 'landmarks', 1);
    const relaxation = nonNegative(o.maxSquaredRelaxation, 'maxSquaredRelaxation');
    const cap = maxSimplexDim(o.maxSimplexDim, 3);
    const { coords, d } = points_;
    return call((m) => complexOf(m.euclideanWitnessComplexFlat(coords, d, landmarks, relaxation, cap), 'squaredRelaxation'));
}
function kFoldArgs(points_, o) {
    const n = points(points_, 'points', { dims: [3] });
    const k = int(o.k, 'k', 1);
    if (n < k + 3)
        throw new RangeError(`points must hold at least k + 3 points (k = ${k}), got ${n}`);
    const max = o.maxSquaredRadius === undefined ? Infinity : positive(o.maxSquaredRadius, 'maxSquaredRadius');
    return { k, cutoff: Number.isFinite(max) ? max : 0, cap: maxSimplexDim(o.maxSimplexDim, 3) };
}
function kFoldOf(raw) {
    const flat = raw.mosaicVertices;
    const width = raw.mosaicWidth;
    const count = raw.mosaicCount;
    const offsets = raw.mosaicOffsets;
    const mosaicVertices = [];
    for (let i = 0; i < count; i++) {
        const a = offsets ? offsets[i] : i * width;
        const b = offsets ? offsets[i + 1] : a + width;
        mosaicVertices.push(Array.from(flat.subarray(a, b)));
    }
    return {
        ...complexOf(raw, 'squaredRadius'),
        mosaicVertices,
        diagnostics: {
            mosaicCells: raw.numMosaicCells,
            octahedra: raw.numOctahedra,
            topRhomboids: raw.numTopRhomboids,
            clampedCells: raw.numClampedCells,
            exactSignFallbacks: raw.numExactSignFallbacks,
            intervalAnomalies: raw.numIntervalAnomalies,
            usedExactFallback: raw.usedExactFallback,
            squaredRadiusBound: raw.squaredRadiusBound
        }
    };
}
/**
 * The k-fold cover complex of unweighted points in three dimensions: the
 * order-k Delaunay mosaic filtered by the squared radius function (scale
 * `'squaredRadius'`), the exact nerve of the k-fold cover, so its
 * persistence is the k-fold cover's (Edelsbrunner and Osang, "The
 * Multi-cover Persistence of Euclidean Balls", SoCG 2018). `k = 1` is the
 * alpha complex. The input must be genuinely three-dimensional and must not
 * repeat a point; exactly cospherical input that makes two order-k sites
 * coincide (an integer grid from `k = 2`) is refused: perturb it. The mosaic
 * is a pure function of the input.
 */
export function kFoldCoverComplex(points_, opts) {
    module();
    const { k, cutoff, cap } = kFoldArgs(points_, options(opts, 'opts'));
    return call((m) => kFoldOf(m.kFoldCoverComplexFlat(points_.coords, k, cutoff, cap)));
}
/** The persistence of {@link kFoldCoverComplex}, built and reduced in one call: homology up to `maxSimplexDim`. */
export function kFoldCoverPersistence(points_, opts) {
    module();
    const o = options(opts, 'opts');
    const { k, cutoff, cap } = kFoldArgs(points_, o);
    const f = fused(o);
    return call((m) => persistenceOf(m.kFoldCoverPipeline(points_.coords, k, cutoff, cap, f.coeff, f.complex), 'squaredRadius', f, cap, f.complex, kFoldOf));
}
/** The engine's axes ratio (`0` selects `'pca'`), after the checks of the ellipsoid functions. */
function ellipsoidArgs(points_, o) {
    points(points_, 'points', { dims: [2, 3], min: 2 });
    const neighbors = int(o.neighbors, 'neighbors', 2);
    if (o.axes === 'pca')
        return { neighbors, ratio: 0 };
    if (typeof o.axes !== 'number')
        throw new TypeError(`axes must be a number or 'pca', got ${kind(o.axes)}`);
    if (!Number.isFinite(o.axes) || o.axes < 1)
        throw new RangeError(`axes must be a finite ratio >= 1 or 'pca', got ${o.axes}`);
    return { neighbors, ratio: o.axes };
}
/**
 * The ellipsoids the two ellipsoid complexes fit at every point (the same
 * fitting, so a drawing matches the complex), for renderers that draw them.
 */
export function ellipsoids(points_, opts) {
    module();
    const { neighbors, ratio } = ellipsoidArgs(points_, options(opts, 'opts'));
    const { coords, d } = points_;
    return call((m) => {
        const input = new m.VectorDouble();
        let flat = null;
        try {
            for (let i = 0; i < coords.length; i++)
                input.push_back(coords[i]);
            flat = m.computeEllipsoidGeometry(input, d, neighbors, ratio);
            const stride = 2 * d + d * d;
            const out = [];
            for (let i = 0; i < flat.size() / stride; i++) {
                let at = i * stride;
                const center = [];
                for (let c = 0; c < d; c++)
                    center.push(flat.get(at++));
                const frame = [];
                for (let a = 0; a < d; a++) {
                    const row = [];
                    for (let c = 0; c < d; c++)
                        row.push(flat.get(at++));
                    frame.push(row);
                }
                const semiAxes = [];
                for (let c = 0; c < d; c++)
                    semiAxes.push(flat.get(at++));
                out.push({ center, frame, semiAxes });
            }
            return out;
        }
        finally {
            input.delete();
            if (flat)
                flat.delete();
        }
    });
}
/**
 * The Rips-type ellipsoid complex of points in two or three dimensions
 * (arXiv:2408.11450, Canova, Kališnik, Moser, Rieck, Žegarac): each point
 * gets an ellipsoid from a local PCA frame, an edge appears when two
 * ellipsoids first touch, and higher simplices come from flag expansion. A
 * flag complex, as the paper builds it (Definition 2.2), not a nerve. Values
 * are twice the birth radius, on the Rips scale (`'edgeLength'`), so
 * `axes: 1` (balls) reproduces {@link ripsComplex}.
 */
export function ellipsoidRipsComplex(points_, opts) {
    module();
    const o = options(opts, 'opts');
    const { neighbors, ratio } = ellipsoidArgs(points_, o);
    const cutoff = o.maxEdgeLength === undefined ? 0 : positive(o.maxEdgeLength, 'maxEdgeLength');
    const cap = maxSimplexDim(o.maxSimplexDim, 2);
    const { coords, d } = points_;
    return call((m) => complexOf(m.ellipsoidRipsComplexFlat(coords, d, neighbors, ratio, cap, cutoff), 'edgeLength'));
}
/** The persistence of {@link ellipsoidRipsComplex}, built and reduced in one call: homology up to `maxSimplexDim`. */
export function ellipsoidRipsPersistence(points_, opts) {
    module();
    const o = options(opts, 'opts');
    const { neighbors, ratio } = ellipsoidArgs(points_, o);
    const cutoff = o.maxEdgeLength === undefined ? 0 : positive(o.maxEdgeLength, 'maxEdgeLength');
    const cap = maxSimplexDim(o.maxSimplexDim, 2);
    const f = fused(o);
    const { coords, d } = points_;
    return call((m) => persistenceOf(m.ellipsoidRipsPipeline(coords, d, neighbors, ratio, cap, cutoff, f.coeff, f.complex), 'edgeLength', f, cap, f.complex, (raw) => complexOf(raw, 'edgeLength')));
}
/**
 * The ellipsoidal Čech complex, a nerve (arXiv:2606.01548, Giunti, Hill,
 * Ye): the ellipsoids of {@link ellipsoidRipsComplex}, but a simplex enters
 * only when the ellipsoids of all its vertices share a point, at the
 * smallest radius at which they do (scale `'radius'`). The ellipsoids are
 * convex, so the cover is good and the nerve lemma applies: its persistence
 * is the persistence of the growing union of ellipsoids. It is a subcomplex
 * of {@link ellipsoidRipsComplex} on the same input, each shared simplex
 * born no earlier here (at half the value, on the radius scale), and
 * `axes: 1` reproduces {@link cechComplex}.
 */
export function ellipsoidCechComplex(points_, opts) {
    module();
    const o = options(opts, 'opts');
    const { neighbors, ratio } = ellipsoidArgs(points_, o);
    const cutoff = o.maxRadius === undefined ? 0 : positive(o.maxRadius, 'maxRadius');
    const cap = maxSimplexDim(o.maxSimplexDim, 2);
    const { coords, d } = points_;
    return call((m) => complexOf(m.ellipsoidCechComplexFlat(coords, d, neighbors, ratio, cap, cutoff), 'radius'));
}
/** The persistence of {@link ellipsoidCechComplex}, built and reduced in one call: homology up to `maxSimplexDim`. */
export function ellipsoidCechPersistence(points_, opts) {
    module();
    const o = options(opts, 'opts');
    const { neighbors, ratio } = ellipsoidArgs(points_, o);
    const cutoff = o.maxRadius === undefined ? 0 : positive(o.maxRadius, 'maxRadius');
    const cap = maxSimplexDim(o.maxSimplexDim, 2);
    const f = fused(o);
    const { coords, d } = points_;
    return call((m) => persistenceOf(m.ellipsoidCechPipeline(coords, d, neighbors, ratio, cap, cutoff, f.coeff, f.complex), 'radius', f, cap, f.complex, (raw) => complexOf(raw, 'radius')));
}
/** The engine's `normals` (`[k]` or the 2n normals), after the checks of the wing functions. */
function wingArgs(points_, o) {
    const n = points(points_, 'points', { dims: [2], min: 2 });
    const q = num(o.q, 'q');
    if (!(q >= 0 && q <= 1))
        throw new RangeError(`q must lie in [0, 1], got ${q}`);
    const theta = num(o.theta, 'theta');
    if (!(theta > 0 && theta <= Math.PI / 2))
        throw new RangeError(`theta must lie in (0, π/2], got ${theta}`);
    if (typeof o.normals === 'number')
        return { q, theta, normals: Float64Array.of(int(o.normals, 'normals', 2)) };
    if (o.normals === undefined)
        throw new TypeError('normals must be a neighbour count or the unit normals, got undefined');
    const normals = numbers(o.normals, 'normals');
    sized(normals.length, 2 * n, 'normals', 'two coordinates per point');
    allFinite(normals, 'normals');
    return { q, theta, normals };
}
const WING_NORMAL_SOURCES = ['supplied', 'osculating', 'tangent', 'isolated'];
/** The wings {@link wingComplex} builds, for renderers that draw them. */
export function wings(points_, opts) {
    module();
    const { q, theta, normals } = wingArgs(points_, options(opts, 'opts'));
    const coords = points_.coords;
    return call((m) => {
        const input = new m.VectorDouble();
        const normalsIn = new m.VectorDouble();
        let flat = null;
        try {
            for (let i = 0; i < coords.length; i++)
                input.push_back(coords[i]);
            for (let i = 0; i < normals.length; i++)
                normalsIn.push_back(normals[i]);
            flat = m.computeWingGeometry(input, q, theta, normalsIn);
            const stride = 19;
            const out = [];
            for (let i = 0; i < flat.size() / stride; i++) {
                let at = i * stride;
                const point = [flat.get(at++), flat.get(at++)];
                const normal = [flat.get(at++), flat.get(at++)];
                const code = flat.get(at++);
                const normalSource = WING_NORMAL_SOURCES[code];
                if (normalSource === undefined)
                    throw new Error(`unknown normal provenance code ${code}`);
                const curvatureRadius = flat.get(at++);
                const neighborhoodScale = flat.get(at++);
                const outline = [];
                for (let v = 0; v < 6; v++)
                    outline.push([flat.get(at++), flat.get(at++)]);
                out.push({ point, normal, normalSource, curvatureRadius, neighborhoodScale, outline });
            }
            return out;
        }
        finally {
            input.delete();
            normalsIn.delete();
            if (flat)
                flat.delete();
        }
    });
}
/**
 * The curvature-adaptive wing complex of a planar point cloud, a flag
 * complex (not a nerve), written from Weng and Zhao, AIMS Mathematics
 * 11(1):785–809, 2026 (no reference implementation is available). Pair
 * births are analytic; the 1-skeleton is expanded to a flag complex by the
 * Rust core. Values on the wing scale ε (`'epsilon'`).
 */
export function wingComplex(points_, opts) {
    module();
    const o = options(opts, 'opts');
    const { q, theta, normals } = wingArgs(points_, o);
    const maxEpsilon = o.maxEpsilon === undefined ? Infinity : positive(o.maxEpsilon, 'maxEpsilon');
    const cap = maxSimplexDim(o.maxSimplexDim, 3);
    return call((m) => complexOf(m.wingComplexFlat(points_.coords, q, theta, normals, cap, maxEpsilon), 'epsilon'));
}
/** The persistence of {@link wingComplex}, built and reduced in one call: homology up to `maxSimplexDim`. */
export function wingPersistence(points_, opts) {
    module();
    const o = options(opts, 'opts');
    const { q, theta, normals } = wingArgs(points_, o);
    const maxEpsilon = o.maxEpsilon === undefined ? Infinity : positive(o.maxEpsilon, 'maxEpsilon');
    const cap = maxSimplexDim(o.maxSimplexDim, 3);
    const f = fused(o);
    return call((m) => persistenceOf(m.wingPipeline(points_.coords, q, theta, normals, cap, maxEpsilon, f.coeff, f.complex), 'epsilon', f, cap, f.complex, (raw) => complexOf(raw, 'epsilon')));
}
function boxArgs(points_, o) {
    points(points_, 'points', { dims: [2, 3] });
    const stepSize = finite(o.stepSize, 'stepSize');
    if (!(stepSize > 0))
        throw new RangeError(`stepSize must be positive, got ${stepSize}`);
    const growth = num(o.growth, 'growth');
    if (!(growth >= 0 && growth <= 1))
        throw new RangeError(`growth must lie in [0, 1], got ${growth}`);
    // 0 is the engine's "the paper's m"
    const maxSteps = o.maxSteps === undefined ? 0 : int(o.maxSteps, 'maxSteps', 1);
    return { stepSize, growth, maxSteps, cap: maxSimplexDim(o.maxSimplexDim, 3), boxes: boolOption(o.boxes, 'boxes', false) };
}
function boxOf(d, withBoxes) {
    return (raw) => {
        let boxes;
        if (withBoxes) {
            const extents = raw.boxExtents;
            boxes = [];
            let at = 0;
            for (let step = 0; step <= raw.numSteps; step++) {
                const perStep = [];
                for (let box = 0; box < raw.numBoxes; box++) {
                    const lower = Array.from(extents.subarray(at, at + d));
                    const upper = Array.from(extents.subarray(at + d, at + 2 * d));
                    at += 2 * d;
                    perStep.push({ lower, upper });
                }
                boxes.push(perStep);
            }
        }
        return {
            ...complexOf(raw, 'growthRadius'),
            numSteps: raw.numSteps,
            stepSize: raw.stepSize,
            growth: raw.alpha,
            maxBirthStep: raw.maxBirthStep,
            numEdges: raw.numEdges,
            ...(boxes !== undefined ? { boxes } : {}),
            diagnostics: {
                expansions: raw.numExpansions,
                descentSteps: raw.numDescentSteps,
                iterationCapHits: raw.numIterationCapHits
            }
        };
    };
}
/**
 * The box filtration of points in two or three dimensions, a nerve
 * (Alvarado, Gupta and Krishnamoorthy, arXiv:2404.05859): every point starts
 * as a degenerate box and grows, a step at a time, inside the ℓ∞ ball of
 * radius `j · stepSize` around itself (scale `'growthRadius'`), following
 * the paper's rule: growth is worth taking when it covers other points (each
 * worth `growth`) for less than it costs in added width (each unit worth
 * `1 − growth`). Simplices are born when their boxes first intersect; boxes
 * have the Helly property, so the flag complex of the intersection graph is
 * the nerve and the nerve theorem applies.
 *
 * Every value is a multiple of `stepSize`: compare diagrams only at equal
 * `stepSize`. Deterministic, bit for bit: the steps are integer and the
 * intersection tests exact. Duplicate, collinear and coincident points are
 * accepted.
 */
export function boxFiltration(points_, opts) {
    module();
    const a = boxArgs(points_, options(opts, 'opts'));
    const { coords, d } = points_;
    return call((m) => boxOf(d, a.boxes)(m.boxFiltrationFlat(coords, d, a.stepSize, a.growth, a.maxSteps, a.cap, a.boxes)));
}
/** The persistence of {@link boxFiltration}, built and reduced in one call: homology up to `maxSimplexDim`. */
export function boxFiltrationPersistence(points_, opts) {
    module();
    const o = options(opts, 'opts');
    const a = boxArgs(points_, o);
    const f = fused(o);
    const { coords, d } = points_;
    return call((m) => persistenceOf(m.boxFiltrationPipeline(coords, d, a.stepSize, a.growth, a.maxSteps, a.cap, a.boxes, f.coeff, f.complex), 'growthRadius', f, a.cap, f.complex, boxOf(d, a.boxes)));
}
// ---------------------------------------------------------------------------
// Cubical
// ---------------------------------------------------------------------------
/** The grid's extents, fastest axis first (the engine's order), after its checks. */
export function gridArgs(v, name) {
    if (v === null || typeof v !== 'object') {
        throw new TypeError(`${name} must be { values: Float64Array, shape: number[] }, got ${kind(v)}`);
    }
    const { values, shape } = v;
    if (!(values instanceof Float64Array))
        throw new TypeError(`${name}.values must be a Float64Array, got ${kind(values)}`);
    if (!Array.isArray(shape))
        throw new TypeError(`${name}.shape must be an array of positive integers, got ${kind(shape)}`);
    if (shape.length === 0 || shape.length > 16) {
        throw new RangeError(`${name}.shape must have from 1 to 16 axes, got ${shape.length}`);
    }
    let size = 1;
    for (let i = 0; i < shape.length; i++) {
        u32(shape[i], `${name}.shape[${i}]`, 1);
        size *= shape[i];
    }
    sized(values.length, size, `${name}.values`, 'one value per cell of the shape');
    allFinite(values, `${name}.values`);
    return [...shape].reverse();
}
/**
 * Every cell of the cubical complex of an image or a volume, T-construction
 * (each value on a top-dimensional cell, every lower cell at the smallest
 * value of the top cells containing it), by the Rust core: the cells, values
 * and order of GUDHI's `Bitmap_cubical_complex`.
 */
export function cubicalComplex(image) {
    module();
    const extents = gridArgs(image, 'image');
    return call((m) => {
        const raw = m.cubicalComplexFlat(extents, image.values);
        return { shape: [...image.shape], cells: raw.cells, dims: raw.dimensions, filtrations: raw.filtrations, scale: 'value' };
    });
}
