/**
 * Core type definitions for tda-wasm.
 *
 * Shared across modules. Rips complexes reuse `AlphaComplexResult`; the
 * default Rips methods are backed by GUDHI `Rips_complex`.
 * q-Wasserstein lives on `GudhiPersistentCohomology`; default methods use
 * Hera optimal transport and explicit `*Greedy` methods retain the legacy
 * approximation.
 */
/**
 * 3D point with a separate weight for weighted alpha complexes.
 * `weight` is a regular-triangulation weight (a squared radius), not a 4th
 * spatial coordinate.
 */
export interface Point3D {
    x: number;
    y: number;
    z: number;
    weight: number;
}
/**
 * Alias for Point3D (backwards compatibility)
 */
export interface WeightedPoint3D extends Point3D {
}
/**
 * Simplex representation with vertices and filtration value
 */
export interface Simplex {
    vertices: number[];
    filtration: number;
}
/**
 * Result from simplicial complex computation (alpha, Rips, Cech, cubical).
 * Default Rips methods use GUDHI Rips_complex; explicit Manual methods retain
 * the former simplex-tree expansion fallback.
 * Wrapper Wasserstein APIs are independent of this result type.
 */
export interface AlphaComplexResult {
    simplices: Simplex[];
    vertices: number;
    dimension: number;
    dimensionCounts: Record<number, number>;
}
/**
 * Semi-axis selection for the Rips-type ellipsoid complex.
 *
 * A number is the tangent-to-normal ratio q >= 1 of arXiv:2408.11450 §2.1, with
 * tangent dimension `dimension - 1`: the leading `dimension - 1` semi-axes have
 * length 1 and the remaining normal one has length 1/q. `'pca'` selects the
 * paper's alternative (Appendix 8.1), taking the semi-axes from the normalized
 * local singular values with a 1e-4 floor; the paper reports it performing
 * slightly worse than a fixed ratio.
 */
export type EllipsoidAxesMode = number | 'pca';
/**
 * Fitted ellipsoid geometry for one input point, for renderers that want to draw
 * the ellipsoids rather than the complex.
 *
 * At filtration value `f` the ellipsoid has semi-axes `(f / 2) * semiAxes` along
 * the corresponding rows of `frame`, because the complex's filtration values are
 * twice the birth radius.
 */
export interface EllipsoidGeometry {
    /** Ellipsoid centre: the input point itself, not the neighbourhood mean. */
    center: number[];
    /**
     * Orthonormal local frame, one row per principal axis, in descending order of
     * local variance. `frame[0]` is the dominant (tangent) direction.
     */
    frame: number[][];
    /** Semi-axis profile at unit scale: descending, `semiAxes[0] === 1`. */
    semiAxes: number[];
}
/**
 * How the unit normal α a wing was built from was obtained.
 *
 * - `'supplied'`: the caller passed it; returned normalised, nothing was fitted.
 * - `'osculating'`: osculating-circle fit on the k nearest neighbours (Eq. 3.1
 *   of Weng–Zhao 2026).
 * - `'tangent'`: degenerate path. The circle fit was singular, or its radius
 *   exceeded 1e6 times the local kNN scale, so the normal is the 90° rotation
 *   of the PCA tangent pointing away from the neighbourhood centroid. Curvature
 *   carries no usable digits at such a point.
 * - `'isolated'`: no neighbours at all, so α defaults to `+e_x` — a placeholder,
 *   not an estimate. Unreachable through `computeWingGeometry`, which requires
 *   at least 2 points.
 */
