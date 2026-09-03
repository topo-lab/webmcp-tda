import type { PersistencePair, PersistenceResult, Simplex } from 'tda-wasm';
import type { PersistenceSummary, SerializablePair } from './types';

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

export function summarizePersistence(result: PersistenceResult, limit: number): PersistenceSummary {
  result.pairs.forEach(assertSerializablePair);
  const strongest = [...result.pairs].sort((left, right) => {
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
    pairCount: result.pairs.length,
    pairsByDimension: result.pairsByDimension,
    essentialCount: result.essentialCount,
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
