/**
 * `@topolab/tda-wasm`: topological data analysis on WebAssembly (C++ and a
 * Rust core). Call {@link load} once; the functions are then plain calls.
 *
 * Point clouds are `{ coords, d }` (row-major `Float64Array`, `d`
 * coordinates per point; {@link pointCloud} converts rows), images and
 * volumes `{ values, shape }` in NumPy's order. Complexes come back as typed
 * arrays (`{ vertices, offsets, filtrations, scale }`) and diagrams as one
 * `[birth, death, …]` array per homology dimension (`{ pairs, scale, coeff }`).
 * Results are plain objects of typed arrays, numbers, strings and booleans,
 * so they survive `postMessage` and `structuredClone` whole. A bad argument
 * throws a `TypeError` (wrong type) or a `RangeError` (out of range) whose
 * message names the parameter; a failure inside an engine throws an `Error`
 * with the engine's message.
 *
 * Functions are named for what they return: `xComplex` a filtered complex,
 * `xPersistence` a persistence diagram, `diagramX` a distance between two
 * diagrams; variants are options.
 *
 * @packageDocumentation
 */
export { load, unload, isLoaded, version } from './load.js';
export type { LoadSource } from './load.js';
export type { PointCloud, Vec } from './check.js';
export type { Complex, ComplexLike, CubicalComplex, Diagram, DistanceMatrix, Grid, BuilderPersistence, BuilderPersistenceOptions, Scale, Simplex } from './types.js';
export { ripsComplex, cechComplex, cechPersistence, delaunayCechComplex, alphaComplex, alphaPersistence, coupledAlphaComplex, witnessComplex, kFoldCoverComplex, kFoldCoverPersistence, ellipsoids, ellipsoidRipsComplex, ellipsoidRipsPersistence, ellipsoidCechComplex, ellipsoidCechPersistence, wings, wingComplex, wingPersistence, boxFiltration, boxFiltrationPersistence, cubicalComplex } from './complex.js';
export type { RipsComplexOptions, CechComplexOptions, CechPersistenceOptions, DelaunayCechComplexOptions, AlphaComplexOptions, AlphaPersistenceOptions, CoupledAlphaComplexOptions, WitnessComplexOptions, KFoldCoverComplex, KFoldCoverComplexOptions, KFoldCoverDiagnostics, KFoldCoverPersistenceOptions, EllipsoidAxes, EllipsoidGeometry, EllipsoidOptions, EllipsoidRipsComplexOptions, EllipsoidRipsPersistenceOptions, EllipsoidCechComplexOptions, EllipsoidCechPersistenceOptions, WingGeometry, WingNormalSource, WingOptions, WingComplexOptions, WingPersistenceOptions, BoxExtent, BoxFiltration, BoxFiltrationDiagnostics, BoxFiltrationOptions, BoxFiltrationPersistenceOptions } from './complex.js';
export { persistence, ripsPersistence, cubicalPersistence, zigzagPersistence, insertOp, removeOp, volumeOptimalCycles } from './persistence.js';
export type { PersistenceOptions, RipsPersistence, RipsPersistenceOptions, RipsRepresentatives, RepresentativesOptions, CubicalPersistenceOptions, InsertOp, RemoveOp, ZigzagOp, ZigzagPersistence, ZigzagPersistenceOptions, VolumeOptimalCycles, VolumeOptimalCyclesOptions } from './persistence.js';
export { bettiNumbers, bettiCurve, persistenceLandscape, persistenceImage, diagramWasserstein, diagramBottleneck } from './diagram.js';
export type { PersistenceLandscapeOptions, ImageBounds, PersistenceImage, PersistenceImageOptions, DiagramWassersteinOptions, DiagramMatching } from './diagram.js';
export { pointCloud, materialize, flatten } from './flat.js';
export type { RipsRepresentative, VolumeOptimalCycle } from './flat.js';