export type WingNormalSource = 'supplied' | 'osculating' | 'tangent' | 'isolated';
/**
 * One wing of the 2D wing complex, for renderers that want to draw the wings
 * rather than the complex.
 *
 * Produced by `computeWingGeometry` from the *same* normal resolution the
 * builder uses, so the drawing and the barcode can never disagree. A renderer
 * that re-estimates normals itself draws a different wing than the one whose
 * birth `computeWingComplex` recorded.
 *
 * Estimated normals (`normalSource` other than `'supplied'`) carry the failure
 * modes the source paper never addresses, because it works with exact
 * second-derivative normals:
 *
 * - **inflection**: the osculating centre jumps sides and α flips, so the wing
 *   drawn at an inflection point can point the wrong way;
 * - **normal flips**: noise can reverse a wing, amplifying rather than
 *   suppressing bottleneck bridging;
 * - **two-scale coupling**: k has to sit between the noise scale and the feature
 *   scale. `curvatureRadius / neighborhoodScale` is the ratio the |κ| clamp
 *   tests (it fires above 1e6), so it shows how close a point came to the
 *   `'tangent'` fallback.
 *
 * A wing drawn from an estimated normal is exactly as trustworthy as the birth
 * that normal produced — no more.
 */
export interface WingGeometry {
    /** The sample point x, copied through unchanged. */
    point: number[];
    /** Unit normal α (Eq. 3.1) exactly as the builder used it. */
    normal: number[];
    /** Where `normal` came from. See the failure modes above. */
    normalSource: WingNormalSource;
    /**
     * Radius of the fitted osculating circle, i.e. `1 / |κ|`. `Infinity` when no
     * usable fit exists: caller-supplied normals (nothing was fitted) or a
     * singular fit. Finite together with `normalSource === 'tangent'` means the
     * |κ| clamp fired on a fit that did succeed.
     */
    curvatureRadius: number;
    /**
     * Mean distance to the k nearest neighbours: the length scale the |κ| clamp
     * compares `curvatureRadius` against. `Infinity` for supplied normals.
     */
    neighborhoodScale: number;
    /**
     * The wing polygon at unit scale, as six offsets from `point` in outline
     * order A, B, C, D, C', B' (the concave hexagon of the source paper's
     * Eqs. 3.2–3.4). At scale ε the vertex is
     * `point[d] + eps * outline[v][d]`, so `(this record, q, theta, eps)`
     * rebuilds the exact polygon with no further estimation.
     *
     * The offsets already carry the `q` and `theta` passed to
     * `computeWingGeometry`: A/D come from the spine `±q α`, B/C/B'/C' from the
     * wing edges at ±θ to the spine on the osculating-centre side. At `q = 0` the
     * spine collapses (A = D = `point`) and the hexagon degenerates to the two
     * wing segments, which is the geometry the q=0 birth formula uses.
     */
    outline: number[][];
}
/**
 * Numerical diagnostics from the k-fold cover builder.
 *
 * `intervalAnomalies` must be 0; anything else means the rhomboid face poset
 * came out incomplete, which cannot happen for input in general position.
 */
export interface KFoldCoverDiagnostics {
    /** Cells of the order-k mosaic before octahedra are split into tetrahedra. */
    mosaicCells: number;
    /** Non-simplicial (generation-2) cells that had to be split. */
    octahedra: number;
    /** 4-rhomboids discovered by the level sweep. */
    topRhomboids: number;
    /**
     * Mosaic cells (vertices included) whose squared radius came out as
     * +Infinity because it exceeded `squaredRadiusBound`, counted over all radii
     * — including cells a `maxSquaredRadius` cutoff removed from `simplices`.
     * Near-degenerate quadruples on lattice-like input have mathematically
     * genuine but astronomically large circumspheres whose double value carries
     * no usable digits; beyond the bound the k-fold cover is already a single
     * contractible blob, so no feature is lost.
     *
     * This counts cells, not circumspheres over the bound: rhomboids of equal
     * radius come in intervals, so one over-the-bound circumsphere hands
     * +Infinity to every cell of its interval.
     */
    clampedCells: number;
    /** Orientation tests that needed exact arithmetic to decide their sign. */
    exactSignFallbacks: number;
    /** Must be 0. See above. */
    intervalAnomalies: number;
    /** 4 * (bounding-box diagonal)^2. */
    squaredRadiusBound: number;
}
/**
 * Result of `computeKFoldCoverComplex`.
 *
 * Vertex ids in `simplices` index into `mosaicVertices`, NOT into the input
 * point array: a vertex of the order-k Delaunay mosaic stands for a k-subset
 * of the input, namely the k points that are nearest to its Voronoi domain.
 */
