/**
 * TypeScript type definitions for the tda-wasm persistent-cohomology WASM
 * module.
 *
 * Based on GUDHI modules:
 * - Persistent_cohomology (GUDHI Persistent Cohomology)
 * - Simplex_tree (GUDHI Simplex Tree)
 *
 * The weighted alpha, Čech, bottleneck, witness and 2D wing entry points
 * below are not GUDHI calls; they are the permissive `src/geom`
 * reimplementations. The wing complex is a flag complex (Rips-type), never
 * a nerve.
 */
export interface PersistencePair {
    dimension: number;
    birth: number;
    death: number;
}
export interface PersistenceDiagram {
    pairs: PersistencePair[];
    byDimension: Map<number, PersistencePair[]>;
    essential: PersistencePair[];
}
export interface PersistenceResult {
    pairs: PersistencePair[];
    dimension: number;
    pairsByDimension: Record<number, number>;
    essentialCount: number;
}
export interface BettiNumbers {
    filtration: number;
    betti: number[];
}
export interface GudhiPersistentCohomologyModule {
    computeWeightedAlphaComplex3D(coords: any): any;
    computeRipsComplex(points: any, dimension: number, maxEdgeLength: number, maxSimplexDimension?: number): any;
    computeRipsComplexFromDistanceMatrix(distanceMatrix: any, numPoints: number, maxEdgeLength: number, maxSimplexDimension?: number): any;
    computeRipsComplexManual(points: any, dimension: number, maxEdgeLength: number, maxSimplexDimension?: number): any;
    computeRipsComplexFromDistanceMatrixManual(distanceMatrix: any, numPoints: number, maxEdgeLength: number, maxSimplexDimension?: number): any;
    computeCechComplex(points: any, dimension: number, maxRadius: number, maxSimplexDimension?: number): any;
    computeEllipsoidRipsComplex(points: any, dimension: number, neighborhoodSize: number, axesRatio: number, maxSimplexDimension?: number, maxFiltration?: number): any;
    computeEllipsoidCechComplex(points: any, dimension: number, neighborhoodSize: number, axesRatio: number, maxSimplexDimension?: number, maxFiltration?: number): any;
    computeEllipsoidGeometry(points: any, dimension: number, neighborhoodSize: number, axesRatio: number): any;
    computeWingComplex(points2d: any, q: number, theta: number, normalsOrK: any, maxSimplexDimension?: number, maxEps?: number): any;
    computeWingGeometry(points2d: any, q: number, theta: number, normalsOrK: any): any;
    computeBoxFiltration(points: any, dimension: number, stepSize: number, alpha: number, maxSteps: number, maxSimplexDimension: number, includeBoxExtents: boolean): any;
    computeEuclideanWitnessComplex(points: any, dimension: number, numLandmarks: number, maxAlphaSquare: number, maxSimplexDimension?: number): any;
    computePersistence(simplices: any, coeffField?: number): any;
    filterByLifetime(pairs: any, minLifetime: number): any;
    getPersistencePairsByDimension(pairs: any, dimension: number): any;
    getEssentialPairs(pairs: any): any;
    computeBettiNumbers(simplices: any, filtrationValue: number, coeffField?: number): any;
    computeBottleneckDistance(pairs1: any, pairs2: any, epsilon?: number): number;
    computeBottleneckDistanceForDimension(pairs1: any, pairs2: any, dimension: number, epsilon?: number): number;
    computeWassersteinDistance(pairs1: any, pairs2: any, q?: number): number;
    computeWassersteinDistanceForDimension(pairs1: any, pairs2: any, dimension: number, q?: number): number;
    computeWassersteinDistanceGreedy(pairs1: any, pairs2: any, q?: number): number;
    computeWassersteinDistanceForDimensionGreedy(pairs1: any, pairs2: any, dimension: number, q?: number): number;
    computeBettiCurve(simplices: any, filtrationValues: any, coeffField?: number): any;
    computePersistenceLandscape(pairs: any, level: number, evaluationPoints: any): any;
    computePersistenceImage(pairs: any, resolutionX: number, resolutionY: number, birthMin: number, birthMax: number, persMin: number, persMax: number, sigma?: number, weightPower?: number): any;
    computeZigzagPersistence(operations: any): any;
    computeFilteredZigzagPersistence(operations: any): any;
    computeZigzagPersistenceFromFlat(operationsData: any): any;
    computeFilteredZigzagPersistenceFromFlat(operationsData: any): any;
    createInsertOperation(cellId: number, boundary: any, dimension: number, filtration?: number): any;
    createRemoveOperation(cellId: number, filtration?: number): any;
    computeCubicalComplex(dimensions: any, filtrationValues: any): any;
    computeCubicalComplex2D(imageData: any, width: number, height: number): any;
    computeCubicalComplex3D(volumeData: any, width: number, height: number, depth: number): any;
    computeCubicalPersistence(dimensions: any, filtrationValues: any, coeffField?: number): any;
    computeCubicalPersistence2D(imageData: any, width: number, height: number, coeffField?: number): any;
    computeCubicalPersistenceFromVertices2D(imageData: ArrayLike<number>, width: number, height: number): any;
    VectorDouble: any;
    VectorInt: any;
    VectorUnsigned: any;
    VectorSimplexData: any;
    VectorPersistencePair: any;
    VectorZigzagOperation: any;
    VectorZigzagBar: any;
    VectorFilteredZigzagBar: any;
}
/**
 * Calculate lifetime (persistence) of a feature
 */
export declare function lifetime(pair: PersistencePair): number;
/**
 * Check if a persistence pair represents an essential (infinite) feature
 */
export declare function isEssential(pair: PersistencePair): boolean;
/**
 * Filter persistence pairs by minimum lifetime
 */
export declare function filterPairsByLifetime(pairs: PersistencePair[], minLifetime: number): PersistencePair[];
/**
 * Group persistence pairs by dimension
 */
export declare function groupPairsByDimension(pairs: PersistencePair[]): Map<number, PersistencePair[]>;
/**
 * Extract essential (infinite-lifetime) features
 */
export declare function getEssentialFeatures(pairs: PersistencePair[]): PersistencePair[];
/**
 * Create a persistence diagram from pairs
 */
export declare function createPersistenceDiagram(pairs: PersistencePair[]): PersistenceDiagram;
//# sourceMappingURL=persistent_cohomology_types.d.ts.map