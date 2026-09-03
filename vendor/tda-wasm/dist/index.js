/**
 * tda-wasm: WebAssembly Topological Data Analysis Toolkit
 *
 * Main entry point - re-exports from persistent_cohomology module
 * for backwards compatibility and convenience.
 */
// Re-export the main class and utilities
export { GudhiPersistentCohomology, getDefaultInstance } from './persistent_cohomology.js';
// Re-export types
export * from './persistent_cohomology_types.js';
export * from './types.js';
// Legacy alias for backwards compatibility
export { GudhiPersistentCohomology as GudhiAlphaComplex } from './persistent_cohomology.js';
//# sourceMappingURL=index.js.map