export interface KFoldCoverResult extends AlphaComplexResult {
    /** mosaicVertices[i] is the sorted k-subset of input indices for vertex i. */
    mosaicVertices: number[][];
    diagnostics: KFoldCoverDiagnostics;
}
/**
 * Numerical diagnostics from the box filtration's growth engine.
 *
 * `iterationCapHits` must be 0. The growth objective is L-natural-convex, so
 * steepest descent reaches its optimum in finitely many moves; a non-zero
 * count means a subproblem stalled numerically and its box may be smaller
 * than the paper's rule prescribes.
 */
export interface BoxFiltrationDiagnostics {
    /** Growth subproblems solved: `numBoxes * numSteps`. */
    expansions: number;
    /** Steepest-descent moves summed over all of them; a cost measure. */
    descentSteps: number;
    /** Must be 0. See above. */
    iterationCapHits: number;
}
/**
 * The grown boxes of a box filtration, indexed by step.
 *
 * `boxes[j][i]` is box `i` at filtration value `j * stepSize`, so
 * `boxes[0]` is the degenerate pivot boxes (each `lower` equal to `upper`
 * equal to the input point) and `boxes[numSteps]` the final ones.
 */
export interface BoxExtent {
    /** Lower corner, one coordinate per dimension. */
    lower: number[];
    /** Upper corner, one coordinate per dimension. */
    upper: number[];
}
/**
 * Result of `computeBoxFiltration`.
 *
 * Vertex ids index into the input points directly: box `i` grew from point
 * `i`. Filtration values are exactly the grid `{0, stepSize, ..., numSteps *
 * stepSize}`.
 */
export interface BoxFiltrationResult extends AlphaComplexResult {
    /** m: the number of growth steps taken. */
    numSteps: number;
    /** π: the growth increment and the filtration grid spacing. */
    stepSize: number;
    /** The growth aggressiveness the boxes were grown with. */
    alpha: number;
    /** Last step at which an edge was born, i.e. the last interesting scale. */
    maxBirthStep: number;
    /** Edges in the 1-skeleton, before the dimension cap is applied. */
    numEdges: number;
    /** Present only when `includeBoxes` was set; `boxes[step][boxIndex]`. */
    boxes?: BoxExtent[][];
    diagnostics: BoxFiltrationDiagnostics;
}
/**
 * Emscripten module options for initialization
 */
export interface ModuleOptions {
    /** Custom locateFile function for WASM file loading */
    locateFile?: (path: string) => string;
    /** Pre-loaded WASM binary */
    wasmBinary?: ArrayBuffer | Uint8Array;
    /** Callback when runtime is initialized */
    onRuntimeInitialized?: () => void;
    /** Custom print function */
    print?: (text: string) => void;
    /** Custom error print function */
    printErr?: (text: string) => void;
}
/**
 * Validation error with error code and details
 */
export interface ValidationError extends Error {
    code: 'INVALID_INPUT' | 'INVALID_DIMENSIONS' | 'INVALID_WEIGHTS' | 'COMPUTATION_FAILED';
    details?: string;
}
/**
 * Legacy module interface (for backwards compatibility)
 */
export interface GudhiAlphaModule {
    computeWeightedAlphaComplex3D(coords: any): any;
}
/**
 * Validates that coordinates array has correct format for 3D weighted points.
 * Layout is [x, y, z, weight, ...] — the 4th value per point is a weight, not a 4D coordinate.
 * @param coords - Flat array [x, y, z, weight, ...]
 * @throws {ValidationError} If validation fails
 */
export declare function validateCoordinates(coords: number[]): void;
/**
 * Converts Point3D array to flat coordinate array
 * @param points - Array of 3D points with weights
 * @returns Flat array [x0, y0, z0, w0, x1, y1, z1, w1, ...]
 */
