import { describe, expect, it } from 'vitest';
import { summarizePersistence } from '../src/tda/summary';

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
});
