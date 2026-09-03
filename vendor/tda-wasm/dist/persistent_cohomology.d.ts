/**
 * TypeScript wrapper for the tda-wasm persistent-cohomology WASM module.
 *
 * Mix of GUDHI-native paths (cubical, persistent cohomology, zigzag, Rips),
 * permissive `src/geom` reimplementations over the vendored Geogram Delaunay
 * PSM (weighted alpha, Čech, exact bottleneck, Euclidean weak witness, 2D
 * wing complex — flag / Rips-type, never a nerve), Hera
 * optimal-transport Wasserstein, and manual C++ fallbacks/representations.
 * Not a complete GUDHI port.
 *
 * Rips uses GUDHI `Rips_complex`; explicit `*Manual` methods retain the former
 * simplex-tree expansion for differential testing and fallback use.
 * Explicit `*Greedy` methods retain the former Wasserstein approximation.
 */
import { PersistencePair, PersistenceResult, BettiNumbers, PersistenceDiagram } from './persistent_cohomology_types.js';
import { Point3D, Simplex, AlphaComplexResult, KFoldCoverResult, BoxFiltrationResult, CubicalComplexResult, EllipsoidAxesMode, EllipsoidGeometry, WingGeometry, ModuleOptions, ZigzagOperation, ZigzagPersistenceResult, FilteredZigzagPersistenceResult } from './types.js';
/**
 * Main class for GUDHI Persistent Cohomology operations using WebAssembly
 */
