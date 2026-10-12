import type { PointCloud } from './check.js';
import type { Complex, CubicalComplex, DistanceMatrix, Grid, BuilderPersistence, BuilderPersistenceOptions } from './types.js';
/** The number of points of a distance matrix, after its checks. */
export declare function distanceMatrix(v: unknown, name: string): number;
/** Whether the input of a Rips function is a distance matrix, after the type check of either form. */
export declare function isMatrix(v: unknown, name: string): boolean;
/** Options of {@link ripsComplex}. */
export interface RipsComplexOptions {
    /** Largest edge kept, positive (`Infinity` keeps every pair). Required. */
    maxEdgeLength: number;
    /** Largest simplex dimension, a non-negative integer. Default 3. */
    maxSimplexDim?: number;
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
export declare function ripsComplex(points_: PointCloud | DistanceMatrix, opts: RipsComplexOptions): Complex;
/** Options of {@link cechComplex}. */
export interface CechComplexOptions {
    /** Largest radius of a smallest enclosing ball, positive (`Infinity` allowed). Required. */
    maxRadius: number;
    /** Largest simplex dimension, a non-negative integer. Default 3. */
    maxSimplexDim?: number;
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
export declare function cechComplex(points_: PointCloud, opts: CechComplexOptions): Complex;
/** Options of {@link cechPersistence}. */
export interface CechPersistenceOptions extends CechComplexOptions, BuilderPersistenceOptions {
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
export declare function cechPersistence(points_: PointCloud, opts: CechPersistenceOptions): BuilderPersistence;
/** Options of {@link delaunayCechComplex}. */
export interface DelaunayCechComplexOptions {
    /** Largest enclosing-ball radius kept, positive (`Infinity` keeps the whole triangulation). Required. */
    maxRadius: number;
    /** Largest simplex dimension, a non-negative integer. Default 3 (the triangulation has none above the point dimension). */
    maxSimplexDim?: number;
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
export declare function delaunayCechComplex(points_: PointCloud, opts: DelaunayCechComplexOptions): Complex;
/** Options of {@link alphaComplex}. */
export interface AlphaComplexOptions {
    /**
     * The weight of each point, a squared radius (finite, non-negative): the
     * regular triangulation's weight, not a coordinate. Default: all 0, the
     * unweighted alpha complex.
     */
    weights?: Float64Array | number[];
    /** Drop the simplices valued above this squared radius, positive (`Infinity` keeps all). Default `Infinity`. */
    maxSquaredRadius?: number;
}
/**
 * The (weighted) alpha complex of points in three dimensions, over Geogram's
 * regular triangulation: values are squared radii (scale `'squaredRadius'`),
 * a vertex at minus its weight. Without a cutoff, near-degenerate input can
 * end with astronomically large values for the last tetrahedra, genuine
 * values but rarely wanted; the filtration is monotone, so a cutoff leaves a
 * closed complex.
 */
export declare function alphaComplex(points_: PointCloud, opts?: AlphaComplexOptions): Complex;
/** Options of {@link alphaPersistence}. */
export interface AlphaPersistenceOptions extends AlphaComplexOptions, BuilderPersistenceOptions {
}
/** The persistence of {@link alphaComplex}, built and reduced in one call: homology up to dimension 3. */
export declare function alphaPersistence(points_: PointCloud, opts?: AlphaPersistenceOptions): BuilderPersistence;
/** Options of {@link coupledAlphaComplex}. */
export interface CoupledAlphaComplexOptions {
    /** One colour per point: 0 for a survivor, 1 for a deleted point. Required. */
    colors: ArrayLike<number>;
    /** Inclusive cutoff on the squared radius, non-negative (0 keeps the vertices and the simplices of coincident points). Default `Infinity`. */
    maxSquaredRadius?: number;
    /** Largest simplex dimension, an integer from 0 to 3. Default 3. */
    maxSimplexDim?: number;
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
export declare function coupledAlphaComplex(points_: PointCloud, opts: CoupledAlphaComplexOptions): Complex;
/** Options of {@link witnessComplex}. */
export interface WitnessComplexOptions {
    /** The number of landmarks, chosen by farthest-point sampling, a positive integer. Required. */
    landmarks: number;
    /** The largest relaxation `a` (a squared length), non-negative. Required. */
    maxSquaredRelaxation: number;
    /** Largest simplex dimension, a non-negative integer. Default 3. */
    maxSimplexDim?: number;
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
export declare function witnessComplex(points_: PointCloud, opts: WitnessComplexOptions): Complex;
/**
 * Numerical diagnostics of the k-fold cover builder. `intervalAnomalies`
 * must be 0; anything else means the rhomboid face poset came out
 * incomplete, which cannot happen for input in general position.
 */
export interface KFoldCoverDiagnostics {
    /** Cells of the order-k mosaic before octahedra are split into tetrahedra. */
    mosaicCells: number;
    /** Non-simplicial (generation-2) cells that had to be split. */
    octahedra: number;
    /** 4-rhomboids discovered by the level sweep (or by the exact enumeration, see `usedExactFallback`). */
    topRhomboids: number;
    /**
     * Mosaic cells (vertices included) whose squared radius came out as
     * `Infinity` because it exceeded `squaredRadiusBound`, counted over all
     * radii, cells a cutoff removed included. Near-degenerate quadruples on
     * lattice-like input have genuine but astronomically large circumspheres
     * whose double value carries no usable digits; beyond the bound the k-fold
     * cover is already one contractible blob, so no feature is lost.
     */
    clampedCells: number;
    /** Orientation tests that needed exact arithmetic to decide their sign. */
    exactSignFallbacks: number;
    /** Must be 0. See above. */
    intervalAnomalies: number;
    /**
     * True when the level sweep could not be certified and the top rhomboids
     * were found by the exact O(n^5) enumeration instead (a cloud on one
     * sphere to within ~1e-10, say): the exact result, only slower. Exactly
     * cospherical input is refused instead, and above 128 points the call
     * throws rather than run the exact path.
     */
    usedExactFallback: boolean;
    /** 4 · (bounding-box diagonal)². */
    squaredRadiusBound: number;
}
/**
 * The k-fold cover complex: the complex, the k-subset of the input each
 * vertex stands for, and the diagnostics. Vertex ids index `mosaicVertices`,
 * not the input points.
 */
export interface KFoldCoverComplex extends Complex {
    /** `mosaicVertices[i]`: the sorted k-subset of input indices vertex `i` stands for. */
    mosaicVertices: number[][];
    diagnostics: KFoldCoverDiagnostics;
}
/** Options of {@link kFoldCoverComplex}. */
export interface KFoldCoverComplexOptions {
    /** The cover multiplicity, a positive integer (at least `k + 3` points are needed). Required. */
    k: number;
    /** Drop the simplices valued above this squared radius, positive (`Infinity` keeps all). Default `Infinity`. */
    maxSquaredRadius?: number;
    /** Largest simplex dimension, a non-negative integer. Default 3 (the mosaic's own dimension). */
    maxSimplexDim?: number;
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
export declare function kFoldCoverComplex(points_: PointCloud, opts: KFoldCoverComplexOptions): KFoldCoverComplex;
/** Options of {@link kFoldCoverPersistence}. */
export interface KFoldCoverPersistenceOptions extends KFoldCoverComplexOptions, BuilderPersistenceOptions {
}
/** The persistence of {@link kFoldCoverComplex}, built and reduced in one call: homology up to `maxSimplexDim`. */
export declare function kFoldCoverPersistence(points_: PointCloud, opts: KFoldCoverPersistenceOptions): BuilderPersistence<KFoldCoverComplex>;
/**
 * The semi-axes of the ellipsoids: a tangent-to-normal ratio `q >= 1`
 * (arXiv:2408.11450 §2.1; the `d − 1` tangent semi-axes have length 1, the
 * normal one `1/q`), or `'pca'`, the semi-axes from the normalized local
 * singular values with a 1e-4 floor (the paper's Appendix 8.1).
 */
export type EllipsoidAxes = number | 'pca';
/** Options of {@link ellipsoids}, shared by the ellipsoid complexes. */
export interface EllipsoidOptions {
    /** The local PCA neighbourhood size, an integer `>= 2` (it counts the point itself and is clamped to the number of points). Required. */
    neighbors: number;
    /** The semi-axes: a ratio `>= 1` or `'pca'`. Required. */
    axes: EllipsoidAxes;
}
/**
 * The ellipsoid fitted at one point, for drawing. At value `f` of
 * {@link ellipsoidRipsComplex} the ellipsoid has semi-axes
 * `(f / 2) · semiAxes` along the rows of `frame`; at value `r` of
 * {@link ellipsoidCechComplex}, `r · semiAxes`.
 */
export interface EllipsoidGeometry {
    /** The centre: the input point itself, not the neighbourhood mean. */
    center: number[];
    /** Orthonormal local frame, one row per principal axis, in descending order of local variance; `frame[0]` is the dominant (tangent) direction. */
    frame: number[][];
    /** The semi-axes at unit scale: descending, `semiAxes[0] === 1`. */
    semiAxes: number[];
}
/**
 * The ellipsoids the two ellipsoid complexes fit at every point (the same
 * fitting, so a drawing matches the complex), for renderers that draw them.
 */
export declare function ellipsoids(points_: PointCloud, opts: EllipsoidOptions): EllipsoidGeometry[];
/** Options of {@link ellipsoidRipsComplex}. */
export interface EllipsoidRipsComplexOptions extends EllipsoidOptions {
    /** Drop the simplices valued above this edge length, positive (`Infinity` keeps all). Default `Infinity`. */
    maxEdgeLength?: number;
    /** Largest simplex dimension, a non-negative integer. Default 2. */
    maxSimplexDim?: number;
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
export declare function ellipsoidRipsComplex(points_: PointCloud, opts: EllipsoidRipsComplexOptions): Complex;
/** Options of {@link ellipsoidRipsPersistence}. */
export interface EllipsoidRipsPersistenceOptions extends EllipsoidRipsComplexOptions, BuilderPersistenceOptions {
}
/** The persistence of {@link ellipsoidRipsComplex}, built and reduced in one call: homology up to `maxSimplexDim`. */
export declare function ellipsoidRipsPersistence(points_: PointCloud, opts: EllipsoidRipsPersistenceOptions): BuilderPersistence;
/** Options of {@link ellipsoidCechComplex}. */
export interface EllipsoidCechComplexOptions extends EllipsoidOptions {
    /** Drop the simplices valued above this radius, positive (`Infinity` keeps all). Default `Infinity`; without one every triple reaches the solver, so pass one. */
    maxRadius?: number;
    /** Largest simplex dimension, a non-negative integer. Default 2. */
    maxSimplexDim?: number;
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
export declare function ellipsoidCechComplex(points_: PointCloud, opts: EllipsoidCechComplexOptions): Complex;
/** Options of {@link ellipsoidCechPersistence}. */
export interface EllipsoidCechPersistenceOptions extends EllipsoidCechComplexOptions, BuilderPersistenceOptions {
}
/** The persistence of {@link ellipsoidCechComplex}, built and reduced in one call: homology up to `maxSimplexDim`. */
export declare function ellipsoidCechPersistence(points_: PointCloud, opts: EllipsoidCechPersistenceOptions): BuilderPersistence;
/** Options of {@link wings}, shared by the wing complex. */
export interface WingOptions {
    /** The spine ratio q (spine half-length over wing length), in [0, 1]. Required. */
    q: number;
    /** The wing angle θ, in (0, π/2]. Required. */
    theta: number;
    /**
     * The unit normal at every point, `[x0, y0, x1, y1, …]`, or the number of
     * nearest neighbours (an integer `>= 2`) from which to estimate them by an
     * osculating-circle fit. Required.
     */
    normals: number | Float64Array | number[];
}
/**
 * How the unit normal α a wing was built from was obtained:
 * `'supplied'` (the caller's, normalised), `'osculating'` (an
 * osculating-circle fit on the k nearest neighbours, Eq. 3.1 of Weng–Zhao
 * 2026), `'tangent'` (the fit was singular or its radius exceeded 1e6 times
 * the local scale, so the 90° rotation of the PCA tangent pointing away from
 * the neighbourhood centroid), or `'isolated'` (no neighbours: `+e_x`, a
 * placeholder).
 */
export type WingNormalSource = 'supplied' | 'osculating' | 'tangent' | 'isolated';
/**
 * One wing of the wing complex, for drawing; the same normals the complex
 * uses, so a drawing matches the diagram. Estimated normals carry the
 * failure modes the source paper does not address (it works with exact
 * normals): at an inflection the wing can point the wrong way, noise can
 * reverse a wing, and k has to sit between the noise and the feature scale.
 */
export interface WingGeometry {
    /** The sample point, copied through. */
    point: number[];
    /** The unit normal α (Eq. 3.1) the wing was built from. */
    normal: number[];
    /** Where `normal` came from. */
    normalSource: WingNormalSource;
    /** Radius of the fitted osculating circle, `1/|κ|`; `Infinity` for supplied normals or a singular fit. */
    curvatureRadius: number;
    /** Mean distance to the k nearest neighbours, the scale the curvature clamp compares against; `Infinity` for supplied normals. */
    neighborhoodScale: number;
    /**
     * The wing polygon at unit scale: six offsets from `point`, in the order
     * A, B, C, D, C′, B′ (the concave hexagon of the paper's Eqs. 3.2–3.4). At
     * scale ε vertex `v` is `point[c] + ε · outline[v][c]`.
     */
    outline: number[][];
}
/** The wings {@link wingComplex} builds, for renderers that draw them. */
export declare function wings(points_: PointCloud, opts: WingOptions): WingGeometry[];
/** Options of {@link wingComplex}. */
export interface WingComplexOptions extends WingOptions {
    /** Drop the edges born above this ε, positive. Default `Infinity`. */
    maxEpsilon?: number;
    /** Largest simplex dimension, a non-negative integer. Default 3. */
    maxSimplexDim?: number;
}
/**
 * The curvature-adaptive wing complex of a planar point cloud, a flag
 * complex (not a nerve), written from Weng and Zhao, AIMS Mathematics
 * 11(1):785–809, 2026 (no reference implementation is available). Pair
 * births are analytic; the 1-skeleton is expanded to a flag complex by the
 * Rust core. Values on the wing scale ε (`'epsilon'`).
 */
export declare function wingComplex(points_: PointCloud, opts: WingComplexOptions): Complex;
/** Options of {@link wingPersistence}. */
export interface WingPersistenceOptions extends WingComplexOptions, BuilderPersistenceOptions {
}
/** The persistence of {@link wingComplex}, built and reduced in one call: homology up to `maxSimplexDim`. */
export declare function wingPersistence(points_: PointCloud, opts: WingPersistenceOptions): BuilderPersistence;
/** Numerical diagnostics of the box filtration's growth engine. `iterationCapHits` must be 0. */
export interface BoxFiltrationDiagnostics {
    /** Growth subproblems solved: `numBoxes · numSteps`. */
    expansions: number;
    /** Steepest-descent moves summed over all of them; a cost measure. */
    descentSteps: number;
    /** Must be 0: a subproblem that stalled numerically, whose box may be smaller than the paper's rule prescribes. */
    iterationCapHits: number;
}
/** A box: its lower and its upper corner. */
export interface BoxExtent {
    /** Lower corner, one coordinate per axis. */
    lower: number[];
    /** Upper corner, one coordinate per axis. */
    upper: number[];
}
/**
 * The box filtration: the complex (vertex `i` is the box grown from point
 * `i`; values exactly the grid `{0, stepSize, …, numSteps · stepSize}`),
 * the grid, the diagnostics and, on request, the grown boxes.
 */
export interface BoxFiltration extends Complex {
    /** m: the number of growth steps taken. */
    numSteps: number;
    /** π: the growth increment and the grid spacing. */
    stepSize: number;
    /** The growth aggressiveness the boxes were grown with. */
    growth: number;
    /** The last step at which an edge was born: the last interesting scale. */
    maxBirthStep: number;
    /** Edges of the 1-skeleton, before the dimension cap. */
    numEdges: number;
    /** With `boxes: true`, `boxes[step][i]`: box `i` at value `step · stepSize`. */
    boxes?: BoxExtent[][];
    diagnostics: BoxFiltrationDiagnostics;
}
/** Options of {@link boxFiltration}. */
export interface BoxFiltrationOptions {
    /** π > 0, finite: the growth increment and the grid of values. Required. */
    stepSize: number;
    /**
     * The growth aggressiveness, in [0, 1]: 0 never grows (the discrete
     * complex); 1 grows every box to its whole neighbourhood (the ℓ∞ Rips
     * filtration on the grid). The paper's experiments use about 0.5. Required.
     */
    growth: number;
    /** Stop after this many steps, a positive integer. Default: the paper's m, the first step whose neighbourhood covers the whole cloud. */
    maxSteps?: number;
    /** Largest simplex dimension, a non-negative integer. Default 3. */
    maxSimplexDim?: number;
    /** Also return every box at every step, `(numSteps + 1) · n` records. Default `false`. */
    boxes?: boolean;
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
export declare function boxFiltration(points_: PointCloud, opts: BoxFiltrationOptions): BoxFiltration;
/** Options of {@link boxFiltrationPersistence}. */
export interface BoxFiltrationPersistenceOptions extends BoxFiltrationOptions, BuilderPersistenceOptions {
}
/** The persistence of {@link boxFiltration}, built and reduced in one call: homology up to `maxSimplexDim`. */
export declare function boxFiltrationPersistence(points_: PointCloud, opts: BoxFiltrationPersistenceOptions): BuilderPersistence<BoxFiltration>;
/** The grid's extents, fastest axis first (the engine's order), after its checks. */
export declare function gridArgs(v: unknown, name: string): number[];
/**
 * Every cell of the cubical complex of an image or a volume, T-construction
 * (each value on a top-dimensional cell, every lower cell at the smallest
 * value of the top cells containing it), by the Rust core: the cells, values
 * and order of GUDHI's `Bitmap_cubical_complex`.
 */
export declare function cubicalComplex(image: Grid): CubicalComplex;
