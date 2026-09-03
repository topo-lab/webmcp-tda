import { describe, expect, it } from 'vitest';
import { pointSample } from '../src/tda/samples';

describe('human point-cloud samples', () => {
  it('provides deterministic 2D examples', () => {
    expect(pointSample('circle')).toHaveLength(32);
    expect(pointSample('figure-eight')[0]).toHaveLength(2);
    expect(pointSample('clusters')).toHaveLength(10);
    expect(pointSample('clusters')).toEqual(pointSample('clusters'));
  });

  it('provides a browser-safe nondegenerate 3D sphere sample', () => {
    const sphere = pointSample('sphere');
    expect(sphere).toHaveLength(28);
    expect(sphere.every((point) => point.length === 3)).toBe(true);
    expect(new Set(sphere.map((point) => point[2]?.toFixed(4))).size).toBeGreaterThan(10);
  });
});