export declare class GudhiPersistentCohomology {
    private module;
    private initialized;
    /**
     * Initialize the GUDHI Persistent Cohomology WebAssembly module
     */
    initialize(options?: ModuleOptions): Promise<void>;
    /**
     * Check if the module is initialized
     */
    isInitialized(): boolean;
    /**
     * Build an Emscripten VectorSimplexData from simplices.
     *
     * SimplexData and VectorInt are embind class bindings, so the JS-side
     * temporaries own WASM heap memory. push_back/property assignment copy the
     * underlying C++ values, so each temporary must be deleted after use.
     * The caller is responsible for deleting the returned vector.
     */
    private buildVectorSimplexData;
    /**
     * Convert an Emscripten VectorSimplexData into plain JS Simplex objects.
     *
     * SimplexData is an embind class binding, so vector.get(i) returns an owned
     * handle to a C++ copy, and reading its `vertices` property copies the
     * underlying std::vector<int> into another owned handle. Both must be
     * deleted after use or the WASM heap leaks (two C++ objects per simplex
     * per call). Does NOT delete the vector itself; the caller owns it.
     */
    private convertVectorSimplexData;
    /**
     * Compute weighted alpha complex from 3D points with weights
     */
    computeWeightedAlphaComplex(points: Point3D[]): AlphaComplexResult;
    /**
     * Compute the k-fold cover (multicover) complex of a 3D point cloud: the
     * order-k Delaunay mosaic filtered by the squared radius function.
     *
     * This is the EXACT nerve of the k-fold cover — the sublevel sets are
     * homotopy equivalent to `{x : |B(x, r) ∩ X| >= k}` at every radius, and the
     * equivalence commutes with the inclusions (Edelsbrunner and Osang, "The
     * Multi-cover Persistence of Euclidean Balls", SoCG 2018, "Almost Nerve"
     * lemma). Persistence of this filtration IS multicover persistence; no
     * approximation label applies. `k = 1` reproduces the alpha complex.
     *
     * Filtration values are SQUARED radii, matching the alpha complex.
     *
     * Vertex ids index into `mosaicVertices`, not into `points`: a mosaic vertex
     * stands for a k-subset of the input.
     *
     * Unweighted points only. The level-by-level construction is proven for
     * unweighted points (Edelsbrunner and Osang, arXiv:2011.03617, Theorem 5)
     * and the proof does not carry over to weights, so weighted input is
     * rejected rather than silently accepted.
     *
     * The input must be genuinely 3-dimensional and must not repeat a point;
     * coplanar, collinear and coincident clouds throw. Exactly cospherical input
     * throws too, when it makes two order-k sites coincide: an integer grid or an
     * unjittered close packing does that from `k = 2` on. Perturb such input — the
     * FCC/HCP experiment this builder reproduces jitters its lattices for exactly
     * this reason. Determinism does not depend on that jitter: the mosaic is a
     * pure function of the input (the insertion order handed to the weighted
     * Delaunay is ours, not Geogram's randomized one).
     *
     * @param points Flat array of coordinates [x0, y0, z0, x1, y1, z1, ...]
     * @param k Cover multiplicity, k >= 1 (needs at least k + 3 points)
     * @param maxSquaredRadius Drop simplices born after this squared radius. Omit
     *        for no bound; a supplied value must be positive. Cost grows quickly
     *        with k, so bounding this is the usual way to keep a browser call
     *        cheap.
     * @param maxSimplexDimension Cap the emitted dimension (default 3, the
     *        mosaic's own dimension)
     */
    computeKFoldCoverComplex(points: number[], k: number, maxSquaredRadius?: number, maxSimplexDimension?: number): KFoldCoverResult;
    /**
     * Compute Rips complex from point cloud.
     *
     * Constructed by GUDHI `Rips_complex` in the WASM module.
     *
     * @param points Flat array of coordinates [x0, y0, z0, x1, y1, z1, ...]
     * @param dimension Spatial dimension (2 for 2D, 3 for 3D, etc.)
     * @param maxEdgeLength Maximum distance for edges
     * @param maxSimplexDimension Maximum simplex dimension (default: 3)
     */
    computeRipsComplex(points: number[], dimension: number, maxEdgeLength: number, maxSimplexDimension?: number): AlphaComplexResult;
    /**
     * Compute Rips complex from a point cloud with the retained manual
     * simplex-tree expansion fallback.
     */
    computeRipsComplexManual(points: number[], dimension: number, maxEdgeLength: number, maxSimplexDimension?: number): AlphaComplexResult;
    /**
     * Compute Rips complex from pre-computed distance matrix.
     * Constructed by GUDHI `Rips_complex` in the WASM module.
     * @param distanceMatrix Flattened distance matrix [d(0,0), d(0,1), ..., d(n-1,n-1)]
     * @param numPoints Number of points
     * @param maxEdgeLength Maximum distance for edges
     * @param maxSimplexDimension Maximum simplex dimension (default: 3)
     */
    computeRipsComplexFromDistanceMatrix(distanceMatrix: number[], numPoints: number, maxEdgeLength: number, maxSimplexDimension?: number): AlphaComplexResult;
    /**
     * Compute Rips complex from a distance matrix with the retained manual
     * simplex-tree expansion fallback.
     */
    computeRipsComplexFromDistanceMatrixManual(distanceMatrix: number[], numPoints: number, maxEdgeLength: number, maxSimplexDimension?: number): AlphaComplexResult;
    /**
     * Compute Čech complex from point cloud
     * Uses minimal enclosing ball (MEB) radius for filtration (exact geometry)
     * @param points Flat array of coordinates [x0, y0, z0, x1, y1, z1, ...]
     * @param dimension Spatial dimension (2 for 2D, 3 for 3D, etc.)
     * @param maxRadius Maximum MEB radius threshold
     * @param maxSimplexDimension Maximum simplex dimension (default: 3)
     */
    computeCechComplex(points: number[], dimension: number, maxRadius: number, maxSimplexDimension?: number): AlphaComplexResult;
    /**
     * Compute the Rips-type ellipsoid complex from a point cloud
     * (arXiv:2408.11450, Canova-Kališnik-Moser-Rieck-Žegarac).
     *
     * Each point gets an anisotropic ellipsoid from a local PCA frame, an edge
     * appears when two ellipsoids first touch, and higher simplices come from flag
     * expansion. This is a **flag complex**, which is what the paper builds and
     * says it builds (Def. 2.2) — it is not a nerve, and no nerve lemma applies to
     * it. The paper's §2.1 considers the Čech-like nerve variant and rejects it as
     * too expensive; that is a separate construction, not this one.
     *
     * Filtration values are twice the birth radius — the Rips-comparable scale, in
     * the same units as a Rips edge length — so `axesMode = 1` (isotropic
     * ellipsoids, i.e. balls) reproduces the Rips filtration exactly. This matches
     * the reference implementation's own radius-to-Rips conversion.
     *
     * @param points Flat array of coordinates [x0, y0, x1, y1, ...] (with z in 3D)
     * @param dimension Ambient dimension; 2 or 3 only (higher is out of scope)
     * @param neighborhoodSize k, the local PCA neighbourhood. Counts the point
     *        itself and is clamped to the number of points.
     * @param axesMode Tangent-to-normal semi-axis ratio q >= 1, or `'pca'` to take
     *        the semi-axes from the normalized local singular values
     * @param maxSimplexDimension Maximum simplex dimension (default: 2)
     * @param maxFiltration Optional cutoff on the filtration value, in the same
     *        Rips-comparable units as the output. Omit for no cutoff.
     */
    computeEllipsoidRipsComplex(points: number[], dimension: number, neighborhoodSize: number, axesMode: EllipsoidAxesMode, maxSimplexDimension?: number, maxFiltration?: number): AlphaComplexResult;
    /**
     * Compute the ellipsoidal Čech complex — a **true nerve** — from a point
     * cloud (arXiv:2606.01548, Giunti-Hill-Ye).
     *
     * Same ellipsoids as `computeEllipsoidRipsComplex`: same local-PCA fitting,
     * same pairwise solver for the 1-skeleton, same filtration scale. The
     * difference is the membership rule. Here a simplex enters only when the
     * ellipsoids of **all** its vertices share a common point, computed as the
     * minimal intersection radius of that family; there a simplex enters as soon
     * as its vertices' ellipsoids intersect *pairwise*.
     *
     * This one may be called a nerve, and the argument is short. At every radius
     * the ellipsoids are convex, so every subfamily intersection is convex and
     * hence empty or contractible; a cover whose finite intersections are all
     * contractible is a good cover, and the nerve lemma applies to it. This
     * complex is by definition that nerve, and growing the radius induces the
     * inclusions, so its persistence is the persistence of the growing union of
     * ellipsoids. None of that holds for the flag complex, where pairwise
     * intersection does not imply a common point.
     *
     * Consequences you can check: the output is always a subcomplex of
     * `computeEllipsoidRipsComplex` on the same input, never the other way round,
     * and each shared simplex is born no earlier here. At `axesMode = 1` the
     * ellipsoids are balls and the result reproduces `computeCechComplex`.
     *
     * Filtration values are twice the birth radius — the Rips-comparable scale —
     * exactly as `computeEllipsoidRipsComplex` emits them, and `maxFiltration` is
     * in those same units. **Note** that `computeCechComplex` emits the radius
     * itself, so comparing against it means halving these values.
     *
     * Cost: every pair of ellipsoids eventually touches, so without
     * `maxFiltration` the pairwise graph is complete and every triple is a
     * candidate that reaches the solver. Pass a cutoff.
     *
     * @param points Flat array of coordinates [x0, y0, x1, y1, ...] (with z in 3D)
     * @param dimension Ambient dimension; 2 or 3 only (higher is out of scope)
     * @param neighborhoodSize k, the local PCA neighbourhood. Counts the point
     *        itself and is clamped to the number of points.
     * @param axesMode Tangent-to-normal semi-axis ratio q >= 1, or `'pca'` to take
     *        the semi-axes from the normalized local singular values
     * @param maxSimplexDimension Maximum simplex dimension (default: 2)
     * @param maxFiltration Optional cutoff on the filtration value, in the same
     *        Rips-comparable units as the output. Omit for no cutoff.
     */
    computeEllipsoidCechComplex(points: number[], dimension: number, neighborhoodSize: number, axesMode: EllipsoidAxesMode, maxSimplexDimension?: number, maxFiltration?: number): AlphaComplexResult;
    /**
     * Fitted ellipsoid geometry per input point, for renderers that want to draw
     * the ellipsoids rather than the complex.
     *
     * Uses the same fitting the complex uses, so the two are always consistent.
     * At filtration value `f` the ellipsoid at index `i` has semi-axes
     * `(f / 2) * semiAxes[a]` along `frame[a]`.
     *
     * @param points Flat array of coordinates [x0, y0, x1, y1, ...]
     * @param dimension Ambient dimension; 2 or 3 only
     * @param neighborhoodSize k, the local PCA neighbourhood (counts the point)
     * @param axesMode Tangent-to-normal ratio q >= 1, or `'pca'`
     */
    computeEllipsoidGeometry(points: number[], dimension: number, neighborhoodSize: number, axesMode: EllipsoidAxesMode): EllipsoidGeometry[];
    /**
     * Shared argument checks for the ellipsoid entry points. Returns the numeric
     * axes ratio the WASM layer expects, where a non-positive value selects the
     * singular-value mode.
     */
    private validateEllipsoidInput;
    /**
     * Compute the 2D curvature-adaptive wing complex (flag / Rips-type, not a
     * nerve). First public implementation of Weng–Zhao, AIMS Mathematics
     * 11(1):785–809, 2026, doi:10.3934/math.2026034.
     *
     * Pair births are analytic (homothety 2×2 solves); the 1-skeleton is
     * inserted into GUDHI's Simplex_tree and expanded to a flag complex.
     *
     * @param points2d Flat [x0, y0, x1, y1, ...] cloud (2D only)
     * @param q Spine half-length / wing-length in [0, 1]
     * @param theta Wing angle in (0, π/2]
     * @param normalsOrK Either a neighbourhood size k >= 2 (estimated
     *        osculating-circle normals) or a flat 2n array of unit normals
     *        (exact-sampling / fixture mode)
     * @param maxSimplexDimension Maximum simplex dimension (default: 3)
     * @param maxEps Omit edges with birth > maxEps (default: Infinity)
     */
    computeWingComplex(points2d: number[], q: number, theta: number, normalsOrK: number[] | number, maxSimplexDimension?: number, maxEps?: number): AlphaComplexResult;
    /**
     * The wings `computeWingComplex` builds, for renderers that want to draw them
     * rather than the complex.
     *
     * Uses the same normal resolution the complex uses — supplied normals come
     * back normalised, a scalar `k` comes back estimated by the builder's own
     * osculating-circle fit — so the drawing and the barcode can never disagree.
     * Feeding `result.map((w) => w.normal).flat()` back in as `normalsOrK`
     * rebuilds the identical complex; a renderer that re-estimates normals itself
     * would draw a different wing than the one whose birth was recorded.
     *
     * Pass the same `points2d`, `q` and `theta` you passed the builder: the
     * returned `outline` already carries them, so `(record, eps)` is enough to
     * draw the wing at scale `eps` with no further estimation.
     *
     * Estimated normals carry the documented failure modes — inflection flips α,
     * noise can reverse a wing, and `k` must sit between the noise and feature
     * scales. `normalSource`, `curvatureRadius` and `neighborhoodScale` are there
     * to make that visible; see {@link WingGeometry}.
     *
     * @param points2d Flat [x0, y0, x1, y1, ...] cloud (2D only)
     * @param q Spine half-length / wing-length in [0, 1]
     * @param theta Wing angle in (0, π/2]
     * @param normalsOrK Either a neighbourhood size k >= 2 (estimated
     *        osculating-circle normals) or a flat 2n array of unit normals
     *        (exact-sampling / fixture mode)
     */
    computeWingGeometry(points2d: number[], q: number, theta: number, normalsOrK: number[] | number): WingGeometry[];
    /**
     * Shared argument checks for the wing entry points, so the complex and the
     * geometry accept and reject exactly the same input. Returns the flat
     * `normalsOrK` the WASM layer expects (length 1 for k, length 2n for supplied
     * normals).
     */
    private validateWingInput;
    /**
     * Compute the box filtration of a 2D or 3D point cloud: a genuine NERVE.
     *
     * First public implementation of Alvarado, Gupta and Krishnamoorthy,
     * "Any Dimension Polynomial Time Algorithm for Multiparameter Persistent
     * Homology" / the box filtration, arXiv:2404.05859. The reference repository
     * the paper links is deleted, so this is written from the definitions.
     *
     * Every point starts as a degenerate box and grows, one step at a time,
     * inside the l∞ ball of radius `j * stepSize` around itself, following the
     * paper's growth rule: growth is worth taking when it covers other points
     * (each worth `alpha`) for less than it costs in added width (each unit
     * worth `1 - alpha`, normalised by the neighbourhood). Simplices are born
     * when their boxes first intersect.
     *
     * WHY THIS ONE IS A NERVE, not a Rips-type stand-in like the wing and
     * ellipsoid complexes: axis-aligned boxes have the Helly property axiswise,
     * so a subfamily that intersects pairwise already shares a point. The flag
     * complex of the box-intersection graph therefore IS the nerve of the boxes,
     * and the nerve theorem applies in full — sublevel sets are homotopy
     * equivalent to the union of the boxes, and the equivalence commutes with
     * the inclusions.
     *
     * QUANTIZATION — read this before interpreting a diagram. Boxes grow in
     * whole steps, so every birth and death is an exact multiple of `stepSize`:
     * bar endpoints are grid values, not measurements. `stepSize` is the
     * resolution you chose, so a bar of length `stepSize` is one step long and
     * means "appeared and vanished between two consecutive grid values", not
     * "noise". Halving `stepSize` doubles the resolution and the cost. Compare
     * diagrams only at equal `stepSize`; a bottleneck distance between diagrams
     * on different grids mostly measures the grids.
     *
     * Deterministic: same points, same `stepSize` and `alpha` give a
     * bit-identical result on every run and platform. The step logic is integer
     * and the intersection tests are exact interval comparisons in doubles, with
     * no epsilon and no tie-breaking by input order.
     *
     * Duplicate points are ACCEPTED and connect at filtration 0, unlike
     * `computeKFoldCoverComplex`, which rejects them — a duplicate breaks the
     * order-k mosaic, whereas here it is simply two boxes that always coincide.
     * Collinear and coincident clouds are fine for the same reason.
     *
     * @param points Flat array of coordinates, `dimension` per point
     * @param dimension 2 or 3
     * @param stepSize π > 0: the growth increment AND the filtration grid
     * @param alpha Growth aggressiveness in [0, 1]. 0 never grows, leaving the
     *        discrete complex; 1 grows every box to its whole neighbourhood,
     *        which makes this the l∞ Rips filtration sampled on the grid. The
     *        paper's experiments use values around 0.5.
     * @param maxSteps Stop after this many steps. Omit to run to the paper's m,
     *        the first step whose neighbourhood covers the whole cloud — past
     *        which every box contains every point and nothing changes.
     * @param maxSimplexDimension Cap the emitted simplex dimension (default 3)
     * @param includeBoxes Also return every box at every step, for rendering the
     *        growth. Costs `(numSteps + 1) * numPoints` box records, so it is
     *        off by default.
     */
    computeBoxFiltration(points: number[], dimension: number, stepSize: number, alpha: number, maxSteps?: number, maxSimplexDimension?: number, includeBoxes?: boolean): BoxFiltrationResult;
    /**
     * Compute the Euclidean (weak) witness complex from a point cloud.
     * Landmarks are chosen from the points by deterministic farthest-point
     * sampling (not random); the same input always produces the same landmark
     * set and complex.
     *
     * Only the *weak* witness variant is implemented, matching GUDHI's
     * `Euclidean_witness_complex` semantics. The strong witness complex is not
     * wired up.
     *
     * Note: vertex ids in the returned simplices index into the internally
     * chosen landmark subset, in landmark-selection order -- not into the
     * original `points` array. When `numLandmarks === numPoints` every
     * point becomes a landmark, but the id-to-point mapping is still the
     * farthest-point selection order, not the input order.
     *
     * @param points Flat array of coordinates [x0, y0, z0, x1, y1, z1, ...]
     * @param dimension Spatial dimension (2 for 2D, 3 for 3D, etc.)
     * @param numLandmarks Number of landmarks to sample via farthest-point sampling
     * @param maxAlphaSquare Maximum squared relaxation parameter (GUDHI's alpha^2)
     * @param maxSimplexDimension Maximum simplex dimension (default: 3)
     */
    computeEuclideanWitnessComplex(points: number[], dimension: number, numLandmarks: number, maxAlphaSquare: number, maxSimplexDimension?: number): AlphaComplexResult;
    /**
     * Compute persistent homology from simplicial complex
     */
    computePersistence(simplices: Simplex[], coeffField?: number): PersistenceResult;
    /**
     * Compute Betti numbers at a specific filtration value
     */
    computeBettiNumbers(simplices: Simplex[], filtrationValue: number, coeffField?: number): BettiNumbers;
    /**
     * Compute bottleneck distance between two persistence diagrams
     * @param pairs1 First persistence diagram (array of persistence pairs)
     * @param pairs2 Second persistence diagram (array of persistence pairs)
     * @param epsilon Approximation parameter (0 for exact, >0 for approximation)
     * @returns Bottleneck distance between the two diagrams
     */
    computeBottleneckDistance(pairs1: PersistencePair[], pairs2: PersistencePair[], epsilon?: number): number;
    /**
     * Compute bottleneck distance for a specific dimension only
     * @param pairs1 First persistence diagram
     * @param pairs2 Second persistence diagram
     * @param dimension Only compare features in this dimension
     * @param epsilon Approximation parameter (0 for exact, >0 for approximation)
     * @returns Bottleneck distance for the specified dimension
     */
    computeBottleneckDistanceForDimension(pairs1: PersistencePair[], pairs2: PersistencePair[], dimension: number, epsilon?: number): number;
    /**
     * Compute q-Wasserstein distance between two persistence diagrams.
     *
     * Uses Hera's optimal-transport implementation.
     * For q = Infinity this delegates to bottleneck (`src/geom`, exact).
     *
     * @param pairs1 First persistence diagram
     * @param pairs2 Second persistence diagram
     * @param q Wasserstein exponent (1, 2, etc.; use Infinity for bottleneck)
     * @returns q-Wasserstein optimal-transport distance
     */
    computeWassersteinDistance(pairs1: PersistencePair[], pairs2: PersistencePair[], q?: number): number;
    /**
     * Compute q-Wasserstein distance for a specific dimension only.
     * Uses Hera's optimal-transport implementation.
     * @param pairs1 First persistence diagram
     * @param pairs2 Second persistence diagram
     * @param dimension Only compare features in this dimension
     * @param q Wasserstein exponent (1, 2, etc.; use Infinity for bottleneck)
     * @returns q-Wasserstein optimal-transport distance for the specified dimension
     */
    computeWassersteinDistanceForDimension(pairs1: PersistencePair[], pairs2: PersistencePair[], dimension: number, q?: number): number;
    /**
     * Compute the retained greedy q-Wasserstein approximation.
     * This is not optimal transport. For q = Infinity it delegates to exact
     * bottleneck distance.
     */
    computeWassersteinDistanceGreedy(pairs1: PersistencePair[], pairs2: PersistencePair[], q?: number): number;
    /**
     * Compute the retained greedy q-Wasserstein approximation after filtering
     * both diagrams to one homology dimension. This is not optimal transport.
     */
    computeWassersteinDistanceForDimensionGreedy(pairs1: PersistencePair[], pairs2: PersistencePair[], dimension: number, q?: number): number;
    /**
     * Complete TDA pipeline: compute alpha complex + persistent homology
     */
    computeAlphaComplexPersistence(points: Point3D[], coeffField?: number): {
        complex: AlphaComplexResult;
        persistence: PersistenceResult;
        diagram: PersistenceDiagram;
    };
    /**
     * Complete TDA pipeline: compute Rips complex + persistent homology.
     *
     * Rips construction and persistence are both GUDHI native.
     */
    computeRipsComplexPersistence(points: number[], dimension: number, maxEdgeLength: number, maxSimplexDimension?: number, coeffField?: number): {
        complex: AlphaComplexResult;
        persistence: PersistenceResult;
        diagram: PersistenceDiagram;
    };
    /**
     * Compute Betti curve - Betti numbers as a function of filtration value
     *
     * @param simplices - Simplicial complex simplices
     * @param filtrationValues - Array of filtration values at which to compute Betti numbers
     * @param coeffField - Coefficient field (default: 2)
     * @returns Array of Betti number vectors, one per filtration value
     */
    computeBettiCurve(simplices: Simplex[], filtrationValues: number[], coeffField?: number): number[][];
    /**
     * Compute persistence landscape function values
     *
     * Persistence landscapes are functional representations of persistence diagrams.
     * The k-th landscape function is formed by taking the k-th largest value among
     * all "tent functions" at each point.
     *
     * @param pairs - Persistence pairs
     * @param level - Landscape level (1 = first/largest landscape, 2 = second, etc.)
     * @param evaluationPoints - Points at which to evaluate the landscape function
     * @returns Array of landscape function values at evaluation points
     */
    computePersistenceLandscape(pairs: PersistencePair[], level: number, evaluationPoints: number[]): number[];
    /**
     * Compute persistence image representation
     *
     * Converts a persistence diagram into a 2D image using Gaussian kernels.
     * This is useful for machine learning pipelines and visualization.
     *
     * The algorithm:
     * 1. Transforms (birth, death) → (birth, persistence) coordinates
     * 2. Creates a grid in (birth, persistence) space
     * 3. For each persistence pair, computes its weighted Gaussian contribution to each pixel
     * 4. Returns flattened image array (can be reshaped to 2D)
     *
     * @param pairs - Persistence pairs
     * @param resolution - Image resolution as [width, height] or single number for square
     * @param bounds - Grid bounds as {birthMin, birthMax, persMin, persMax} or 'auto'
     * @param sigma - Gaussian kernel bandwidth (default: 0.1)
     * @param weightPower - Weighting function exponent: w(p) = p^weightPower (default: 1.0)
     * @returns Object with {image: number[], width: number, height: number, bounds}
     */
    computePersistenceImage(pairs: PersistencePair[], resolution: number | [number, number], bounds: 'auto' | {
        birthMin: number;
        birthMax: number;
        persMin: number;
        persMax: number;
    }, sigma?: number, weightPower?: number): {
        image: number[];
        width: number;
        height: number;
        bounds: {
            birthMin: number;
            birthMax: number;
            persMin: number;
            persMax: number;
        };
    };
    /**
     * Compute zigzag persistence from a sequence of insert/remove operations
     *
     * Zigzag persistence extends standard persistent homology by allowing both
     * insertions AND removals of simplices. This enables tracking topological
     * features in time-varying data where the complex can both grow and shrink.
     *
     * @param operations - Array of ZigzagOperation objects describing the sequence
     * @returns ZigzagPersistenceResult with bars indexed by operation number
     *
     * @example
     * ```typescript
     * import { createInsertOp, createRemoveOp } from 'tda-wasm';
     *
     * const ops = [
     *   createInsertOp(0, [], 0),           // Insert vertex 0
     *   createInsertOp(1, [], 0),           // Insert vertex 1
     *   createInsertOp(2, [0, 1], 1),       // Insert edge (0,1)
     *   createRemoveOp(2),                  // Remove edge
     * ];
     *
     * const result = gudhi.computeZigzagPersistence(ops);
     * console.log(result.bars);  // [{dimension: 0, birth_index: 0, death_index: 2}, ...]
     * ```
     */
    computeZigzagPersistence(operations: ZigzagOperation[]): ZigzagPersistenceResult;
    /**
     * Compute filtered zigzag persistence from a sequence of operations
     *
     * Similar to computeZigzagPersistence but uses filtration values instead of
     * operation indices. Filtration values must be monotonous (always increasing
     * or always decreasing).
     *
     * @param operations - Array of ZigzagOperation objects with filtration values
     * @returns FilteredZigzagPersistenceResult with bars indexed by filtration value
     *
     * @example
     * ```typescript
     * import { createInsertOp, createRemoveOp } from 'tda-wasm';
     *
     * const ops = [
     *   createInsertOp(0, [], 0, 0.1),       // Insert vertex at t=0.1
     *   createInsertOp(1, [], 0, 0.2),       // Insert vertex at t=0.2
     *   createInsertOp(2, [0, 1], 1, 0.5),   // Insert edge at t=0.5
     *   createRemoveOp(2, 1.0),              // Remove edge at t=1.0
     * ];
     *
     * const result = gudhi.computeFilteredZigzagPersistence(ops);
     * console.log(result.bars);  // [{dimension: 0, birth_value: 0.1, death_value: 0.5}, ...]
     * ```
     */
    computeFilteredZigzagPersistence(operations: ZigzagOperation[]): FilteredZigzagPersistenceResult;
    /**
     * Compute cubical complex from a multi-dimensional grid.
     *
     * @param dimensions - Array of grid dimensions (e.g. [height, width] for 2D)
     * @param data - Flat array of filtration values in row-major order
     * @returns CubicalComplexResult with cells and filtration values
     *
     * @example
     * ```typescript
     * // 3x3 grid
     * const result = gudhi.computeCubicalComplex([3, 3], [
     *   0, 1, 2,
     *   3, 4, 5,
     *   6, 7, 8
     * ]);
     * ```
     */
    computeCubicalComplex(dimensions: number[], data: number[]): CubicalComplexResult;
    /**
     * Compute cubical complex from 2D image/grid data.
     * Convenience method for images, heatmaps, etc.
     *
     * @param imageData - Flat array of pixel/filtration values (row-major)
     * @param width - Image width (columns)
     * @param height - Image height (rows)
     * @returns CubicalComplexResult
     *
     * @example
     * ```typescript
     * // 4x4 grayscale image
     * const pixels = [0, 50, 100, 150, ...]; // 16 values
     * const result = gudhi.computeCubicalComplex2D(pixels, 4, 4);
     * ```
     */
    computeCubicalComplex2D(imageData: number[], width: number, height: number): CubicalComplexResult;
    /**
     * Compute cubical complex from 3D volume data.
     * Convenience method for medical imaging, voxel grids, etc.
     *
     * @param volumeData - Flat array of voxel values (row-major)
     * @param width - Volume width
     * @param height - Volume height
     * @param depth - Volume depth
     * @returns CubicalComplexResult
     */
    computeCubicalComplex3D(volumeData: number[], width: number, height: number, depth: number): CubicalComplexResult;
    /**
     * Compute persistent homology directly on a cubical complex.
     * Unlike computePersistence (which requires simplicial input), this works
     * natively on grid/image data.
     *
     * @param dimensions - Grid dimensions [height, width] or [depth, height, width]
     * @param data - Flat array of filtration values (row-major)
     * @param coeffField - Coefficient field (default: 2 for Z/2Z)
     * @returns PersistenceResult
     *
     * @example
     * ```typescript
     * const result = gudhi.computeCubicalPersistence([5, 5], imagePixels);
     * console.log(result.pairs); // [{dimension: 0, birth: 0, death: 100}, ...]
     * ```
     */
    computeCubicalPersistence(dimensions: number[], data: number[], coeffField?: number): PersistenceResult;
    /**
     * Compute persistent homology on a 2D image/grid.
     * Convenience method that combines cubical complex construction with persistence.
     *
     * @param imageData - Flat array of pixel/filtration values (row-major)
     * @param width - Image width
     * @param height - Image height
     * @param coeffField - Coefficient field (default: 2)
     * @returns PersistenceResult
     */
    computeCubicalPersistence2D(imageData: number[], width: number, height: number, coeffField?: number): PersistenceResult;
    /**
     * Compute ordinary persistence of a 2D vertex lower-star (V-filtration).
     *
     * This differs from `computeCubicalPersistence2D`: here each input value is
     * attached to a grid vertex and every cell enters at the maximum value of
     * its incident vertices. The implementation is an original C++17
     * primal/planar-dual union-find algorithm over F_2. Zero-length intervals
     * are omitted.
     *
     * @param vertexData Row-major vertex values, with `width * height` entries
     * @param width Number of grid vertices per row
     * @param height Number of grid vertices per column
     */
    computeCubicalPersistenceFromVertices2D(vertexData: number[] | Float64Array, width: number, height: number): PersistenceResult;
    /**
     * Clean up resources
     */
    dispose(): void;
}
/**
 * Get or create the default instance
 */
export declare function getDefaultInstance(options?: ModuleOptions): Promise<GudhiPersistentCohomology>;
export * from './persistent_cohomology_types.js';
export * from './types.js';
//# sourceMappingURL=persistent_cohomology.d.ts.map