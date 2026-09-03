import { describe, expect, it } from 'vitest';
import { validateCubicalRequest, validateSimplicialRequest } from '../src/tda/validation';

describe('agent input validation', () => {
  it('accepts a finite 2D Rips request', () => {
    const request = {
      kind: 'simplicial' as const,
      complex: 'rips' as const,
      points: [[0, 0], [1, 0], [0, 1]],
      parameters: { maxEdgeLength: 1.5, maxSimplexDimension: 2 },
    };
    expect(validateSimplicialRequest(request)).toBe(request);
  });

  it('rejects mixed-dimensional point arrays', () => {
    expect(() => validateSimplicialRequest({
      kind: 'simplicial',
      complex: 'alpha',
      points: [[0, 0], [1, 0, 2]],
    })).toThrow(/does not match dimension/);
  });

  it('enforces geometry-specific dimensions', () => {
    expect(() => validateSimplicialRequest({
      kind: 'simplicial',
      complex: 'wing',
      points: [[0, 0, 0], [1, 0, 0]],
    })).toThrow(/require 2D/);
  });

  it('rejects cubical grids with the wrong value count', () => {
    expect(() => validateCubicalRequest({
      kind: 'cubical',
      source: 'values',
      width: 3,
      height: 3,
      values: [0, 1],
    })).toThrow(/width × height/);
  });

  it('rejects requests whose worst-case complex exceeds the browser budget', () => {
    const points = Array.from({ length: 256 }, (_, index) => [index, index % 7, index % 11]);
    expect(() => validateSimplicialRequest({
      kind: 'simplicial',
      complex: 'rips',
      points,
      parameters: { maxEdgeLength: 1_000_000, maxSimplexDimension: 3 },
    })).toThrow(/browser safety budget/);
  });

  it('rejects unbounded agent-controlled filtration values', () => {
    expect(() => validateSimplicialRequest({
      kind: 'simplicial',
      complex: 'rips',
      points: [[0, 0], [1, 0]],
      parameters: { maxEdgeLength: Number.MAX_VALUE },
    })).toThrow(/at most/);
  });
});
