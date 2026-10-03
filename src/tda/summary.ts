import type { PersistencePair, PersistenceResult, Simplex } from 'tda-wasm';
import type { PersistenceSummary, SerializablePair } from './types';

/** A class is long-lived when it never dies or lives at least this fraction of the filtration range. */
export const PERSISTENCE_FRACTION = 0.1;

export interface SummaryOptions {
  /** Highest homology dimension to report. Pairs above it are counted in `excludedPairs` only. */
  reliableThroughDimension?: number;
  /** Extent of the filtration, the base of the long-lived threshold. Defaults to the extent of the reported pairs. */
  filtrationRange?: number;
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

function extentOf(pairs: readonly PersistencePair[]): number {
  let low = 0;
  let high = 0;
  for (const pair of pairs) {
    low = Math.min(low, pair.birth);
    high = Math.max(high, pair.birth, Number.isFinite(pair.death) ? pair.death : pair.birth);
  }
  return high - low;
}

function increment(counts: Record<number, number>, dimension: number): void {
  counts[dimension] = (counts[dimension] ?? 0) + 1;
}

export function summarizePersistence(
  result: PersistenceResult,
  limit: number,
  options: SummaryOptions = {},
): PersistenceSummary {
  result.pairs.forEach(assertSerializablePair);
  const reliable = options.reliableThroughDimension ?? Number.POSITIVE_INFINITY;
  const kept: PersistencePair[] = [];
  const excludedPairs: Record<number, number> = {};
  for (const pair of result.pairs) {
    if (pair.dimension <= reliable) kept.push(pair);
    else increment(excludedPairs, pair.dimension);
  }

  const persistenceThreshold = PERSISTENCE_FRACTION * (options.filtrationRange ?? extentOf(kept));
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
    if (essential || pair.death - pair.birth >= persistenceThreshold) increment(persistentByDimension, pair.dimension);
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

export function summarizeComplex(simplices: Simplex[]) {
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
