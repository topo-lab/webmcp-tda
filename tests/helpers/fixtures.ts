import type { CubicalResult, PersistenceSummary, SerializablePair, SimplicialResult } from '../../src/tda/types';

export const essentialH0: SerializablePair = { id: 'H0:0:inf', dimension: 0, birth: 0, death: 'infinity', lifetime: 'infinity' };

export function pair(dimension: number, birth: number, death: number): SerializablePair {
  return { id: `H${dimension}:${birth}:${death}`, dimension, birth, death, lifetime: death - birth };
}

export function summary(overrides: Partial<PersistenceSummary> = {}): PersistenceSummary {
  return {
    pairCount: 3,
    pairsByDimension: { 0: 3 },
    essentialCount: 1,
    essentialByDimension: { 0: 1 },
    persistentByDimension: { 0: 3 },
    persistenceThreshold: 0.15,
    excludedPairs: {},
    returnedPairCount: 3,
    strongestPairs: [essentialH0, pair(0, 0, 1), { ...pair(0, 0, 1), id: 'H0:0:1#2' }],
    ...overrides,
  };
}

export function simplicialResult(overrides: Partial<SimplicialResult> = {}): SimplicialResult {
  return {
    kind: 'simplicial',
    complex: 'rips',
    input: {
      pointCount: 3,
      dimension: 2,
      coefficientField: 2,
      parameters: { maxEdgeLength: 1.5, maxSimplexDimension: 2 },
      defaulted: [],
      scale: { diameter: 1.4142135623730951, connectingDistance: 1 },
    },
    complexSummary: { simplexCount: 7, simplexCountsByDimension: { 0: 3, 1: 3, 2: 1 }, maxDimension: 2 },
    visualization: {
      supported: true,
      reason: null,
      simplices: [
        { vertices: [0], filtration: 0 },
        { vertices: [1], filtration: 0 },
        { vertices: [2], filtration: 0 },
        { vertices: [0, 1], filtration: 1 },
      ],
      simplexCount: 4,
      edges: [{ vertices: [0, 1], filtration: 1 }],
      edgeCount: 1,
      truncated: false,
      minFiltration: 0,
      maxFiltration: 1,
    },
    persistence: summary(),
    interpretation: { reliableThroughDimension: 1, warnings: [] },
    elapsedMs: 2.34,
    ...overrides,
  };
}

export function cubicalResult(overrides: Partial<CubicalResult> = {}): CubicalResult {
  return {
    kind: 'cubical',
    input: {
      name: 'agent-values',
      width: 2,
      height: 2,
      binarized: true,
      threshold: 127,
      foreground: 'dark',
      filtration: 'sublevel',
      downsample: 1,
    },
    persistence: summary(),
    elapsedMs: 2,
    ...overrides,
  };
}
