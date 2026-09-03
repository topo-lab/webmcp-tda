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
// @ts-ignore - WASM module generated at build time
import createModule from '../dist/persistent_cohomology.mjs';
import { createPersistenceDiagram } from './persistent_cohomology_types.js';
import { pointsToCoordinates, validateCubicalInput, operationsToFlat, validateZigzagOperations } from './types.js';
/**
 * Module exports (functions and embind constructors) required by this wrapper.
 * Validated after the WASM module loads in initialize().
 */
const REQUIRED_MODULE_EXPORTS = [
    // Complex construction
    'computeWeightedAlphaComplex3D',
    'computeKFoldCoverComplex',
    'computeRipsComplex',
    'computeRipsComplexFromDistanceMatrix',
    'computeRipsComplexManual',
    'computeRipsComplexFromDistanceMatrixManual',
    'computeCechComplex',
    'computeEllipsoidRipsComplex',
    'computeEllipsoidCechComplex',
    'computeEllipsoidGeometry',
    'computeWingComplex',
    'computeWingGeometry',
    'computeBoxFiltration',
    'computeEuclideanWitnessComplex',
    'computeCubicalComplex',
    'computeCubicalComplex2D',
    'computeCubicalComplex3D',
    // Persistence
    'computePersistence',
    'computeBettiNumbers',
    'computeCubicalPersistence',
    'computeCubicalPersistence2D',
    'computeCubicalPersistenceFromVertices2D',
    // Distances
    'computeBottleneckDistance',
    'computeBottleneckDistanceForDimension',
    'computeWassersteinDistance',
    'computeWassersteinDistanceForDimension',
    'computeWassersteinDistanceGreedy',
    'computeWassersteinDistanceForDimensionGreedy',
    // Representations
    'computeBettiCurve',
    'computePersistenceLandscape',
    'computePersistenceImage',
    // Zigzag persistence
    'computeZigzagPersistenceFromFlat',
    'computeFilteredZigzagPersistenceFromFlat',
    // Embind constructors
    'VectorDouble',
    'VectorInt',
    'VectorUnsigned',
    'VectorSimplexData',
    'VectorPersistencePair',
    'SimplexData'
];
/**
 * Wing normal provenance codes, in the order `computeWingGeometry` emits them
 * (they are `tdageom::WingNormalSource` in src/geom/wing_complex.hpp).
 */
const WING_NORMAL_SOURCES = [
    'supplied',
    'osculating',
    'tangent',
    'isolated'
];
function validateWassersteinExponent(q) {
    if (!(q >= 1)) {
        throw new Error(`Wasserstein exponent q must be at least 1, got ${q}`);
    }
}
function takePersistenceResult(pairsVector) {
    try {
        const pairs = [];
        for (let i = 0; i < pairsVector.size(); i++) {
            const pair = pairsVector.get(i);
            pairs.push({
                dimension: pair.dimension,
                birth: pair.birth,
                death: pair.death
            });
        }
        const pairsByDimension = {};
        let essentialCount = 0;
        for (const pair of pairs) {
            pairsByDimension[pair.dimension] = (pairsByDimension[pair.dimension] || 0) + 1;
            if (pair.death === Infinity)
                essentialCount++;
        }
        const dimension = pairs.reduce((max, pair) => pair.dimension > max ? pair.dimension : max, 0);
        return { pairs, dimension, pairsByDimension, essentialCount };
    }
    finally {
        pairsVector.delete();
    }
}
/**
 * Main class for GUDHI Persistent Cohomology operations using WebAssembly
 */
