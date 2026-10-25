/**
 * `@topolab/tda-wasm`: topological data analysis on WebAssembly (a Rust
 * core). Call {@link load} once; the functions are then plain calls.
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
export { ripsComplex, cechComplex, cechPersistence, delaunayCechComplex, alphaComplex, alphaPersistence, coupledAlphaComplex, witnessComplex, kFoldCoverComplex, kFoldCoverPersistence, ellipsoids, ellipsoidRipsComplex, ellipsoidRipsPersistence, ellipsoidCechComplex, ellipsoidCechPersistence, wings, wingComplex, wingPersistence, boxFiltration, boxFiltrationPersistence, cubicalComplex } from './complex.js';
export { persistence, ripsPersistence, cubicalPersistence, zigzagPersistence, insertOp, removeOp, volumeOptimalCycles } from './persistence.js';
export { bettiNumbers, bettiCurve, persistenceLandscape, persistenceImage, diagramWasserstein, diagramBottleneck } from './diagram.js';
export { pointCloud, materialize, flatten } from './flat.js';
