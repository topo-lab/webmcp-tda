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
// Note: ModuleOptions is imported from types.js to avoid duplication
//=============================================================================
// UTILITY FUNCTIONS
//=============================================================================
/**
 * Calculate lifetime (persistence) of a feature
 */
export function lifetime(pair) {
    return pair.death === Infinity ? Infinity : (pair.death - pair.birth);
}
/**
 * Check if a persistence pair represents an essential (infinite) feature
 */
export function isEssential(pair) {
    return pair.death === Infinity;
}
/**
 * Filter persistence pairs by minimum lifetime
 */
export function filterPairsByLifetime(pairs, minLifetime) {
    return pairs.filter(p => lifetime(p) >= minLifetime);
}
/**
 * Group persistence pairs by dimension
 */
export function groupPairsByDimension(pairs) {
    const grouped = new Map();
    for (const pair of pairs) {
        if (!grouped.has(pair.dimension)) {
            grouped.set(pair.dimension, []);
        }
        grouped.get(pair.dimension).push(pair);
    }
    return grouped;
}
/**
 * Extract essential (infinite-lifetime) features
 */
export function getEssentialFeatures(pairs) {
    return pairs.filter(isEssential);
}
/**
 * Create a persistence diagram from pairs
 */
export function createPersistenceDiagram(pairs) {
    return {
        pairs,
        byDimension: groupPairsByDimension(pairs),
        essential: getEssentialFeatures(pairs)
    };
}
//# sourceMappingURL=persistent_cohomology_types.js.map