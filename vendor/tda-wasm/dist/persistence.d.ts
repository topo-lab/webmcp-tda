import type { PointCloud } from './check.js';
import type { ComplexLike, Diagram, DistanceMatrix, Grid, Scale } from './types.js';
/**
 * A complex argument as the typed arrays the engine reads: typed arrays of
 * the right kind pass through, plain arrays (or other typed arrays) are
 * checked (32-bit integer vertex ids, non-negative integer offsets, numbers)
 * and converted. The rest (CSR shape, closure, monotonicity, NaN) the Rust
 * core checks, naming the simplex.
 */
export declare function complexArgs(v: unknown, name: string): {
    vertices: Int32Array;
    offsets: Uint32Array;
    filtrations: Float64Array;
    scale: Scale;
    top: number;
};
/** Options of {@link persistence}. */
export interface PersistenceOptions {
    /** The prime `p` of the coefficient field `Z/p`, from 2 to `2^31 − 1`. Default 2. */
    coeff?: number;
    /**
     * Leave out the finite pairs with `death − birth <= minPersistence`
     * (GUDHI's `min_persistence`); essential pairs are always kept. A finite
     * number `>= 0`. Default 0: only the pairs of length zero are left out.
     * `1e-12` removes the bars one ulp long that rounding leaves on symmetric
     * input such as a lattice.
     */
    minPersistence?: number;
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
export declare function persistence(complex: ComplexLike, opts?: PersistenceOptions): Diagram;
/** Which representatives {@link ripsPersistence} returns, and of which dimensions. */
export interface RepresentativesOptions {
    /**
     * `'cycles'` (default): for every finite pair a cycle (simplices with zero
     * boundary, all present at the birth: for H1 the edges of a loop), from a
     * homology reduction over the death simplices. `'cocycles'`: for every
     * pair, essential ones included, the reduction column of the cohomology
     * pass (what ripser.py's `do_cocycles` returns).
     */
    kind?: 'cycles' | 'cocycles';
    /** The homology dimensions to return representatives for. Default: every dimension up to `maxDim`; `[]` returns none. */
    dims?: number[];
}
/** Options of {@link ripsPersistence}. */
export interface RipsPersistenceOptions {
    /** The highest homology dimension, an integer from 0 to 9. Default 1. */
    maxDim?: number;
    /**
     * Keep the simplices of diameter `<= maxEdgeLength`, non-negative.
     * Default `Infinity`: the filtration is cut at the enclosing radius, past
     * which every Rips complex is a cone, so no pair is lost.
     */
    maxEdgeLength?: number;
    /** The prime `p` of the coefficient field `Z/p`, from 2 to `2^31 − 1`. Default 2. */
    coeff?: number;
    /**
     * Also return a representative of every pair (`true` for the default
     * {@link RepresentativesOptions}). Default `false`. The representatives of
     * the pairs `minPersistence` leaves out are left out too.
     */
    representatives?: boolean | RepresentativesOptions;
    /**
     * Leave out the finite pairs with `death − birth <= minPersistence`
     * (GUDHI's `min_persistence`); essential pairs are always kept. A finite
     * number `>= 0`. Default 0: only the pairs of length zero are left out.
     * `1e-12` removes the bars one ulp long that rounding leaves on symmetric
     * input such as a lattice.
     */
    minPersistence?: number;
}
/**
 * The representatives of the pairs of a Rips diagram, as typed arrays
 * (`materialize()` builds the objects). Representative `i` stands for pair
 * `pairIndex[i]` of dimension `dims[i]` (the pair `pairs[dims[i]][2p]`,
 * `pairs[dims[i]][2p + 1]`); its simplices are `simplexOffsets[i] ..
 * simplexOffsets[i + 1]`, with their coefficients at the same positions of
 * `coefficients` and their vertex ids, `dims[i] + 1` per simplex, ascending
 * within a simplex (a simplex is oriented by that order), in
 * `vertices[vertexOffsets[i] .. vertexOffsets[i + 1]]`.
 *
 * Checked of every representative (test/rips_representatives.test.mjs,
 * against the input itself): a cycle has zero boundary, every simplex has
 * diameter `<= birth` and one exactly `birth`, it is not a cycle born before
 * `birth` plus a boundary before `death`, and it is a boundary at `death` up
 * to cycles born before `birth`; a cocycle has zero coboundary on every
 * simplex of diameter `< death`, non-zero coboundary on some simplex of
 * diameter `death`, and every simplex has diameter in [`birth`, `death`].
 * Representatives are not unique, nor the shortest.
 */
export interface RipsRepresentatives {
    /** The kind of representative. */
    kind: 'cycles' | 'cocycles';
    /** The homology dimension of each representative. */
    dims: Uint8Array;
    /** The index of each representative's pair within the pairs of its dimension. */
    pairIndex: Uint32Array;
    /** The birth of each representative's pair. */
    births: Float64Array;
    /** The death of each representative's pair. */
    deaths: Float64Array;
    /** Length `count + 1`: the simplices of representative `i`. */
    simplexOffsets: Uint32Array;
    /** Length `count + 1`: the vertex ids of representative `i`. */
    vertexOffsets: Uint32Array;
    /** Vertex ids (indices into the input), `dims[i] + 1` per simplex. */
    vertices: Int32Array;
    /** The coefficient of each simplex, in `(−coeff/2, coeff/2]`; always 1 over `Z/2`. */
    coefficients: Int32Array;
}
/** A Rips diagram, with the representatives when asked for. */
export interface RipsPersistence extends Diagram {
    /** Present only with `representatives`. */
    representatives?: RipsRepresentatives;
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
export declare function ripsPersistence(points_: PointCloud | DistanceMatrix, opts?: RipsPersistenceOptions): RipsPersistence;
/** Options of {@link cubicalPersistence}. */
export interface CubicalPersistenceOptions {
    /**
     * `'T'` (default): each value sits on a top-dimensional cell (pixel,
     * voxel) and every lower cell enters at the smallest value among the top
     * cells containing it. `'V'` (2-D only): each value sits on a vertex and
     * every cell enters at the largest value among its vertices. The names of
     * Garin et al. 2020 and CubicalRipser.
     */
    construction?: 'T' | 'V';
    /** The prime `p` of the coefficient field `Z/p`, from 2 to `2^31 − 1`. Default 2. */
    coeff?: number;
    /**
     * Leave out the finite pairs with `death − birth <= minPersistence`
     * (GUDHI's `min_persistence`); essential pairs are always kept. A finite
     * number `>= 0`. Default 0: only the pairs of length zero are left out.
     * `1e-12` removes the bars one ulp long that rounding leaves on symmetric
     * input such as a lattice.
     */
    minPersistence?: number;
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
export declare function cubicalPersistence(image: Grid, opts?: CubicalPersistenceOptions): Diagram;
/** An insertion of a cell into a zigzag (made by {@link insertOp}). */
export interface InsertOp {
    type: 'insert';
    /** The cell's id, a 32-bit integer. */
    cell: number;
    /** The ids of the cell's faces one dimension down, in the complex at that moment (empty for a vertex). */
    boundary: number[];
    /** The cell's dimension. */
    dim: number;
    /** The operation's value; when every operation has one, the diagram is on these values too. */
    value?: number;
}
/** A removal of a cell from a zigzag (made by {@link removeOp}). */
export interface RemoveOp {
    type: 'remove';
    /** The cell's id. */
    cell: number;
    /** The operation's value; when every operation has one, the diagram is on these values too. */
    value?: number;
}
/** One operation of a zigzag. */
export type ZigzagOp = InsertOp | RemoveOp;
/** Insert cell `cell` of dimension `dim` with faces `boundary`, at `value` if given. */
export declare function insertOp(cell: number, boundary: number[], dim: number, value?: number): InsertOp;
/** Remove cell `cell`, at `value` if given. */
export declare function removeOp(cell: number, value?: number): RemoveOp;
/** Packed zigzag operations, without one JavaScript object per operation.
 * Each record is `[kind, cell, dim, value, boundaryLength, ...boundary]`.
 * `kind` is 0 for insertion, 1 for removal; removals use dim=0 and no boundary.
 * Set withValues when the value column supplies the monotone operation values.
 * The engine validates the same cell-complex and value rules as object input.
 */
export interface PackedZigzag {
    records: Float64Array;
    withValues?: boolean;
}
/** Options of {@link zigzagPersistence}. */
export interface ZigzagPersistenceOptions {
    /**
     * Leave out the finite bars with `death − birth <= minPersistence`,
     * measured in the units the bars are reported in (GUDHI's
     * `min_persistence`); bars alive after the last operation are always
     * kept. When every operation has a value, the bars of `pairs` are measured
     * on those values and `indexPairs` keeps every bar; otherwise the bars of
     * `indexPairs` are measured in operations (a bar is at least one operation
     * long, so `1` leaves out the bars that last one operation). A finite
     * number `>= 0`. Default 0: nothing more is left out.
     */
    minPersistence?: number;
}
/** The diagram of a zigzag. */
export interface ZigzagPersistence {
    /**
     * `indexPairs[k]`: the bars of `H_k` on operation indices,
     * `[birth, death, …]`: the class exists after operation `birth` and no
     * longer after operation `death`, `Infinity` when it is alive after the
     * last operation. In no particular order. Without values, the bars no
     * longer than `minPersistence` operations are left out.
     */
    indexPairs: Float64Array[];
    /**
     * `pairs[k]`, present when every operation has a value: the bars of `H_k`
     * on those values, each endpoint the value of its operation (copied
     * through), `Infinity` for a class alive after the last operation; on
     * non-increasing values the two endpoints are swapped so that
     * birth <= death, and a bar between two operations of one value (length
     * zero) is left out, as is a bar no longer than `minPersistence`.
     */
    pairs?: Float64Array[];
    /** Always `'value'`. */
    scale: 'value';
    /** Always 2: zigzag persistence is computed over Z/2. */
    coeff: 2;
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
export declare function zigzagPersistence(ops: ZigzagOp[] | PackedZigzag, opts?: ZigzagPersistenceOptions): ZigzagPersistence;
/**
 * Volume-optimal cycles as typed arrays (`materialize()` builds the
 * objects). Result `r` is the pair `(births[r], deaths[r])` of `H_dim`; its
 * volume is the `(dim + 1)`-simplices in rows `volumeOffsets[r] ..
 * volumeOffsets[r + 1]` of `volumeVertices` (`dim + 2` vertex ids a row,
 * increasing), its boundary, the cycle, the `dim`-simplices in rows
 * `boundaryOffsets[r] .. boundaryOffsets[r + 1]` of `boundaryVertices`
 * (`dim + 1` ids a row, increasing),
 * and the cycle's distinct vertices `cycleVertices[cycleVertexOffsets[r] ..
 * cycleVertexOffsets[r + 1]]`, sorted. `found[r]` is 0 when the merge tree
 * has no answer for the pair; its lists are then empty.
 */
export interface VolumeOptimalCycles {
    /** The homology dimension of every result (the ambient dimension minus one). */
    dim: number;
    births: Float64Array;
    deaths: Float64Array;
    found: Uint8Array;
    /** Length `count + 1`, in rows (simplices). */
    volumeOffsets: Uint32Array;
    volumeVertices: Int32Array;
    /** Length `count + 1`, in rows (simplices). */
    boundaryOffsets: Uint32Array;
    boundaryVertices: Int32Array;
    /** Length `count + 1`. */
    cycleVertexOffsets: Uint32Array;
    cycleVertices: Int32Array;
}
/** Options of {@link volumeOptimalCycles}. */
export interface VolumeOptimalCyclesOptions {
    /** The homology dimension `n − 1` of a triangulation of a convex domain in R^n, a non-negative integer. Required. */
    dim: number;
    /** One finite pair `[birth, death]`: find its cycle only. Default: every finite pair. */
    pair?: [number, number];
    /**
     * Without `pair`, leave out the pairs with `death − birth <=
     * minPersistence` and their cycles (GUDHI's `min_persistence`); `pair`
     * itself is always answered. A finite number `>= 0`. Default 0.
     */
    minPersistence?: number;
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
export declare function volumeOptimalCycles(complex: ComplexLike, opts: VolumeOptimalCyclesOptions): VolumeOptimalCycles;
