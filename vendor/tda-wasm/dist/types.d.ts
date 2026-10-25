/**
 * The plain data the package takes and returns. Every result is a plain
 * object of typed arrays, numbers, strings, booleans and arrays of them, so
 * it survives `postMessage` and `structuredClone` whole; no result has
 * methods.
 */
import type { PointCloud } from './check.js';
export type { PointCloud };
/**
 * The quantity a filtration's values measure, carried by every complex and
 * diagram.
 *
 * - `'edgeLength'`: an edge length, twice a ball radius (Rips, ellipsoid
 *   Rips; cutoff `maxEdgeLength`);
 * - `'radius'`: the radius of a ball (Čech, Delaunay–Čech, ellipsoid Čech;
 *   cutoff `maxRadius`);
 * - `'squaredRadius'`: a squared radius, negative at weighted vertices
 *   (alpha, coupled alpha, k-fold cover; cutoff `maxSquaredRadius`);
 * - `'squaredRelaxation'`: the relaxation of the witness complex, a squared
 *   length (cutoff `maxSquaredRelaxation`);
 * - `'epsilon'`: the wing length ε (wing complex; cutoff `maxEpsilon`);
 * - `'growthRadius'`: the ℓ∞ radius `j · stepSize` within which the boxes of
 *   the box filtration grow (cutoffs `stepSize`, `maxSteps`);
 * - `'value'`: the caller's own values (cubical complexes, a complex the
 *   caller builds, zigzag operations).
 */
export type Scale = 'edgeLength' | 'radius' | 'squaredRadius' | 'squaredRelaxation' | 'epsilon' | 'growthRadius' | 'value';
/** A dense `n × n` distance matrix, row-major; only the strict lower triangle (`distances[i·n + j]`, `i > j`) is read. */
export interface DistanceMatrix {
    /** The `n²` distances, row-major. */
    distances: Float64Array;
}
/**
 * An image or a volume: `values` row-major in NumPy's order, the last axis
 * fastest. A `height × width` image is `shape: [height, width]`, its pixel
 * `(row, column)` at `values[row · width + column]`, as in `ImageData`.
 */
export interface Grid {
    /** The values, row-major (length the product of `shape`). */
    values: Float64Array;
    /** The extent of each axis, slowest first. */
    shape: number[];
}
/**
 * A filtered simplicial complex as three typed arrays (CSR): simplex `i` is
 * `vertices[offsets[i] .. offsets[i + 1])`, its vertex ids in increasing
 * order, entered at `filtrations[i]`.
 *
 * Every builder lists its simplices in one documented order: by value
 * (`-0` equal to `+0`), then by dimension, then lexicographically on the
 * increasing vertex lists (as Python sorts lists). Values never decrease,
 * and every face comes before its cofaces. One exception: where the input's
 * ties are not exact in double precision the full Čech complex can carry a
 * face one ulp above a coface; it is listed by its values as built.
 *
 * A function that takes simplices (`persistence`, `volumeOptimalCycles`,
 * `flatten`, the ladder filtrations) accepts each simplex's vertices in any
 * order and sorts them; a vertex listed twice in one simplex is refused with
 * a `RangeError`.
 */
export interface Complex {
    /** Concatenated vertex ids of every simplex (increasing within a simplex). */
    vertices: Int32Array;
    /** Length `count + 1`; simplex `i` is `vertices[offsets[i] .. offsets[i + 1])`. */
    offsets: Uint32Array;
    /** The value at which simplex `i` enters. */
    filtrations: Float64Array;
    /** The quantity the values measure. */
    scale: Scale;
}
/**
 * What the functions that take a complex accept: a {@link Complex}, or the
 * same three arrays as number arrays (converted, with integer checks), with
 * or without `scale`.
 */
export interface ComplexLike {
    vertices: ArrayLike<number>;
    offsets: ArrayLike<number>;
    filtrations: ArrayLike<number>;
    scale?: Scale;
}
/** One simplex as an object (what {@link materialize} builds from a {@link Complex}). */
export interface Simplex {
    /** Vertex ids, increasing in what the package returns; any order in what it takes. */
    vertices: number[];
    /** The value at which the simplex enters. */
    filtration: number;
}
/**
 * Every cell of a T-construction cubical complex, in the order (value, then
 * cell dimension, then bitmap position).
 */
export interface CubicalComplex {
    /** The grid's shape (the input's, slowest axis first). */
    shape: number[];
    /**
     * Position of each cell in the bitmap, the grid of `2 · shape[i] + 1`
     * positions along axis `i`, numbered row-major (the last axis fastest): a
     * cell's coordinate is odd along the axes it spans, and the pixel at
     * `(p0, p1, …)` is the cell at `(2 p0 + 1, 2 p1 + 1, …)`.
     */
    cells: Uint32Array;
    /** The dimension of each cell (the number of its odd coordinates). */
    dims: Uint8Array;
    /** The value of each cell: the smallest value of the pixels containing it. */
    filtrations: Float64Array;
    /** Always `'value'`: the image's own values. */
    scale: 'value';
}
/**
 * A persistence diagram. `pairs[k]` lists the classes of `H_k` as
 * `[birth, death, birth, death, …]`, essential classes with
 * `death = Infinity`, one array per homology dimension from 0 to the highest
 * the call computes (empty arrays included). Pairs of length zero are left
 * out, and with the `minPersistence` option every finite pair with
 * `death − birth <= minPersistence`.
 */
export interface Diagram {
    /** `pairs[k]`: the pairs of `H_k`, `[birth, death, …]`. */
    pairs: Float64Array[];
    /** The quantity the values measure. */
    scale: Scale;
    /** The coefficient field `Z/coeff` the diagram was computed over. */
    coeff: number;
}
/** The result of a builder's `…Persistence` function: the diagram, and with `complex: true` the complex it was computed from. */
export interface BuilderPersistence<C extends Complex = Complex> extends Diagram {
    /** The complex, as the builder returns it; present only with `complex: true`. */
    complex?: C;
}
/** Options every builder's `…Persistence` function takes beside the builder's own. */
export interface BuilderPersistenceOptions {
    /** The prime `p` of the coefficient field `Z/p`, from 2 to `2^31 − 1`. Default 2. */
    coeff?: number;
    /** Also return the complex, as the builder returns it. Default `false`. */
    complex?: boolean;
    /**
     * Leave out the finite pairs with `death − birth <= minPersistence`
     * (GUDHI's `min_persistence`); essential pairs are always kept. A finite
     * number `>= 0`. Default 0: only the pairs of length zero are left out.
     * `1e-12` removes the bars one ulp long that rounding leaves on symmetric
     * input such as a lattice.
     */
    minPersistence?: number;
}
