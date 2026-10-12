import type { Complex, Diagram } from '@topolab/tda-wasm';
import type { FiltrationSimplex, PersistencePair, PersistenceSummary, SerializablePair } from './types';

/**
 * A class is long-lived when it survives to the computed end, or lives at least this fraction as long as the longest-lived class of
 * dimension 1 or higher. The yardstick is a feature of the data. The extent of the filtration is not one: an alpha
 * complex of a figure-eight has a range of 5.2 because of large triangles on its hull, while its two loops live 0.185.
 */
export const PERSISTENCE_FRACTION = 0.2;

/**
 * Simplicial diagrams leave out the pairs no longer than this fraction of the complex's largest finite value
 * (`minPersistence`): they are floating-point round-off. It cannot change a long-lived count, whose threshold is
 * a fifth of a real class's lifetime; it keeps such bars out of the pair counts.
 */
export const ROUND_OFF_FRACTION = 1e-12;

export interface SummaryOptions {
  /** Highest homology dimension to report. Pairs above it are counted in `excludedPairs` only. */
  reliableThroughDimension?: number;
  /**
   * Where the filtration stops. A class that is still alive there counts up to that point when it serves as the
   * yardstick, so noise is measured against a dominant loop and not against itself. Defaults to the latest birth
   * or death among the reported pairs.
   */
  filtrationEnd?: number;
}

function pairId(pair: PersistencePair): string {
  return `H${pair.dimension}:${pair.birth.toString()}:${Number.isFinite(pair.death) ? pair.death.toString() : 'inf'}`;
}

function assertSerializablePair(pair: PersistencePair, index: number): void {
  if (!Number.isInteger(pair.dimension) || pair.dimension < 0) {
    throw new Error(`Persistence pair ${index} has an invalid dimension.`);
  }
  if (!Number.isFinite(pair.birth)) {
    throw new Error(`Persistence pair ${index} has a non-finite birth value.`);
  }
  if (!(Number.isFinite(pair.death) || pair.death === Number.POSITIVE_INFINITY)) {
    throw new Error(`Persistence pair ${index} has an invalid death value.`);
  }
  if (pair.death < pair.birth) {
    throw new Error(`Persistence pair ${index} dies before it is born.`);
  }
}

function serializePair(pair: PersistencePair, id: string): SerializablePair {
  const finite = Number.isFinite(pair.death);
  return {
    id,
    dimension: pair.dimension,
    birth: pair.birth,
    death: finite ? pair.death : 'infinity',
    lifetime: finite ? pair.death - pair.birth : 'infinity',
  };
}

/** Lifetime of the longest-lived class of dimension 1 or higher, cut off at `end`; 0 when there is none. */
function longestLifetime(pairs: readonly PersistencePair[], end: number): number {
  let longest = 0;
  for (const pair of pairs) {
    if (pair.dimension >= 1) longest = Math.max(longest, (Number.isFinite(pair.death) ? pair.death : end) - pair.birth);
  }
  return longest;
}

function latestValue(pairs: readonly PersistencePair[]): number {
  let latest = 0;
  for (const pair of pairs) latest = Math.max(latest, pair.birth, Number.isFinite(pair.death) ? pair.death : pair.birth);
  return latest;
}

function increment(counts: Record<number, number>, dimension: number): void {
  counts[dimension] = (counts[dimension] ?? 0) + 1;
}

/**
 * The pairs of a diagram, one per interval, dimension by dimension. `+ 0` turns the `-0` an alpha vertex is born at
 * (minus its zero weight) into 0, so ids and JSON read the same as for the other complexes.
 */
export function diagramPairs(diagram: Pick<Diagram, 'pairs'>): PersistencePair[] {
  const pairs: PersistencePair[] = [];
  diagram.pairs.forEach((flat, dimension) => {
    for (let index = 0; index + 1 < flat.length; index += 2) {
      pairs.push({ dimension, birth: flat[index]! + 0, death: flat[index + 1]! + 0 });
    }
  });
  return pairs;
}

/** The simplices of a complex as vertex lists (increasing, as 0.3 lists them) with their filtration values. */
export function complexSimplices(complex: Pick<Complex, 'vertices' | 'offsets' | 'filtrations'>): FiltrationSimplex[] {
  return Array.from(complex.filtrations, (filtration, index) => ({
    vertices: Array.from(complex.vertices.subarray(complex.offsets[index]!, complex.offsets[index + 1]!)),
    filtration: filtration + 0,
  }));
}

export function summarizePersistence(
  pairs: readonly PersistencePair[],
  limit: number,
  options: SummaryOptions = {},
): PersistenceSummary {
  pairs.forEach(assertSerializablePair);
  const reliable = options.reliableThroughDimension ?? Number.POSITIVE_INFINITY;
  const kept: PersistencePair[] = [];
  const excludedPairs: Record<number, number> = {};
  for (const pair of pairs) {
    if (pair.dimension <= reliable) kept.push(pair);
    else increment(excludedPairs, pair.dimension);
  }

  // With nothing of dimension 1 or higher to measure against, only the classes alive at the computed end are long-lived.
  const persistenceThreshold = PERSISTENCE_FRACTION * longestLifetime(kept, options.filtrationEnd ?? latestValue(kept));
  const pairsByDimension: Record<number, number> = {};
  const essentialByDimension: Record<number, number> = {};
  const persistentByDimension: Record<number, number> = {};
  let essentialCount = 0;
  for (const pair of kept) {
    increment(pairsByDimension, pair.dimension);
    const essential = !Number.isFinite(pair.death);
    if (essential) {
      increment(essentialByDimension, pair.dimension);
      essentialCount += 1;
    }
    if (essential || (persistenceThreshold > 0 && pair.death - pair.birth >= persistenceThreshold)) increment(persistentByDimension, pair.dimension);
  }

  const strongest = [...kept].sort((left, right) => {
    const leftLifetime = Number.isFinite(left.death) ? left.death - left.birth : Number.POSITIVE_INFINITY;
    const rightLifetime = Number.isFinite(right.death) ? right.death - right.birth : Number.POSITIVE_INFINITY;
    return rightLifetime - leftLifetime || left.dimension - right.dimension || left.birth - right.birth;
  });
  const occurrences = new Map<string, number>();
  const strongestPairs = strongest.slice(0, limit).map((pair) => {
    const baseId = pairId(pair);
    const occurrence = occurrences.get(baseId) ?? 0;
    occurrences.set(baseId, occurrence + 1);
    return serializePair(pair, occurrence === 0 ? baseId : `${baseId}#${occurrence + 1}`);
  });
  return {
    pairCount: kept.length,
    pairsByDimension,
    essentialCount,
    essentialByDimension,
    persistentByDimension,
    persistenceThreshold,
    excludedPairs,
    returnedPairCount: Math.min(limit, strongest.length),
    strongestPairs,
  };
}

export function summarizeComplex(simplices: readonly Pick<FiltrationSimplex, 'vertices'>[]) {
  const simplexCountsByDimension: Record<number, number> = {};
  let maxDimension = 0;
  for (const simplex of simplices) {
    const dimension = simplex.vertices.length - 1;
    simplexCountsByDimension[dimension] = (simplexCountsByDimension[dimension] ?? 0) + 1;
    maxDimension = Math.max(maxDimension, dimension);
  }
  return {
    simplexCount: simplices.length,
    simplexCountsByDimension,
    maxDimension,
  };
}