export class GudhiPersistentCohomology {
    module = null;
    initialized = false;
    /**
     * Initialize the GUDHI Persistent Cohomology WebAssembly module
     */
    async initialize(options = {}) {
        if (this.initialized) {
            throw new Error('GudhiPersistentCohomology is already initialized');
        }
        try {
            // Node.js ES6 module polyfill for Emscripten
            if (typeof process !== 'undefined' && process.versions && process.versions.node) {
                // Running in Node.js - provide require polyfill and load WASM binary
                const { createRequire } = await import('node:module');
                const { fileURLToPath } = await import('node:url');
                const { dirname, join } = await import('node:path');
                const { readFile } = await import('node:fs/promises');
                if (typeof globalThis.require === 'undefined') {
                    const __filename = fileURLToPath(import.meta.url);
                    const __dirname = dirname(__filename);
                    globalThis.require = createRequire(import.meta.url);
                    globalThis.__filename = __filename;
                    globalThis.__dirname = __dirname;
                }
                // Load WASM binary directly for Node.js ES6 modules
                if (!options.wasmBinary) {
                    const __dirname = dirname(fileURLToPath(import.meta.url));
                    const wasmPath = join(__dirname, 'persistent_cohomology.wasm');
                    options.wasmBinary = await readFile(wasmPath);
                }
            }
            const module = await createModule(options);
            // Validate that the loaded module exposes everything this wrapper calls
            const missing = REQUIRED_MODULE_EXPORTS.filter(name => typeof module[name] !== 'function');
            if (missing.length > 0) {
                throw new Error(`Loaded WASM module is missing expected exports: ${missing.join(', ')}`);
            }
            this.module = module;
            this.initialized = true;
        }
        catch (error) {
            const err = error;
            throw new Error(`Failed to initialize GUDHI Comprehensive module: ${err.message}`);
        }
    }
    /**
     * Check if the module is initialized
     */
    isInitialized() {
        return this.initialized && this.module !== null;
    }
    /**
     * Build an Emscripten VectorSimplexData from simplices.
     *
     * SimplexData and VectorInt are embind class bindings, so the JS-side
     * temporaries own WASM heap memory. push_back/property assignment copy the
     * underlying C++ values, so each temporary must be deleted after use.
     * The caller is responsible for deleting the returned vector.
     */
    buildVectorSimplexData(simplices) {
        const vectorSimplices = new this.module.VectorSimplexData();
        try {
            for (const simplex of simplices) {
                const simplexData = new this.module.SimplexData();
                try {
                    const vertices = new this.module.VectorInt();
                    try {
                        for (const v of simplex.vertices) {
                            vertices.push_back(v);
                        }
                        simplexData.vertices = vertices;
                    }
                    finally {
                        vertices.delete();
                    }
                    simplexData.filtration = simplex.filtration;
                    vectorSimplices.push_back(simplexData);
                }
                finally {
                    simplexData.delete();
                }
            }
            return vectorSimplices;
        }
        catch (error) {
            vectorSimplices.delete();
            throw error;
        }
    }
    /**
     * Convert an Emscripten VectorSimplexData into plain JS Simplex objects.
     *
     * SimplexData is an embind class binding, so vector.get(i) returns an owned
     * handle to a C++ copy, and reading its `vertices` property copies the
     * underlying std::vector<int> into another owned handle. Both must be
     * deleted after use or the WASM heap leaks (two C++ objects per simplex
     * per call). Does NOT delete the vector itself; the caller owns it.
     */
    convertVectorSimplexData(simplicesVector) {
        const simplices = [];
        const size = simplicesVector.size();
        for (let i = 0; i < size; i++) {
            const simplexData = simplicesVector.get(i);
            try {
                const verticesVector = simplexData.vertices;
                try {
                    const vertices = [];
                    const numVertices = verticesVector.size();
                    for (let j = 0; j < numVertices; j++) {
                        vertices.push(verticesVector.get(j));
                    }
                    simplices.push({
                        vertices,
                        filtration: simplexData.filtration
                    });
                }
                finally {
                    verticesVector.delete();
                }
            }
            finally {
                simplexData.delete();
            }
        }
        return simplices;
    }
    /**
     * Compute weighted alpha complex from 3D points with weights
     */
    computeWeightedAlphaComplex(points) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        const coords = pointsToCoordinates(points);
        let vectorCoords = null;
        let simplicesVector = null;
        try {
            vectorCoords = new this.module.VectorDouble();
            for (const coord of coords) {
                vectorCoords.push_back(coord);
            }
            simplicesVector = this.module.computeWeightedAlphaComplex3D(vectorCoords);
            const simplices = this.convertVectorSimplexData(simplicesVector);
            // Analyze results
            const vertexSet = new Set();
            const dimensionCounts = {};
            simplices.forEach((simplex) => {
                simplex.vertices.forEach((v) => vertexSet.add(v));
                const dim = simplex.vertices.length - 1;
                dimensionCounts[dim] = (dimensionCounts[dim] || 0) + 1;
            });
            return {
                simplices,
                vertices: vertexSet.size,
                dimension: Math.max(...Object.keys(dimensionCounts).map(Number), -1),
                dimensionCounts
            };
        }
        catch (error) {
            const err = error;
            throw new Error(`Alpha complex computation failed: ${err.message}`);
        }
        finally {
            if (vectorCoords)
                vectorCoords.delete();
            if (simplicesVector)
                simplicesVector.delete();
        }
    }
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
    computeKFoldCoverComplex(points, k, maxSquaredRadius, maxSimplexDimension = 3) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        if (!Number.isInteger(k) || k < 1) {
            throw new Error(`k must be a positive integer, got ${k}`);
        }
        if (points.length % 3 !== 0) {
            throw new Error(`Points array length (${points.length}) must be a multiple of 3 ` +
                `(x, y, z per point). The k-fold cover complex takes unweighted ` +
                `points; weighted multicover slices are not implemented.`);
        }
        const numPoints = points.length / 3;
        if (numPoints < k + 3) {
            throw new Error(`Need at least k + 3 points to build the order-k mosaic in 3D ` +
                `(k=${k}, n=${numPoints})`);
        }
        if (maxSquaredRadius !== undefined && !(maxSquaredRadius > 0)) {
            throw new Error(`Max squared radius must be positive, got ${maxSquaredRadius}`);
        }
        let vectorPoints = null;
        let result = null;
        let mosaicVector = null;
        let simplicesVector = null;
        try {
            vectorPoints = new this.module.VectorDouble();
            for (const coord of points) {
                vectorPoints.push_back(coord);
            }
            // A non-positive threshold is the C++ side's "no bound" sentinel, so an
            // omitted (or infinite) cutoff goes through as 0 — the same convention
            // computeEllipsoidRipsComplex uses. A non-positive cutoff from the caller
            // was rejected above, so 0 here can only mean "omitted".
            const threshold = maxSquaredRadius !== undefined && Number.isFinite(maxSquaredRadius)
                ? maxSquaredRadius
                : 0;
            result = this.module.computeKFoldCoverComplex(vectorPoints, k, threshold, maxSimplexDimension);
            simplicesVector = result.simplices;
            const simplices = this.convertVectorSimplexData(simplicesVector);
            mosaicVector = result.mosaicVertices;
            const mosaicVertices = [];
            const mosaicCount = mosaicVector.size();
            for (let i = 0; i < mosaicCount; i++) {
                const subset = mosaicVector.get(i);
                try {
                    const ids = [];
                    const n = subset.size();
                    for (let j = 0; j < n; j++)
                        ids.push(subset.get(j));
                    mosaicVertices.push(ids);
                }
                finally {
                    subset.delete();
                }
            }
            const vertexSet = new Set();
            const dimensionCounts = {};
            simplices.forEach((simplex) => {
                simplex.vertices.forEach((v) => vertexSet.add(v));
                const dim = simplex.vertices.length - 1;
                dimensionCounts[dim] = (dimensionCounts[dim] || 0) + 1;
            });
            return {
                simplices,
                mosaicVertices,
                vertices: vertexSet.size,
                dimension: Math.max(...Object.keys(dimensionCounts).map(Number), -1),
                dimensionCounts,
                diagnostics: {
                    mosaicCells: result.numMosaicCells,
                    octahedra: result.numOctahedra,
                    topRhomboids: result.numTopRhomboids,
                    clampedCells: result.numClampedCells,
                    exactSignFallbacks: result.numExactSignFallbacks,
                    intervalAnomalies: result.numIntervalAnomalies,
                    squaredRadiusBound: result.squaredRadiusBound
                }
            };
        }
        catch (error) {
            const err = error;
            throw new Error(`k-fold cover complex computation failed: ${err.message}`);
        }
        finally {
            if (simplicesVector)
                simplicesVector.delete();
            if (mosaicVector)
                mosaicVector.delete();
            if (result)
                result.delete();
            if (vectorPoints)
                vectorPoints.delete();
        }
    }
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
    computeRipsComplex(points, dimension, maxEdgeLength, maxSimplexDimension = 3) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        if (dimension <= 0) {
            throw new Error(`Dimension must be positive, got ${dimension}`);
        }
        if (points.length % dimension !== 0) {
            throw new Error(`Points array length (${points.length}) must be multiple of dimension (${dimension})`);
        }
        if (maxEdgeLength <= 0) {
            throw new Error(`Max edge length must be positive, got ${maxEdgeLength}`);
        }
        if (maxSimplexDimension < 0) {
            throw new Error(`Max simplex dimension must be non-negative, got ${maxSimplexDimension}`);
        }
        let vectorPoints = null;
        let simplicesVector = null;
        try {
            vectorPoints = new this.module.VectorDouble();
            for (const coord of points) {
                vectorPoints.push_back(coord);
            }
            simplicesVector = this.module.computeRipsComplex(vectorPoints, dimension, maxEdgeLength, maxSimplexDimension);
            const simplices = this.convertVectorSimplexData(simplicesVector);
            // Analyze results
            const vertexSet = new Set();
            const dimensionCounts = {};
            simplices.forEach((simplex) => {
                simplex.vertices.forEach((v) => vertexSet.add(v));
                const dim = simplex.vertices.length - 1;
                dimensionCounts[dim] = (dimensionCounts[dim] || 0) + 1;
            });
            return {
                simplices,
                vertices: vertexSet.size,
                dimension: Math.max(...Object.keys(dimensionCounts).map(Number), -1),
                dimensionCounts
            };
        }
        catch (error) {
            const err = error;
            throw new Error(`Rips complex computation failed: ${err.message}`);
        }
        finally {
            if (vectorPoints)
                vectorPoints.delete();
            if (simplicesVector)
                simplicesVector.delete();
        }
    }
    /**
     * Compute Rips complex from a point cloud with the retained manual
     * simplex-tree expansion fallback.
     */
    computeRipsComplexManual(points, dimension, maxEdgeLength, maxSimplexDimension = 3) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        if (dimension <= 0) {
            throw new Error(`Dimension must be positive, got ${dimension}`);
        }
        if (points.length % dimension !== 0) {
            throw new Error(`Points array length (${points.length}) must be multiple of dimension (${dimension})`);
        }
        if (maxEdgeLength <= 0) {
            throw new Error(`Max edge length must be positive, got ${maxEdgeLength}`);
        }
        if (maxSimplexDimension < 0) {
            throw new Error(`Max simplex dimension must be non-negative, got ${maxSimplexDimension}`);
        }
        let vectorPoints = null;
        let simplicesVector = null;
        try {
            vectorPoints = new this.module.VectorDouble();
            for (const coord of points) {
                vectorPoints.push_back(coord);
            }
            simplicesVector = this.module.computeRipsComplexManual(vectorPoints, dimension, maxEdgeLength, maxSimplexDimension);
            const simplices = this.convertVectorSimplexData(simplicesVector);
            const vertexSet = new Set();
            const dimensionCounts = {};
            simplices.forEach((simplex) => {
                simplex.vertices.forEach((v) => vertexSet.add(v));
                const dim = simplex.vertices.length - 1;
                dimensionCounts[dim] = (dimensionCounts[dim] || 0) + 1;
            });
            return {
                simplices,
                vertices: vertexSet.size,
                dimension: Math.max(...Object.keys(dimensionCounts).map(Number), -1),
                dimensionCounts
            };
        }
        catch (error) {
            const err = error;
            throw new Error(`Manual Rips complex computation failed: ${err.message}`);
        }
        finally {
            if (vectorPoints)
                vectorPoints.delete();
            if (simplicesVector)
                simplicesVector.delete();
        }
    }
    /**
     * Compute Rips complex from pre-computed distance matrix.
     * Constructed by GUDHI `Rips_complex` in the WASM module.
     * @param distanceMatrix Flattened distance matrix [d(0,0), d(0,1), ..., d(n-1,n-1)]
     * @param numPoints Number of points
     * @param maxEdgeLength Maximum distance for edges
     * @param maxSimplexDimension Maximum simplex dimension (default: 3)
     */
    computeRipsComplexFromDistanceMatrix(distanceMatrix, numPoints, maxEdgeLength, maxSimplexDimension = 3) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        if (distanceMatrix.length !== numPoints * numPoints) {
            throw new Error(`Distance matrix size (${distanceMatrix.length}) must equal numPoints^2 (${numPoints * numPoints})`);
        }
        if (numPoints < 2) {
            throw new Error(`Need at least 2 points, got ${numPoints}`);
        }
        if (maxEdgeLength <= 0) {
            throw new Error(`Max edge length must be positive, got ${maxEdgeLength}`);
        }
        if (maxSimplexDimension < 0) {
            throw new Error(`Max simplex dimension must be non-negative, got ${maxSimplexDimension}`);
        }
        let vectorDistances = null;
        let simplicesVector = null;
        try {
            vectorDistances = new this.module.VectorDouble();
            for (const dist of distanceMatrix) {
                vectorDistances.push_back(dist);
            }
            simplicesVector = this.module.computeRipsComplexFromDistanceMatrix(vectorDistances, numPoints, maxEdgeLength, maxSimplexDimension);
            const simplices = this.convertVectorSimplexData(simplicesVector);
            // Analyze results
            const vertexSet = new Set();
            const dimensionCounts = {};
            simplices.forEach((simplex) => {
                simplex.vertices.forEach((v) => vertexSet.add(v));
                const dim = simplex.vertices.length - 1;
                dimensionCounts[dim] = (dimensionCounts[dim] || 0) + 1;
            });
            return {
                simplices,
                vertices: vertexSet.size,
                dimension: Math.max(...Object.keys(dimensionCounts).map(Number), -1),
                dimensionCounts
            };
        }
        catch (error) {
            const err = error;
            throw new Error(`Rips complex from distance matrix computation failed: ${err.message}`);
        }
        finally {
            if (vectorDistances)
                vectorDistances.delete();
            if (simplicesVector)
                simplicesVector.delete();
        }
    }
    /**
     * Compute Rips complex from a distance matrix with the retained manual
     * simplex-tree expansion fallback.
     */
    computeRipsComplexFromDistanceMatrixManual(distanceMatrix, numPoints, maxEdgeLength, maxSimplexDimension = 3) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        if (distanceMatrix.length !== numPoints * numPoints) {
            throw new Error(`Distance matrix size (${distanceMatrix.length}) must equal numPoints^2 (${numPoints * numPoints})`);
        }
        if (numPoints < 2) {
            throw new Error(`Need at least 2 points, got ${numPoints}`);
        }
        if (maxEdgeLength <= 0) {
            throw new Error(`Max edge length must be positive, got ${maxEdgeLength}`);
        }
        if (maxSimplexDimension < 0) {
            throw new Error(`Max simplex dimension must be non-negative, got ${maxSimplexDimension}`);
        }
        let vectorDistances = null;
        let simplicesVector = null;
        try {
            vectorDistances = new this.module.VectorDouble();
            for (const dist of distanceMatrix) {
                vectorDistances.push_back(dist);
            }
            simplicesVector = this.module.computeRipsComplexFromDistanceMatrixManual(vectorDistances, numPoints, maxEdgeLength, maxSimplexDimension);
            const simplices = this.convertVectorSimplexData(simplicesVector);
            const vertexSet = new Set();
            const dimensionCounts = {};
            simplices.forEach((simplex) => {
                simplex.vertices.forEach((v) => vertexSet.add(v));
                const dim = simplex.vertices.length - 1;
                dimensionCounts[dim] = (dimensionCounts[dim] || 0) + 1;
            });
            return {
                simplices,
                vertices: vertexSet.size,
                dimension: Math.max(...Object.keys(dimensionCounts).map(Number), -1),
                dimensionCounts
            };
        }
        catch (error) {
            const err = error;
            throw new Error(`Manual Rips complex from distance matrix computation failed: ${err.message}`);
        }
        finally {
            if (vectorDistances)
                vectorDistances.delete();
            if (simplicesVector)
                simplicesVector.delete();
        }
    }
    /**
     * Compute Čech complex from point cloud
     * Uses minimal enclosing ball (MEB) radius for filtration (exact geometry)
     * @param points Flat array of coordinates [x0, y0, z0, x1, y1, z1, ...]
     * @param dimension Spatial dimension (2 for 2D, 3 for 3D, etc.)
     * @param maxRadius Maximum MEB radius threshold
     * @param maxSimplexDimension Maximum simplex dimension (default: 3)
     */
    computeCechComplex(points, dimension, maxRadius, maxSimplexDimension = 3) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        // Check dimension first (matches C++ validation order)
        if (dimension <= 0) {
            throw new Error(`Dimension must be positive, got ${dimension}`);
        }
        if (points.length % dimension !== 0) {
            throw new Error(`Points array length (${points.length}) must be multiple of dimension (${dimension})`);
        }
        const numPoints = points.length / dimension;
        if (numPoints < 2) {
            throw new Error(`Need at least 2 points for Čech complex, got ${numPoints}`);
        }
        if (maxRadius <= 0) {
            throw new Error(`Max radius must be positive, got ${maxRadius}`);
        }
        let vectorPoints = null;
        let simplicesVector = null;
        try {
            vectorPoints = new this.module.VectorDouble();
            for (const coord of points) {
                vectorPoints.push_back(coord);
            }
            simplicesVector = this.module.computeCechComplex(vectorPoints, dimension, maxRadius, maxSimplexDimension);
            const simplices = this.convertVectorSimplexData(simplicesVector);
            // Analyze results
            const vertexSet = new Set();
            const dimensionCounts = {};
            simplices.forEach((simplex) => {
                simplex.vertices.forEach((v) => vertexSet.add(v));
                const dim = simplex.vertices.length - 1;
                dimensionCounts[dim] = (dimensionCounts[dim] || 0) + 1;
            });
            return {
                simplices,
                vertices: vertexSet.size,
                dimension: Math.max(...Object.keys(dimensionCounts).map(Number), -1),
                dimensionCounts
            };
        }
        catch (error) {
            const err = error;
            throw new Error(`Čech complex computation failed: ${err.message}`);
        }
        finally {
            if (vectorPoints)
                vectorPoints.delete();
            if (simplicesVector)
                simplicesVector.delete();
        }
    }
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
    computeEllipsoidRipsComplex(points, dimension, neighborhoodSize, axesMode, maxSimplexDimension = 2, maxFiltration) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        const axesRatio = this.validateEllipsoidInput(points, dimension, neighborhoodSize, axesMode);
        if (maxSimplexDimension < 0) {
            throw new Error(`Max simplex dimension must be non-negative, got ${maxSimplexDimension}`);
        }
        if (maxFiltration !== undefined && !(maxFiltration > 0)) {
            throw new Error(`Max filtration must be positive, got ${maxFiltration}`);
        }
        let vectorPoints = null;
        let simplicesVector = null;
        try {
            vectorPoints = new this.module.VectorDouble();
            for (const coord of points) {
                vectorPoints.push_back(coord);
            }
            simplicesVector = this.module.computeEllipsoidRipsComplex(vectorPoints, dimension, neighborhoodSize, axesRatio, maxSimplexDimension, maxFiltration ?? 0);
            const simplices = this.convertVectorSimplexData(simplicesVector);
            const vertexSet = new Set();
            const dimensionCounts = {};
            simplices.forEach((simplex) => {
                simplex.vertices.forEach((v) => vertexSet.add(v));
                const dim = simplex.vertices.length - 1;
                dimensionCounts[dim] = (dimensionCounts[dim] || 0) + 1;
            });
            return {
                simplices,
                vertices: vertexSet.size,
                dimension: Math.max(...Object.keys(dimensionCounts).map(Number), -1),
                dimensionCounts
            };
        }
        catch (error) {
            const err = error;
            throw new Error(`Ellipsoid complex computation failed: ${err.message}`);
        }
        finally {
            if (vectorPoints)
                vectorPoints.delete();
            if (simplicesVector)
                simplicesVector.delete();
        }
    }
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
    computeEllipsoidCechComplex(points, dimension, neighborhoodSize, axesMode, maxSimplexDimension = 2, maxFiltration) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        const axesRatio = this.validateEllipsoidInput(points, dimension, neighborhoodSize, axesMode);
        if (maxSimplexDimension < 0) {
            throw new Error(`Max simplex dimension must be non-negative, got ${maxSimplexDimension}`);
        }
        if (maxFiltration !== undefined && !(maxFiltration > 0)) {
            throw new Error(`Max filtration must be positive, got ${maxFiltration}`);
        }
        let vectorPoints = null;
        let simplicesVector = null;
        try {
            vectorPoints = new this.module.VectorDouble();
            for (const coord of points) {
                vectorPoints.push_back(coord);
            }
            simplicesVector = this.module.computeEllipsoidCechComplex(vectorPoints, dimension, neighborhoodSize, axesRatio, maxSimplexDimension, maxFiltration ?? 0);
            const simplices = this.convertVectorSimplexData(simplicesVector);
            const vertexSet = new Set();
            const dimensionCounts = {};
            simplices.forEach((simplex) => {
                simplex.vertices.forEach((v) => vertexSet.add(v));
                const dim = simplex.vertices.length - 1;
                dimensionCounts[dim] = (dimensionCounts[dim] || 0) + 1;
            });
            return {
                simplices,
                vertices: vertexSet.size,
                dimension: Math.max(...Object.keys(dimensionCounts).map(Number), -1),
                dimensionCounts
            };
        }
        catch (error) {
            const err = error;
            throw new Error(`Ellipsoidal Čech complex computation failed: ${err.message}`);
        }
        finally {
            if (vectorPoints)
                vectorPoints.delete();
            if (simplicesVector)
                simplicesVector.delete();
        }
    }
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
    computeEllipsoidGeometry(points, dimension, neighborhoodSize, axesMode) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        const axesRatio = this.validateEllipsoidInput(points, dimension, neighborhoodSize, axesMode);
        let vectorPoints = null;
        let flatVector = null;
        try {
            vectorPoints = new this.module.VectorDouble();
            for (const coord of points) {
                vectorPoints.push_back(coord);
            }
            flatVector = this.module.computeEllipsoidGeometry(vectorPoints, dimension, neighborhoodSize, axesRatio);
            const stride = 2 * dimension + dimension * dimension;
            const count = flatVector.size() / stride;
            const out = [];
            for (let i = 0; i < count; i++) {
                let at = i * stride;
                const center = [];
                for (let d = 0; d < dimension; d++)
                    center.push(flatVector.get(at++));
                const frame = [];
                for (let a = 0; a < dimension; a++) {
                    const row = [];
                    for (let d = 0; d < dimension; d++)
                        row.push(flatVector.get(at++));
                    frame.push(row);
                }
                const semiAxes = [];
                for (let d = 0; d < dimension; d++)
                    semiAxes.push(flatVector.get(at++));
                out.push({ center, frame, semiAxes });
            }
            return out;
        }
        catch (error) {
            const err = error;
            throw new Error(`Ellipsoid geometry computation failed: ${err.message}`);
        }
        finally {
            if (vectorPoints)
                vectorPoints.delete();
            if (flatVector)
                flatVector.delete();
        }
    }
    /**
     * Shared argument checks for the ellipsoid entry points. Returns the numeric
     * axes ratio the WASM layer expects, where a non-positive value selects the
     * singular-value mode.
     */
    validateEllipsoidInput(points, dimension, neighborhoodSize, axesMode) {
        if (dimension !== 2 && dimension !== 3) {
            throw new Error(`Ellipsoid complex supports dimension 2 and 3 only, got ${dimension}`);
        }
        if (points.length % dimension !== 0) {
            throw new Error(`Points array length (${points.length}) must be multiple of dimension (${dimension})`);
        }
        const numPoints = points.length / dimension;
        if (numPoints < 2) {
            throw new Error(`Need at least 2 points for the ellipsoid complex, got ${numPoints}`);
        }
        if (!Number.isInteger(neighborhoodSize) || neighborhoodSize < 2) {
            throw new Error(`Neighborhood size must be an integer >= 2, got ${neighborhoodSize}`);
        }
        if (axesMode === 'pca')
            return 0;
        if (typeof axesMode !== 'number' || !Number.isFinite(axesMode) || axesMode < 1) {
            throw new Error(`Axes mode must be a finite ratio >= 1 or 'pca', got ${String(axesMode)}`);
        }
        return axesMode;
    }
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
    computeWingComplex(points2d, q, theta, normalsOrK, maxSimplexDimension = 3, maxEps = Number.POSITIVE_INFINITY) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        const normalsFlat = this.validateWingInput(points2d, q, theta, normalsOrK);
        if (maxSimplexDimension < 0) {
            throw new Error(`maxSimplexDimension must be non-negative, got ${maxSimplexDimension}`);
        }
        if (!(maxEps > 0) && maxEps !== Number.POSITIVE_INFINITY) {
            throw new Error(`maxEps must be positive, got ${maxEps}`);
        }
        let vectorPoints = null;
        let vectorNormals = null;
        let simplicesVector = null;
        try {
            vectorPoints = new this.module.VectorDouble();
            for (const coord of points2d) {
                vectorPoints.push_back(coord);
            }
            vectorNormals = new this.module.VectorDouble();
            for (const v of normalsFlat) {
                vectorNormals.push_back(v);
            }
            simplicesVector = this.module.computeWingComplex(vectorPoints, q, theta, vectorNormals, maxSimplexDimension, maxEps);
            const simplices = this.convertVectorSimplexData(simplicesVector);
            const vertexSet = new Set();
            const dimensionCounts = {};
            simplices.forEach((simplex) => {
                simplex.vertices.forEach((v) => vertexSet.add(v));
                const dim = simplex.vertices.length - 1;
                dimensionCounts[dim] = (dimensionCounts[dim] || 0) + 1;
            });
            return {
                simplices,
                vertices: vertexSet.size,
                dimension: Math.max(...Object.keys(dimensionCounts).map(Number), -1),
                dimensionCounts
            };
        }
        catch (error) {
            const err = error;
            throw new Error(`Wing complex computation failed: ${err.message}`);
        }
        finally {
            if (vectorPoints)
                vectorPoints.delete();
            if (vectorNormals)
                vectorNormals.delete();
            if (simplicesVector)
                simplicesVector.delete();
        }
    }
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
    computeWingGeometry(points2d, q, theta, normalsOrK) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        const normalsFlat = this.validateWingInput(points2d, q, theta, normalsOrK);
        let vectorPoints = null;
        let vectorNormals = null;
        let flatVector = null;
        try {
            vectorPoints = new this.module.VectorDouble();
            for (const coord of points2d) {
                vectorPoints.push_back(coord);
            }
            vectorNormals = new this.module.VectorDouble();
            for (const v of normalsFlat) {
                vectorNormals.push_back(v);
            }
            flatVector = this.module.computeWingGeometry(vectorPoints, q, theta, vectorNormals);
            const stride = 19;
            const count = flatVector.size() / stride;
            const out = [];
            for (let i = 0; i < count; i++) {
                let at = i * stride;
                const point = [flatVector.get(at++), flatVector.get(at++)];
                const normal = [flatVector.get(at++), flatVector.get(at++)];
                const sourceCode = flatVector.get(at++);
                const normalSource = WING_NORMAL_SOURCES[sourceCode];
                if (normalSource === undefined) {
                    throw new Error(`unknown normal provenance code ${sourceCode}`);
                }
                const curvatureRadius = flatVector.get(at++);
                const neighborhoodScale = flatVector.get(at++);
                const outline = [];
                for (let v = 0; v < 6; v++) {
                    outline.push([flatVector.get(at++), flatVector.get(at++)]);
                }
                out.push({
                    point,
                    normal,
                    normalSource,
                    curvatureRadius,
                    neighborhoodScale,
                    outline
                });
            }
            return out;
        }
        catch (error) {
            const err = error;
            throw new Error(`Wing geometry computation failed: ${err.message}`);
        }
        finally {
            if (vectorPoints)
                vectorPoints.delete();
            if (vectorNormals)
                vectorNormals.delete();
            if (flatVector)
                flatVector.delete();
        }
    }
    /**
     * Shared argument checks for the wing entry points, so the complex and the
     * geometry accept and reject exactly the same input. Returns the flat
     * `normalsOrK` the WASM layer expects (length 1 for k, length 2n for supplied
     * normals).
     */
    validateWingInput(points2d, q, theta, normalsOrK) {
        if (!Array.isArray(points2d) || points2d.length % 2 !== 0) {
            throw new Error(`Wing complex is 2D only: points2d length must be even, got ${points2d?.length}`);
        }
        if (!points2d.every((c) => typeof c === 'number' && Number.isFinite(c))) {
            throw new Error('All points2d coordinates must be finite numbers');
        }
        const numPoints = points2d.length / 2;
        if (numPoints < 2) {
            throw new Error(`Need at least 2 points for wing complex, got ${numPoints}`);
        }
        if (!(q >= 0 && q <= 1)) {
            throw new Error(`q must lie in [0, 1], got ${q}`);
        }
        if (!(theta > 0 && theta <= Math.PI / 2)) {
            throw new Error(`theta must lie in (0, pi/2], got ${theta}`);
        }
        const normalsFlat = typeof normalsOrK === 'number'
            ? [normalsOrK]
            : normalsOrK;
        if (normalsFlat.length !== 1 && normalsFlat.length !== points2d.length) {
            throw new Error('normalsOrK must be a scalar k >= 2 or a flat 2n array of unit normals');
        }
        return normalsFlat;
    }
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
    computeBoxFiltration(points, dimension, stepSize, alpha, maxSteps, maxSimplexDimension = 3, includeBoxes = false) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        if (dimension !== 2 && dimension !== 3) {
            throw new Error(`Box filtration supports dimension 2 and 3 only, got ${dimension}`);
        }
        if (!Array.isArray(points) || points.length % dimension !== 0) {
            throw new Error(`Points array length (${points?.length}) must be a multiple of ` +
                `dimension (${dimension})`);
        }
        if (!points.every((c) => typeof c === 'number' && Number.isFinite(c))) {
            throw new Error('All box filtration coordinates must be finite numbers');
        }
        if (!(stepSize > 0) || !Number.isFinite(stepSize)) {
            throw new Error(`Step size must be a positive finite number, got ${stepSize}`);
        }
        if (!(alpha >= 0 && alpha <= 1)) {
            throw new Error(`alpha must lie in [0, 1], got ${alpha}`);
        }
        if (maxSteps !== undefined && (!Number.isInteger(maxSteps) || maxSteps < 1)) {
            throw new Error(`maxSteps must be a positive integer, got ${maxSteps}`);
        }
        if (!Number.isInteger(maxSimplexDimension) || maxSimplexDimension < 0) {
            throw new Error(`maxSimplexDimension must be a non-negative integer, got ${maxSimplexDimension}`);
        }
        let vectorPoints = null;
        let result = null;
        let simplicesVector = null;
        let extentsVector = null;
        try {
            vectorPoints = new this.module.VectorDouble();
            for (const coord of points) {
                vectorPoints.push_back(coord);
            }
            // Non-positive maxSteps is the C++ side's "use the paper's m" sentinel,
            // the same convention computeKFoldCoverComplex uses for its cutoff. A
            // caller's non-positive value was rejected above, so 0 means "omitted".
            result = this.module.computeBoxFiltration(vectorPoints, dimension, stepSize, alpha, maxSteps !== undefined ? maxSteps : 0, maxSimplexDimension, includeBoxes);
            simplicesVector = result.simplices;
            const simplices = this.convertVectorSimplexData(simplicesVector);
            const numBoxes = result.numBoxes;
            const numSteps = result.numSteps;
            let boxes;
            if (includeBoxes) {
                extentsVector = result.boxExtents;
                boxes = [];
                let at = 0;
                for (let step = 0; step <= numSteps; step++) {
                    const perStep = [];
                    for (let box = 0; box < numBoxes; box++) {
                        const lower = [];
                        const upper = [];
                        for (let d = 0; d < dimension; d++)
                            lower.push(extentsVector.get(at++));
                        for (let d = 0; d < dimension; d++)
                            upper.push(extentsVector.get(at++));
                        perStep.push({ lower, upper });
                    }
                    boxes.push(perStep);
                }
            }
            const vertexSet = new Set();
            const dimensionCounts = {};
            simplices.forEach((simplex) => {
                simplex.vertices.forEach((v) => vertexSet.add(v));
                const dim = simplex.vertices.length - 1;
                dimensionCounts[dim] = (dimensionCounts[dim] || 0) + 1;
            });
            return {
                simplices,
                vertices: vertexSet.size,
                dimension: Math.max(...Object.keys(dimensionCounts).map(Number), -1),
                dimensionCounts,
                numSteps,
                stepSize: result.stepSize,
                alpha: result.alpha,
                maxBirthStep: result.maxBirthStep,
                numEdges: result.numEdges,
                ...(boxes !== undefined ? { boxes } : {}),
                diagnostics: {
                    expansions: result.numExpansions,
                    descentSteps: result.numDescentSteps,
                    iterationCapHits: result.numIterationCapHits
                }
            };
        }
        catch (error) {
            const err = error;
            throw new Error(`Box filtration computation failed: ${err.message}`);
        }
        finally {
            if (simplicesVector)
                simplicesVector.delete();
            if (extentsVector)
                extentsVector.delete();
            if (result)
                result.delete();
            if (vectorPoints)
                vectorPoints.delete();
        }
    }
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
    computeEuclideanWitnessComplex(points, dimension, numLandmarks, maxAlphaSquare, maxSimplexDimension = 3) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        // Check dimension first (matches C++ validation order)
        if (dimension <= 0) {
            throw new Error(`Dimension must be positive, got ${dimension}`);
        }
        if (points.length % dimension !== 0) {
            throw new Error(`Points array length (${points.length}) must be multiple of dimension (${dimension})`);
        }
        const numPoints = points.length / dimension;
        if (numPoints < 1) {
            throw new Error(`Need at least 1 point for Euclidean witness complex, got ${numPoints}`);
        }
        if (numLandmarks < 1) {
            throw new Error(`numLandmarks must be at least 1, got ${numLandmarks}`);
        }
        if (maxAlphaSquare < 0) {
            throw new Error(`maxAlphaSquare must be non-negative, got ${maxAlphaSquare}`);
        }
        if (maxSimplexDimension < 0) {
            throw new Error(`maxSimplexDimension must be non-negative, got ${maxSimplexDimension}`);
        }
        let vectorPoints = null;
        let simplicesVector = null;
        try {
            vectorPoints = new this.module.VectorDouble();
            for (const coord of points) {
                vectorPoints.push_back(coord);
            }
            simplicesVector = this.module.computeEuclideanWitnessComplex(vectorPoints, dimension, numLandmarks, maxAlphaSquare, maxSimplexDimension);
            const simplices = this.convertVectorSimplexData(simplicesVector);
            // Analyze results
            const vertexSet = new Set();
            const dimensionCounts = {};
            simplices.forEach((simplex) => {
                simplex.vertices.forEach((v) => vertexSet.add(v));
                const dim = simplex.vertices.length - 1;
                dimensionCounts[dim] = (dimensionCounts[dim] || 0) + 1;
            });
            return {
                simplices,
                vertices: vertexSet.size,
                dimension: Math.max(...Object.keys(dimensionCounts).map(Number), -1),
                dimensionCounts
            };
        }
        catch (error) {
            const err = error;
            throw new Error(`Euclidean witness complex computation failed: ${err.message}`);
        }
        finally {
            if (vectorPoints)
                vectorPoints.delete();
            if (simplicesVector)
                simplicesVector.delete();
        }
    }
    /**
     * Compute persistent homology from simplicial complex
     */
    computePersistence(simplices, coeffField = 2) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        if (simplices.length === 0) {
            throw new Error('Cannot compute persistence from empty complex');
        }
        let vectorSimplices = null;
        let pairsVector = null;
        try {
            // Convert simplices to WASM format
            vectorSimplices = this.buildVectorSimplexData(simplices);
            // Compute persistence
            pairsVector = this.module.computePersistence(vectorSimplices, coeffField);
            // Convert to JavaScript array
            const pairs = [];
            for (let i = 0; i < pairsVector.size(); i++) {
                const pair = pairsVector.get(i);
                pairs.push({
                    dimension: pair.dimension,
                    birth: pair.birth,
                    death: pair.death
                });
            }
            // Analyze results
            const pairsByDimension = {};
            let essentialCount = 0;
            pairs.forEach(pair => {
                pairsByDimension[pair.dimension] = (pairsByDimension[pair.dimension] || 0) + 1;
                if (pair.death === Infinity) {
                    essentialCount++;
                }
            });
            // reduce, not Math.max(...spread): spreading overflows the call stack
            // once diagrams reach ~100k+ pairs
            const dimension = pairs.reduce((max, p) => (p.dimension > max ? p.dimension : max), 0);
            return {
                pairs,
                dimension,
                pairsByDimension,
                essentialCount
            };
        }
        catch (error) {
            const err = error;
            throw new Error(`Persistence computation failed: ${err.message}`);
        }
        finally {
            if (vectorSimplices)
                vectorSimplices.delete();
            if (pairsVector)
                pairsVector.delete();
        }
    }
    /**
     * Compute Betti numbers at a specific filtration value
     */
    computeBettiNumbers(simplices, filtrationValue, coeffField = 2) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        let vectorSimplices = null;
        let bettiVector = null;
        try {
            vectorSimplices = this.buildVectorSimplexData(simplices);
            bettiVector = this.module.computeBettiNumbers(vectorSimplices, filtrationValue, coeffField);
            const betti = [];
            for (let i = 0; i < bettiVector.size(); i++) {
                betti.push(bettiVector.get(i));
            }
            return {
                filtration: filtrationValue,
                betti
            };
        }
        catch (error) {
            const err = error;
            throw new Error(`Betti numbers computation failed: ${err.message}`);
        }
        finally {
            if (vectorSimplices)
                vectorSimplices.delete();
            if (bettiVector)
                bettiVector.delete();
        }
    }
    /**
     * Compute bottleneck distance between two persistence diagrams
     * @param pairs1 First persistence diagram (array of persistence pairs)
     * @param pairs2 Second persistence diagram (array of persistence pairs)
     * @param epsilon Approximation parameter (0 for exact, >0 for approximation)
     * @returns Bottleneck distance between the two diagrams
     */
    computeBottleneckDistance(pairs1, pairs2, epsilon = 0) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        let vectorPairs1 = null;
        let vectorPairs2 = null;
        try {
            // Convert to Emscripten vectors
            vectorPairs1 = new this.module.VectorPersistencePair();
            vectorPairs2 = new this.module.VectorPersistencePair();
            // PersistencePair is a value_object, push plain objects
            for (const pair of pairs1) {
                vectorPairs1.push_back({ dimension: pair.dimension, birth: pair.birth, death: pair.death });
            }
            for (const pair of pairs2) {
                vectorPairs2.push_back({ dimension: pair.dimension, birth: pair.birth, death: pair.death });
            }
            return this.module.computeBottleneckDistance(vectorPairs1, vectorPairs2, epsilon);
        }
        catch (error) {
            const err = error;
            throw new Error(`Bottleneck distance computation failed: ${err.message}`);
        }
        finally {
            if (vectorPairs1)
                vectorPairs1.delete();
            if (vectorPairs2)
                vectorPairs2.delete();
        }
    }
    /**
     * Compute bottleneck distance for a specific dimension only
     * @param pairs1 First persistence diagram
     * @param pairs2 Second persistence diagram
     * @param dimension Only compare features in this dimension
     * @param epsilon Approximation parameter (0 for exact, >0 for approximation)
     * @returns Bottleneck distance for the specified dimension
     */
    computeBottleneckDistanceForDimension(pairs1, pairs2, dimension, epsilon = 0) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        let vectorPairs1 = null;
        let vectorPairs2 = null;
        try {
            // Convert to Emscripten vectors
            vectorPairs1 = new this.module.VectorPersistencePair();
            vectorPairs2 = new this.module.VectorPersistencePair();
            // PersistencePair is a value_object, push plain objects
            for (const pair of pairs1) {
                vectorPairs1.push_back({ dimension: pair.dimension, birth: pair.birth, death: pair.death });
            }
            for (const pair of pairs2) {
                vectorPairs2.push_back({ dimension: pair.dimension, birth: pair.birth, death: pair.death });
            }
            return this.module.computeBottleneckDistanceForDimension(vectorPairs1, vectorPairs2, dimension, epsilon);
        }
        catch (error) {
            const err = error;
            throw new Error(`Bottleneck distance computation failed: ${err.message}`);
        }
        finally {
            if (vectorPairs1)
                vectorPairs1.delete();
            if (vectorPairs2)
                vectorPairs2.delete();
        }
    }
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
    computeWassersteinDistance(pairs1, pairs2, q = 2) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        validateWassersteinExponent(q);
        let vectorPairs1 = null;
        let vectorPairs2 = null;
        try {
            // Convert to Emscripten vectors
            vectorPairs1 = new this.module.VectorPersistencePair();
            vectorPairs2 = new this.module.VectorPersistencePair();
            // PersistencePair is a value_object, push plain objects
            for (const pair of pairs1) {
                vectorPairs1.push_back({ dimension: pair.dimension, birth: pair.birth, death: pair.death });
            }
            for (const pair of pairs2) {
                vectorPairs2.push_back({ dimension: pair.dimension, birth: pair.birth, death: pair.death });
            }
            return this.module.computeWassersteinDistance(vectorPairs1, vectorPairs2, q);
        }
        catch (error) {
            const err = error;
            throw new Error(`Wasserstein distance computation failed: ${err.message}`);
        }
        finally {
            if (vectorPairs1)
                vectorPairs1.delete();
            if (vectorPairs2)
                vectorPairs2.delete();
        }
    }
    /**
     * Compute q-Wasserstein distance for a specific dimension only.
     * Uses Hera's optimal-transport implementation.
     * @param pairs1 First persistence diagram
     * @param pairs2 Second persistence diagram
     * @param dimension Only compare features in this dimension
     * @param q Wasserstein exponent (1, 2, etc.; use Infinity for bottleneck)
     * @returns q-Wasserstein optimal-transport distance for the specified dimension
     */
    computeWassersteinDistanceForDimension(pairs1, pairs2, dimension, q = 2) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        validateWassersteinExponent(q);
        let vectorPairs1 = null;
        let vectorPairs2 = null;
        try {
            // Convert to Emscripten vectors
            vectorPairs1 = new this.module.VectorPersistencePair();
            vectorPairs2 = new this.module.VectorPersistencePair();
            // PersistencePair is a value_object, push plain objects
            for (const pair of pairs1) {
                vectorPairs1.push_back({ dimension: pair.dimension, birth: pair.birth, death: pair.death });
            }
            for (const pair of pairs2) {
                vectorPairs2.push_back({ dimension: pair.dimension, birth: pair.birth, death: pair.death });
            }
            return this.module.computeWassersteinDistanceForDimension(vectorPairs1, vectorPairs2, dimension, q);
        }
        catch (error) {
            const err = error;
            throw new Error(`Wasserstein distance computation failed: ${err.message}`);
        }
        finally {
            if (vectorPairs1)
                vectorPairs1.delete();
            if (vectorPairs2)
                vectorPairs2.delete();
        }
    }
    /**
     * Compute the retained greedy q-Wasserstein approximation.
     * This is not optimal transport. For q = Infinity it delegates to exact
     * bottleneck distance.
     */
    computeWassersteinDistanceGreedy(pairs1, pairs2, q = 2) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        validateWassersteinExponent(q);
        let vectorPairs1 = null;
        let vectorPairs2 = null;
        try {
            vectorPairs1 = new this.module.VectorPersistencePair();
            vectorPairs2 = new this.module.VectorPersistencePair();
            for (const pair of pairs1) {
                vectorPairs1.push_back({ dimension: pair.dimension, birth: pair.birth, death: pair.death });
            }
            for (const pair of pairs2) {
                vectorPairs2.push_back({ dimension: pair.dimension, birth: pair.birth, death: pair.death });
            }
            return this.module.computeWassersteinDistanceGreedy(vectorPairs1, vectorPairs2, q);
        }
        catch (error) {
            const err = error;
            throw new Error(`Greedy Wasserstein distance computation failed: ${err.message}`);
        }
        finally {
            if (vectorPairs1)
                vectorPairs1.delete();
            if (vectorPairs2)
                vectorPairs2.delete();
        }
    }
    /**
     * Compute the retained greedy q-Wasserstein approximation after filtering
     * both diagrams to one homology dimension. This is not optimal transport.
     */
    computeWassersteinDistanceForDimensionGreedy(pairs1, pairs2, dimension, q = 2) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        validateWassersteinExponent(q);
        let vectorPairs1 = null;
        let vectorPairs2 = null;
        try {
            vectorPairs1 = new this.module.VectorPersistencePair();
            vectorPairs2 = new this.module.VectorPersistencePair();
            for (const pair of pairs1) {
                vectorPairs1.push_back({ dimension: pair.dimension, birth: pair.birth, death: pair.death });
            }
            for (const pair of pairs2) {
                vectorPairs2.push_back({ dimension: pair.dimension, birth: pair.birth, death: pair.death });
            }
            return this.module.computeWassersteinDistanceForDimensionGreedy(vectorPairs1, vectorPairs2, dimension, q);
        }
        catch (error) {
            const err = error;
            throw new Error(`Greedy Wasserstein distance computation failed: ${err.message}`);
        }
        finally {
            if (vectorPairs1)
                vectorPairs1.delete();
            if (vectorPairs2)
                vectorPairs2.delete();
        }
    }
    /**
     * Complete TDA pipeline: compute alpha complex + persistent homology
     */
    computeAlphaComplexPersistence(points, coeffField = 2) {
        const complex = this.computeWeightedAlphaComplex(points);
        const persistence = this.computePersistence(complex.simplices, coeffField);
        const diagram = createPersistenceDiagram(persistence.pairs);
        return {
            complex,
            persistence,
            diagram
        };
    }
    /**
     * Complete TDA pipeline: compute Rips complex + persistent homology.
     *
     * Rips construction and persistence are both GUDHI native.
     */
    computeRipsComplexPersistence(points, dimension, maxEdgeLength, maxSimplexDimension = 3, coeffField = 2) {
        const complex = this.computeRipsComplex(points, dimension, maxEdgeLength, maxSimplexDimension);
        const persistence = this.computePersistence(complex.simplices, coeffField);
        const diagram = createPersistenceDiagram(persistence.pairs);
        return {
            complex,
            persistence,
            diagram
        };
    }
    /**
     * Compute Betti curve - Betti numbers as a function of filtration value
     *
     * @param simplices - Simplicial complex simplices
     * @param filtrationValues - Array of filtration values at which to compute Betti numbers
     * @param coeffField - Coefficient field (default: 2)
     * @returns Array of Betti number vectors, one per filtration value
     */
    computeBettiCurve(simplices, filtrationValues, coeffField = 2) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        if (simplices.length === 0) {
            throw new Error('Cannot compute Betti curve from empty simplicial complex');
        }
        if (filtrationValues.length === 0) {
            throw new Error('Must provide at least one filtration value');
        }
        let vectorSimplices = null;
        let vectorFiltrationValues = null;
        try {
            // Convert simplices to WASM vector
            vectorSimplices = this.buildVectorSimplexData(simplices);
            // Convert filtration values to WASM vector
            vectorFiltrationValues = new this.module.VectorDouble();
            for (const fv of filtrationValues) {
                vectorFiltrationValues.push_back(fv);
            }
            // Compute Betti curve (now returns JavaScript array directly)
            const result = this.module.computeBettiCurve(vectorSimplices, vectorFiltrationValues, coeffField);
            return result;
        }
        catch (error) {
            const err = error;
            throw new Error(`Betti curve computation failed: ${err.message}`);
        }
        finally {
            if (vectorSimplices)
                vectorSimplices.delete();
            if (vectorFiltrationValues)
                vectorFiltrationValues.delete();
        }
    }
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
    computePersistenceLandscape(pairs, level, evaluationPoints) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        if (level < 1) {
            throw new Error(`Landscape level must be at least 1 (levels are 1-indexed; 1 is the first/largest landscape), got ${level}`);
        }
        if (evaluationPoints.length === 0) {
            throw new Error('Must provide at least one evaluation point');
        }
        let vectorPairs = null;
        let vectorEvalPoints = null;
        let resultVector = null;
        try {
            // Convert pairs to WASM vector
            vectorPairs = new this.module.VectorPersistencePair();
            for (const pair of pairs) {
                vectorPairs.push_back({
                    dimension: pair.dimension,
                    birth: pair.birth,
                    death: pair.death
                });
            }
            // Convert evaluation points to WASM vector
            vectorEvalPoints = new this.module.VectorDouble();
            for (const x of evaluationPoints) {
                vectorEvalPoints.push_back(x);
            }
            // Compute landscape
            resultVector = this.module.computePersistenceLandscape(vectorPairs, level, vectorEvalPoints);
            // Convert result back to JavaScript
            const result = [];
            for (let i = 0; i < resultVector.size(); i++) {
                result.push(resultVector.get(i));
            }
            return result;
        }
        catch (error) {
            const err = error;
            throw new Error(`Persistence landscape computation failed: ${err.message}`);
        }
        finally {
            if (vectorPairs)
                vectorPairs.delete();
            if (vectorEvalPoints)
                vectorEvalPoints.delete();
            if (resultVector)
                resultVector.delete();
        }
    }
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
    computePersistenceImage(pairs, resolution, bounds, sigma = 0.1, weightPower = 1.0) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        if (pairs.length === 0) {
            throw new Error('Cannot compute persistence image from empty persistence pairs');
        }
        // Parse resolution
        let resolutionX;
        let resolutionY;
        if (typeof resolution === 'number') {
            resolutionX = resolution;
            resolutionY = resolution;
        }
        else {
            [resolutionX, resolutionY] = resolution;
        }
        if (resolutionX <= 0 || resolutionY <= 0) {
            throw new Error('Resolution must be positive');
        }
        // Calculate bounds if 'auto'
        let birthMin;
        let birthMax;
        let persMin;
        let persMax;
        if (bounds === 'auto') {
            // Calculate bounds from data
            birthMin = Infinity;
            birthMax = -Infinity;
            persMin = 0; // Persistence is always non-negative
            persMax = -Infinity;
            for (const pair of pairs) {
                if (!isFinite(pair.death))
                    continue;
                const birth = pair.birth;
                const pers = pair.death - pair.birth;
                if (birth < birthMin)
                    birthMin = birth;
                if (birth > birthMax)
                    birthMax = birth;
                if (pers > persMax)
                    persMax = pers;
            }
            // Add padding (10%)
            let birthRange = birthMax - birthMin;
            let persRange = persMax - persMin;
            // If range is too small, use a minimum range
            if (birthRange < 1e-10) {
                birthRange = 1.0; // minimum range
                const center = (birthMin + birthMax) / 2;
                birthMin = center - birthRange / 2;
                birthMax = center + birthRange / 2;
            }
            else {
                const birthPadding = birthRange * 0.1;
                birthMin -= birthPadding;
                birthMax += birthPadding;
            }
            if (persRange < 1e-10) {
                persMax = 1.0; // minimum max persistence
            }
            else {
                const persPadding = persRange * 0.1;
                persMax += persPadding;
            }
        }
        else {
            birthMin = bounds.birthMin;
            birthMax = bounds.birthMax;
            persMin = bounds.persMin;
            persMax = bounds.persMax;
        }
        if (sigma <= 0) {
            throw new Error('Sigma must be positive');
        }
        let vectorPairs = null;
        try {
            // Convert pairs to WASM vector
            vectorPairs = new this.module.VectorPersistencePair();
            for (const pair of pairs) {
                vectorPairs.push_back({
                    dimension: pair.dimension,
                    birth: pair.birth,
                    death: pair.death
                });
            }
            // Compute persistence image
            const imageFlat = this.module.computePersistenceImage(vectorPairs, resolutionX, resolutionY, birthMin, birthMax, persMin, persMax, sigma, weightPower);
            return {
                image: imageFlat,
                width: resolutionX,
                height: resolutionY,
                bounds: { birthMin, birthMax, persMin, persMax }
            };
        }
        catch (error) {
            const err = error;
            throw new Error(`Persistence image computation failed: ${err.message}`);
        }
        finally {
            if (vectorPairs)
                vectorPairs.delete();
        }
    }
    // ===========================================================================
    // ZIGZAG PERSISTENCE
    // ===========================================================================
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
    computeZigzagPersistence(operations) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        validateZigzagOperations(operations);
        let vectorOps = null;
        try {
            // Convert operations to flat array format
            const flatOps = operationsToFlat(operations);
            // Create WASM vector
            vectorOps = new this.module.VectorDouble();
            for (const val of flatOps) {
                vectorOps.push_back(val);
            }
            // Call WASM function
            const barsArray = this.module.computeZigzagPersistenceFromFlat(vectorOps);
            // Convert result to typed array
            const bars = [];
            for (let i = 0; i < barsArray.length; i++) {
                const bar = barsArray[i];
                bars.push({
                    dimension: bar.dimension,
                    birth_index: bar.birth,
                    death_index: bar.death
                });
            }
            return {
                bars,
                numOperations: operations.length
            };
        }
        catch (error) {
            const err = error;
            throw new Error(`Zigzag persistence computation failed: ${err.message}`);
        }
        finally {
            if (vectorOps)
                vectorOps.delete();
        }
    }
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
    computeFilteredZigzagPersistence(operations) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        validateZigzagOperations(operations);
        let vectorOps = null;
        try {
            // Convert operations to flat array format
            const flatOps = operationsToFlat(operations);
            // Create WASM vector
            vectorOps = new this.module.VectorDouble();
            for (const val of flatOps) {
                vectorOps.push_back(val);
            }
            // Call WASM function
            const barsArray = this.module.computeFilteredZigzagPersistenceFromFlat(vectorOps);
            // Convert result to typed array
            const bars = [];
            for (let i = 0; i < barsArray.length; i++) {
                const bar = barsArray[i];
                bars.push({
                    dimension: bar.dimension,
                    birth_value: bar.birth,
                    death_value: bar.death
                });
            }
            return {
                bars,
                numOperations: operations.length
            };
        }
        catch (error) {
            const err = error;
            throw new Error(`Filtered zigzag persistence computation failed: ${err.message}`);
        }
        finally {
            if (vectorOps)
                vectorOps.delete();
        }
    }
    // ===========================================================================
    // CUBICAL COMPLEX
    // ===========================================================================
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
    computeCubicalComplex(dimensions, data) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        validateCubicalInput(dimensions, data);
        const vectorDims = new this.module.VectorUnsigned();
        const vectorData = new this.module.VectorDouble();
        try {
            for (const d of dimensions) {
                vectorDims.push_back(d);
            }
            for (const v of data) {
                vectorData.push_back(v);
            }
            const result = this.module.computeCubicalComplex(vectorDims, vectorData);
            const simplices = this.convertVectorSimplexData(result);
            result.delete();
            return {
                simplices,
                dimensions: [...dimensions],
                totalCells: simplices.length
            };
        }
        finally {
            vectorDims.delete();
            vectorData.delete();
        }
    }
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
    computeCubicalComplex2D(imageData, width, height) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        validateCubicalInput([height, width], imageData);
        const vectorData = new this.module.VectorDouble();
        try {
            for (const v of imageData) {
                vectorData.push_back(v);
            }
            const result = this.module.computeCubicalComplex2D(vectorData, width, height);
            const simplices = this.convertVectorSimplexData(result);
            result.delete();
            return {
                simplices,
                dimensions: [height, width],
                totalCells: simplices.length
            };
        }
        finally {
            vectorData.delete();
        }
    }
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
    computeCubicalComplex3D(volumeData, width, height, depth) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        validateCubicalInput([depth, height, width], volumeData);
        const vectorData = new this.module.VectorDouble();
        try {
            for (const v of volumeData) {
                vectorData.push_back(v);
            }
            const result = this.module.computeCubicalComplex3D(vectorData, width, height, depth);
            const simplices = this.convertVectorSimplexData(result);
            result.delete();
            return {
                simplices,
                dimensions: [depth, height, width],
                totalCells: simplices.length
            };
        }
        finally {
            vectorData.delete();
        }
    }
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
    computeCubicalPersistence(dimensions, data, coeffField = 2) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        validateCubicalInput(dimensions, data);
        const vectorDims = new this.module.VectorUnsigned();
        const vectorData = new this.module.VectorDouble();
        try {
            for (const d of dimensions) {
                vectorDims.push_back(d);
            }
            for (const v of data) {
                vectorData.push_back(v);
            }
            const pairsVector = this.module.computeCubicalPersistence(vectorDims, vectorData, coeffField);
            const pairs = [];
            for (let i = 0; i < pairsVector.size(); i++) {
                const pair = pairsVector.get(i);
                pairs.push({
                    dimension: pair.dimension,
                    birth: pair.birth,
                    death: pair.death
                });
            }
            pairsVector.delete();
            // Analyze results
            const pairsByDimension = {};
            let essentialCount = 0;
            pairs.forEach(pair => {
                pairsByDimension[pair.dimension] = (pairsByDimension[pair.dimension] || 0) + 1;
                if (pair.death === Infinity) {
                    essentialCount++;
                }
            });
            // reduce, not Math.max(...spread): spreading overflows the call stack
            // once diagrams reach ~100k+ pairs
            const dimension = pairs.reduce((max, p) => (p.dimension > max ? p.dimension : max), 0);
            return {
                pairs,
                dimension,
                pairsByDimension,
                essentialCount
            };
        }
        finally {
            vectorDims.delete();
            vectorData.delete();
        }
    }
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
    computeCubicalPersistence2D(imageData, width, height, coeffField = 2) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        validateCubicalInput([height, width], imageData);
        const vectorData = new this.module.VectorDouble();
        try {
            for (const v of imageData) {
                vectorData.push_back(v);
            }
            const pairsVector = this.module.computeCubicalPersistence2D(vectorData, width, height, coeffField);
            const pairs = [];
            for (let i = 0; i < pairsVector.size(); i++) {
                const pair = pairsVector.get(i);
                pairs.push({
                    dimension: pair.dimension,
                    birth: pair.birth,
                    death: pair.death
                });
            }
            pairsVector.delete();
            const pairsByDimension = {};
            let essentialCount = 0;
            pairs.forEach(pair => {
                pairsByDimension[pair.dimension] = (pairsByDimension[pair.dimension] || 0) + 1;
                if (pair.death === Infinity) {
                    essentialCount++;
                }
            });
            // reduce, not Math.max(...spread): spreading overflows the call stack
            // once diagrams reach ~100k+ pairs
            const dimension = pairs.reduce((max, p) => (p.dimension > max ? p.dimension : max), 0);
            return {
                pairs,
                dimension,
                pairsByDimension,
                essentialCount
            };
        }
        finally {
            vectorData.delete();
        }
    }
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
    computeCubicalPersistenceFromVertices2D(vertexData, width, height) {
        if (!this.isInitialized() || !this.module) {
            throw new Error('Module not initialized. Call initialize() first.');
        }
        validateCubicalInput([height, width], vertexData);
        const typedData = vertexData instanceof Float64Array
            ? vertexData
            : Float64Array.from(vertexData);
        const pairsVector = this.module.computeCubicalPersistenceFromVertices2D(typedData, width, height);
        return takePersistenceResult(pairsVector);
    }
    /**
     * Clean up resources
     */
    dispose() {
        this.module = null;
        this.initialized = false;
    }
}
// Default instance
let defaultInstance = null;
/**
 * Get or create the default instance
 */
export async function getDefaultInstance(options = {}) {
    if (!defaultInstance) {
        defaultInstance = new GudhiPersistentCohomology();
        await defaultInstance.initialize(options);
    }
    return defaultInstance;
}
// Export types
export * from './persistent_cohomology_types.js';
export * from './types.js';
//# sourceMappingURL=persistent_cohomology.js.map