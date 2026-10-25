import type { Vec } from './check.js';
import type { Diagram } from './types.js';
/**
 * The Betti numbers at `t`, read off the diagram: entry `k` is the number of
 * pairs of `H_k` with `birth <= t < death`, an essential class (death
 * `Infinity`) counted at every `t >= birth`, `t = Infinity` included: the
 * rank of `H_k` of the complex of the simplices valued `<= t`. One entry per
 * dimension of the diagram. Computed by the Rust core
 * (rust/tda-core/src/representations/betti.rs), by binary search in each
 * dimension's sorted births and finite deaths.
 */
export declare function bettiNumbers(diagram: Diagram, t: number): Uint32Array;
/**
 * The Betti curves on `grid` (any order, no NaN): `curves[k][i]` is
 * `bettiNumbers(diagram, grid[i])[k]`. One curve per dimension of the
 * diagram, by binary search in the sorted births and deaths (the Rust core,
 * as {@link bettiNumbers}).
 */
export declare function bettiCurve(diagram: Diagram, grid: Vec): Uint32Array[];
/** Options of {@link persistenceLandscape}. */
export interface PersistenceLandscapeOptions {
    /** The points at which to evaluate, finite, any order. Required. */
    grid: Vec;
    /** How many landscape functions, λ₁ … λ_layers, a positive integer (`layers · grid.length` at most 2^27). Default 1. */
    layers?: number;
}
/**
 * The persistence landscape of one dimension's pairs `[birth, death, …]`:
 * `λ_k(t)` is the k-th largest of `max(0, min(t − birth, death − t))` over
 * the finite pairs, counted with multiplicity (0 when fewer than k pairs hold
 * `t` strictly inside). Essential pairs carry no tent. Returns `layers`
 * arrays, `landscape[k − 1][i] = λ_k(grid[i])`. Each value is one tent
 * evaluated as `min(t − birth, death − t)` (the Rust core,
 * rust/tda-core/src/representations/landscape.rs), so the result does not
 * depend on how the work is ordered.
 */
export declare function persistenceLandscape(pairs: Vec, opts: PersistenceLandscapeOptions): Float64Array[];
/** The region of the (birth, persistence) plane a persistence image covers. */
export interface ImageBounds {
    birthMin: number;
    birthMax: number;
    persMin: number;
    persMax: number;
}
/** Options of {@link persistenceImage}. */
export interface PersistenceImageOptions {
    /** Pixels: `n` for `n × n`, or `[rows, columns]`, NumPy's order (rows along persistence, columns along birth); at most 2^27 pixels. Required. */
    resolution: number | [number, number];
    /** The region covered, or `'auto'` (default): the finite pairs' births and persistences padded by 10 %, persistence from 0. */
    bounds?: 'auto' | ImageBounds;
    /** The standard deviation of the Gaussian at each pair, positive and finite. Default 0.1. */
    sigma?: number;
    /** A pair weighs `persistence^weightPower`, finite. Default 1. */
    weightPower?: number;
}
/** A persistence image: the pixel values row-major, `shape: [rows, columns]`, and the region covered. */
export interface PersistenceImage {
    /** Row-major: row `r` at persistence `persMin + (r + ½)·(persMax − persMin)/rows` (row 0 the lowest), column `c` at birth `birthMin + (c + ½)·(birthMax − birthMin)/columns`. */
    values: Float64Array;
    /** `[rows, columns]`. */
    shape: [number, number];
    bounds: ImageBounds;
}
/**
 * The persistence image of one dimension's pairs (Adams et al., JMLR 18,
 * 2017): each finite pair with `death > birth` adds `persistence^weightPower`
 * times a Gaussian of standard deviation `sigma` centred at
 * `(birth, persistence)`, evaluated at the pixel centres (the Rust core,
 * rust/tda-core/src/representations/image.rs; each pixel's terms are added
 * in the order of the pairs, as the C++ it replaced did). The result is a
 * {@link Grid}-shaped image (it can be fed to {@link cubicalPersistence}).
 */
export declare function persistenceImage(pairs: Vec, opts: PersistenceImageOptions): PersistenceImage;
/** Options of {@link diagramWasserstein}. */
export interface DiagramWassersteinOptions {
    /** The Wasserstein order q, finite and ≥ 1. Required: GUDHI defaults to 1, Dionysus and giotto-tda to 2. */
    order: number;
    /** The ground metric `L_p` between points, ≥ 1 or `Infinity`. Default `Infinity` (GUDHI's). */
    internalP?: number;
}
/** Result of the diagram distances. */
export interface DiagramMatching {
    /** The distance; `Infinity` when the essential parts cannot be matched. */
    distance: number;
    /** Matched pairs as `[i0, j0, i1, j1, …]` (indices of points of `D` and `E`), `-1` for the diagonal. Empty when `distance` is `Infinity`. */
    matching: Int32Array;
}
/**
 * Dense finite-point costs are limited to 16,777,216 entries (128 MiB);
 * larger requests throw `RangeError` before allocation.
 *
 * The exact Wasserstein distance of order `order` between two persistence
 * diagrams of one homology dimension, each a flat `[birth, death, …]`
 * array. Essential points (`death = Infinity`) are matched among their own
 * kind by their finite coordinate; differing counts give `Infinity` (as
 * GUDHI and Hera).
 */
export declare function diagramWasserstein(D: Vec, E: Vec, opts: DiagramWassersteinOptions): DiagramMatching;
/** The exact bottleneck distance (L∞ ground metric) between two persistence diagrams of one homology dimension, with an optimal matching. */
export declare function diagramBottleneck(D: Vec, E: Vec): DiagramMatching;
