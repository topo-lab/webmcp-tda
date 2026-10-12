import type { PointCloud } from './check.js';
import type { RipsRepresentatives, VolumeOptimalCycles } from './persistence.js';
import type { Complex, ComplexLike, Scale, Simplex } from './types.js';
/**
 * A point cloud from one array of coordinates per point. Every row must have
 * the same positive length `d`.
 */
export declare function pointCloud(rows: ArrayLike<ArrayLike<number>>): PointCloud;
/** One volume-optimal cycle as an object (what {@link materialize} builds from {@link VolumeOptimalCycles}). */
export interface VolumeOptimalCycle {
    /** The homology dimension. */
    dim: number;
    birth: number;
    death: number;
    /** The cycle's distinct vertices, sorted. */
    cycleVertices: number[];
    /** The `dim`-simplices of the cycle, the boundary of the volume, each one's vertices increasing. */
    cycleSimplices: number[][];
    /** The `(dim + 1)`-simplices of the optimal volume, each one's vertices increasing. */
    volumeSimplices: number[][];
    /** Whether the merge tree had an answer for the pair. */
    found: boolean;
}
/** One representative of a Rips pair as an object (what {@link materialize} builds from {@link RipsRepresentatives}). */
export interface RipsRepresentative {
    /** The homology dimension. */
    dim: number;
    /** The index of the pair within the pairs of its dimension. */
    pairIndex: number;
    birth: number;
    death: number;
    /** The simplices, each `dim + 1` vertex indices into the input, ascending. */
    simplices: number[][];
    /** The coefficient of each simplex, aligned with `simplices`. */
    coefficients: number[];
    /** The distinct vertices the simplices touch, sorted. */
    vertices: number[];
}
/**
 * Objects from typed arrays, built only when asked for, for drawing small
 * results: a complex as `{ vertices, filtration }[]` (same order, same
 * vertex order); volume-optimal cycles as {@link VolumeOptimalCycle}[]; Rips
 * representatives as {@link RipsRepresentative}[].
 */
export declare function materialize(complex: ComplexLike): Simplex[];
export declare function materialize(cycles: VolumeOptimalCycles): VolumeOptimalCycle[];
export declare function materialize(representatives: RipsRepresentatives): RipsRepresentative[];
/**
 * A `{ vertices, filtration }[]` list as a {@link Complex} (same order of
 * the simplices, each simplex's vertices sorted increasing), on `scale`
 * (default `'value'`): the inverse of {@link materialize} on a complex, for
 * handing object lists to the functions that take a complex. Vertex ids must
 * be integers that fit 32 bits, distinct within a simplex, and values
 * numbers; anything else is refused rather than truncated.
 */
export declare function flatten(simplices: Simplex[], scale?: Scale): Complex;