export declare function pointsToCoordinates(points: Point3D[]): number[];
/**
 * Converts flat coordinate array back to Point3D array
 * @param coords - Flat array [x0, y0, z0, w0, x1, y1, z1, w1, ...]
 * @returns Array of Point3D objects
 */
export declare function coordinatesToPoints(coords: number[]): Point3D[];
/**
 * Result from cubical complex computation
 */
export interface CubicalComplexResult {
    /** Cells with filtration values (cell_id as single-element vertex array) */
    simplices: Simplex[];
    /** Grid dimensions used */
    dimensions: number[];
    /** Total number of cells */
    totalCells: number;
}
/**
 * Validates cubical complex input dimensions and data
 * @throws {ValidationError} If validation fails
 */
export declare function validateCubicalInput(dimensions: number[], data: ArrayLike<number>): void;
/**
 * Zigzag persistence bar indexed by operation number.
 *
 * JSON ground-truth fixture (`test/ground_truth.json` zigzag_persistence) is
 * insert-only (no deletions). The API still accepts insert and remove ops.
 */
export interface ZigzagBar {
    /** Homological dimension (0=components, 1=loops, 2=voids, etc.) */
    dimension: number;
    /** Operation index when the feature was born */
    birth_index: number;
    /** Operation index when the feature died (-1 for infinite/essential features) */
    death_index: number;
}
/**
 * Filtered zigzag persistence bar indexed by filtration value
 */
export interface FilteredZigzagBar {
    /** Homological dimension (0=components, 1=loops, 2=voids, etc.) */
    dimension: number;
    /** Filtration value when the feature was born */
    birth_value: number;
    /** Filtration value when the feature died (Infinity for essential features) */
    death_value: number;
}
/**
 * Operation type for zigzag persistence
 */
export declare enum ZigzagOpType {
    INSERT = 0,
    REMOVE = 1
}
/**
 * Zigzag operation descriptor
 */
export interface ZigzagOperation {
    /** Operation type: 0 = insert, 1 = remove */
    op_type: ZigzagOpType;
    /** Unique cell identifier */
    cell_id: number;
    /** Boundary cell IDs (empty for vertices, empty for remove operations) */
    boundary: number[];
    /** Cell dimension */
    dimension: number;
    /** Filtration value (for filtered zigzag) */
    filtration: number;
}
/**
 * Result from zigzag persistence computation
 */
export interface ZigzagPersistenceResult {
    /** Persistence bars */
    bars: ZigzagBar[];
    /** Number of operations processed */
    numOperations: number;
}
/**
 * Result from filtered zigzag persistence computation
 */
export interface FilteredZigzagPersistenceResult {
    /** Persistence bars with filtration values */
    bars: FilteredZigzagBar[];
    /** Number of operations processed */
    numOperations: number;
}
/**
 * Creates an insert operation for zigzag persistence
 * @param cellId - Unique identifier for the cell
 * @param boundary - Array of cell IDs forming the boundary (empty for vertices)
 * @param dimension - Dimension of the cell (0 for vertices, 1 for edges, etc.)
 * @param filtration - Filtration value (optional, for filtered zigzag)
 */
export declare function createInsertOp(cellId: number, boundary: number[], dimension: number, filtration?: number): ZigzagOperation;
/**
 * Creates a remove operation for zigzag persistence
 * @param cellId - Identifier of the cell to remove
 * @param filtration - Filtration value (optional, for filtered zigzag)
 */
export declare function createRemoveOp(cellId: number, filtration?: number): ZigzagOperation;
/**
 * Converts zigzag operations to flat array format for WASM
 * Format: [op_type, cell_id, dimension, filtration, boundary_size, boundary...]
 */
export declare function operationsToFlat(operations: ZigzagOperation[]): number[];
/**
 * Validates zigzag operations
 * @throws {ValidationError} If validation fails
 */
export declare function validateZigzagOperations(operations: ZigzagOperation[]): void;
//# sourceMappingURL=types.d.ts.map