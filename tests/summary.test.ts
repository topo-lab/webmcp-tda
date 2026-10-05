import { describe, expect, it } from 'vitest';
import { PERSISTENCE_FRACTION, summarizePersistence } from '../src/tda/summary';

describe('persistence summaries', () => {
  it('assigns stable unique IDs to repeated equal pairs', () => {
    const summary = summarizePersistence({
      pairs: [
        { dimension: 0, birth: 0, death: 1 },
        { dimension: 0, birth: 0, death: 1 },
      ],
      dimension: 0,
      pairsByDimension: { 0: 2 },
      essentialCount: 0,
    }, 10);
    expect(summary.strongestPairs.map((pair) => pair.id)).toEqual([
      'H0:0:1',
      'H0:0:1#2',
    ]);
  });

  it('rejects non-JSON-safe persistence values', () => {
    expect(() => summarizePersistence({
      pairs: [{ dimension: 1, birth: 0, death: Number.NaN }],
      dimension: 1,
      pairsByDimension: { 1: 1 },
      essentialCount: 0,
    }, 10)).toThrow('invalid death value');
  });

  it.each([
    [{ dimension: -1, birth: 0, death: 1 }, 'invalid dimension'],
    [{ dimension: 0.5, birth: 0, death: 1 }, 'invalid dimension'],
    [{ dimension: 0, birth: Infinity, death: Infinity }, 'non-finite birth'],
    [{ dimension: 0, birth: NaN, death: 1 }, 'non-finite birth'],
    [{ dimension: 0, birth: 0, death: -Infinity }, 'invalid death'],
    [{ dimension: 1, birth: 2, death: 1 }, 'dies before it is born'],
  ] as const)('refuses malformed algebraic intervals before JSON serialization: %j', (pair, error) => {
    expect(() => summarizePersistence({ pairs: [pair], dimension: 1, pairsByDimension: {}, essentialCount: 0 }, 10)).toThrow(error);
  });

  it('ranks essential classes first, breaks lifetime ties deterministically, and preserves input multiplicity', () => {
    const pairs = [
      { dimension: 1, birth: 2, death: 5 },
      { dimension: 0, birth: 1, death: 4 },
      { dimension: 0, birth: -1, death: 2 },
      { dimension: 1, birth: 2, death: Infinity },
      { dimension: 0, birth: -1, death: Infinity },
    ];
    const original = pairs.map((p) => ({ ...p }));
    const result = summarizePersistence({ pairs, dimension: 1, pairsByDimension: { 0: 3, 1: 2 }, essentialCount: 2 }, 4);
    expect(result).toMatchObject({ pairCount: 5, returnedPairCount: 4, essentialCount: 2 });
    expect(result.strongestPairs.map((p) => [p.dimension, p.birth, p.death])).toEqual([
      [0, -1, 'infinity'], [1, 2, 'infinity'], [0, -1, 2], [0, 1, 4],
    ]);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(pairs).toEqual(original);
  });

  it('reports only the reliable dimensions and counts the rest as excluded', () => {
    const pairs = [
      { dimension: 0, birth: 0, death: Infinity },
      { dimension: 0, birth: 0, death: 1 },
      { dimension: 1, birth: 0.5, death: Infinity },
      { dimension: 2, birth: 0.7, death: Infinity },
      { dimension: 2, birth: 0.8, death: Infinity },
    ];
    const result = summarizePersistence({ pairs, dimension: 2, pairsByDimension: { 0: 2, 1: 1, 2: 2 }, essentialCount: 4 }, 10, { reliableThroughDimension: 1 });
    expect(result).toMatchObject({
      pairCount: 3,
      pairsByDimension: { 0: 2, 1: 1 },
      essentialCount: 2,
      essentialByDimension: { 0: 1, 1: 1 },
      excludedPairs: { 2: 2 },
      returnedPairCount: 3,
    });
    expect(result.strongestPairs.every((p) => p.dimension <= 1)).toBe(true);
  });

  it('counts a class as long-lived when it never dies or lives at least a fifth as long as the longest one', () => {
    const pairs = [
      { dimension: 1, birth: 0.1, death: 0.9 },
      { dimension: 1, birth: 0.2, death: 0.25 },
      { dimension: 1, birth: 0.3, death: 0.5 },
      { dimension: 1, birth: 0.3, death: Infinity },
    ];
    // The class that never dies counts up to the end (1.0), so the longest is 0.8 and the threshold 0.16.
    const result = summarizePersistence({ pairs, dimension: 1, pairsByDimension: { 1: 4 }, essentialCount: 1 }, 10, { filtrationEnd: 1 });
    expect(result.persistenceThreshold).toBeCloseTo(0.16, 12);
    expect(result.persistentByDimension).toEqual({ 1: 3 });
    expect(PERSISTENCE_FRACTION).toBe(0.2);
  });

  it('measures noise against a dominant loop, not against itself, by cutting an alive class off at the end', () => {
    const pairs = [
      { dimension: 1, birth: 0.2, death: Infinity },
      { dimension: 1, birth: 0.3, death: 0.4 },
      { dimension: 1, birth: 0.3, death: 0.32 },
    ];
    const withEnd = summarizePersistence({ pairs, dimension: 1, pairsByDimension: { 1: 3 }, essentialCount: 1 }, 10, { filtrationEnd: 1 });
    expect(withEnd.persistenceThreshold).toBeCloseTo(0.16, 12);
    expect(withEnd.persistentByDimension).toEqual({ 1: 1 });
    // Without an end the latest value among the pairs (0.4) stands in, which makes the noise look larger.
    const derived = summarizePersistence({ pairs, dimension: 1, pairsByDimension: { 1: 3 }, essentialCount: 1 }, 10);
    expect(derived.persistenceThreshold).toBeCloseTo(0.04, 12);
    expect(derived.persistentByDimension).toEqual({ 1: 2 });
  });

  it('is not misled by large late triangles: the range of an alpha complex of a figure-eight is 5.2, its loops live 0.185', () => {
    const loops = [{ dimension: 1, birth: 0.05, death: 0.235 }, { dimension: 1, birth: 0.06, death: 0.245 }];
    const noise = [{ dimension: 1, birth: 0.1, death: 0.103 }, { dimension: 1, birth: 0.1, death: 0.103 }, { dimension: 1, birth: 5.229, death: 5.229 }];
    const result = summarizePersistence({ pairs: [...loops, ...noise], dimension: 1, pairsByDimension: { 1: 5 }, essentialCount: 0 }, 10, { filtrationEnd: 5.229 });
    expect(result.persistenceThreshold).toBeCloseTo(0.037, 12);
    expect(result.persistentByDimension).toEqual({ 1: 2 });
  });

  it('counts only the classes that never die when there is nothing of dimension 1 or higher to compare with', () => {
    const pairs = [{ dimension: 0, birth: 0, death: Infinity }, { dimension: 0, birth: 0, death: 1 }];
    expect(summarizePersistence({ pairs, dimension: 0, pairsByDimension: { 0: 2 }, essentialCount: 1 }, 10))
      .toMatchObject({ persistenceThreshold: 0, persistentByDimension: { 0: 1 } });
    expect(summarizePersistence({ pairs: [], dimension: 0, pairsByDimension: {}, essentialCount: 0 }, 10))
      .toMatchObject({ pairCount: 0, persistenceThreshold: 0, persistentByDimension: {} });
  });
});
