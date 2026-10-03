import { describe, expect, it } from 'vitest';
import { interpretationWarnings, reliableThroughDimension } from '../src/tda/interpretation';
import { formatScale, pointCloudScale } from '../src/tda/scale';
import { summary } from './helpers/fixtures';

describe('which dimensions can be trusted', () => {
  it('trusts one dimension fewer than the cap, except for a complete alpha complex', () => {
    expect(reliableThroughDimension('rips', 2, 2)).toBe(1);
    expect(reliableThroughDimension('cech', 3, 3)).toBe(2);
    expect(reliableThroughDimension('rips', 1, 2)).toBe(0);
    expect(reliableThroughDimension('alpha', 2, 2)).toBe(2);
    expect(reliableThroughDimension('alpha', 3, 3)).toBe(3);
    expect(reliableThroughDimension('alpha', 3, 2)).toBe(2);
    expect(reliableThroughDimension('alpha', 1, 2)).toBe(0);
  });
});

describe('interpretation warnings', () => {
  const scale = { diameter: 10, connectingDistance: 4 };
  const parameters = { maxEdgeLength: 2, maxRadius: 1 };
  const base = { maxSimplexDimension: 2, defaultSimplexDimension: 2, parameters, scale } as const;

  it('stays silent when nothing was cut off, even though full-range complexes have top-dimension artifacts', () => {
    expect(interpretationWarnings({ ...base, kind: 'rips', persistence: summary({ excludedPairs: { 2: 40 } }) })).toEqual([]);
  });

  it('says what a cap below the default left out, in the singular and the plural', () => {
    expect(interpretationWarnings({ ...base, maxSimplexDimension: 1, kind: 'rips', persistence: summary({ excludedPairs: { 1: 1 } }) }))
      .toEqual(['1 H1 class is not reported: the complex is capped at simplex dimension 1, so it is a truncation artifact.']);
    expect(interpretationWarnings({ ...base, maxSimplexDimension: 2, defaultSimplexDimension: 3, kind: 'cech', persistence: summary({ excludedPairs: { 2: 3, 3: 4 } }) }))
      .toEqual(['7 H2/H3 classes are not reported: the complex is capped at simplex dimension 2, so they are truncation artifacts.']);
  });

  it('says when the limit stops the filtration before the points connect, in each complex’s own units', () => {
    const disconnected = summary({ essentialByDimension: { 0: 3 } });
    expect(interpretationWarnings({ ...base, kind: 'rips', persistence: disconnected }))
      .toEqual(['At maxEdgeLength 2 the complex still has 3 connected components; the points connect at 4. Raise maxEdgeLength to see them merge.']);
    expect(interpretationWarnings({ ...base, kind: 'cech', persistence: disconnected }))
      .toEqual(['At maxRadius 1 the complex still has 3 connected components; the points connect at 2. Raise maxRadius to see them merge.']);
    expect(interpretationWarnings({ ...base, kind: 'alpha', persistence: disconnected })).toEqual([]);
  });
});

describe('point cloud scale', () => {
  it('measures the diameter and the distance at which every point is connected', () => {
    expect(pointCloudScale([[0, 0], [1, 0], [10, 0], [11, 0]])).toEqual({ diameter: 11, connectingDistance: 9 });
    expect(pointCloudScale([[0, 0, 0], [3, 4, 0]])).toEqual({ diameter: 5, connectingDistance: 5 });
    expect(pointCloudScale([[2, 2], [2, 2], [2, 2]])).toEqual({ diameter: 0, connectingDistance: 0 });
    expect(pointCloudScale([[1, 1]])).toEqual({ diameter: 0, connectingDistance: 0 });
  });

  it('formats a scale compactly at any magnitude', () => {
    expect(formatScale(0)).toBe('0');
    expect(formatScale(1.4142135623730951)).toBe('1.414');
    expect(formatScale(250)).toBe('250');
    expect(formatScale(3_460_000)).toBe('3.460e+6');
    expect(formatScale(0.000123456)).toBe('1.235e-4');
  });
});
