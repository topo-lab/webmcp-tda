import { describe, expect, it } from 'vitest';
import { ToolInputError } from '../src/tda/errors';
import {
  defaultMaximumSimplexDimension,
  validateCubicalRequest,
  validateSimplicialRequest,
} from '../src/tda/validation';

describe('agent input validation', () => {
  it('chooses filtration depth from the input dimension by default', () => {
    expect(defaultMaximumSimplexDimension([[0, 0], [1, 1]])).toBe(2);
    expect(defaultMaximumSimplexDimension([[0, 0, 0], [1, 1, 1]])).toBe(3);
  });

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

  it('rejects point clouds above three ambient dimensions', () => {
    expect(() => validateSimplicialRequest({
      kind: 'simplicial',
      complex: 'rips',
      points: [[0, 0, 0, 0], [1, 0, 0, 0]],
    })).toThrow('Points must be 2D or 3D.');
  });

  it('rejects complex families outside Rips, Alpha, and Čech', () => {
    expect(() => validateSimplicialRequest({
      kind: 'simplicial',
      complex: 'wing' as never,
      points: [[0, 0], [1, 0]],
    })).toThrow(/unsupported simplicial complex/i);
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

  it('rejects cubical thresholds outside the gray-value range', () => {
    expect(() => validateCubicalRequest({
      kind: 'cubical',
      source: 'current',
      threshold: 300,
    })).toThrow(/between 0 and 255/);
  });

  it('accepts real-photo samples and rejects removed synthetic masks', () => {
    expect(validateCubicalRequest({ kind: 'cubical', source: 'sample', sample: 'glasses' })).toMatchObject({ sample: 'glasses' });
    expect(() => validateCubicalRequest({
      kind: 'cubical',
      source: 'sample',
      sample: 'ring' as 'glasses',
    })).toThrow(/donut, pretzel, glasses/);
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

  it('rejects explicit nulls and wrong types where the schema allows only omission', () => {
    const base = { kind: 'simplicial' as const, complex: 'rips' as const, points: [[0, 0], [1, 0]] };
    expect(() => validateSimplicialRequest({ ...base, coefficientField: null as never })).toThrow(/coefficientField must be one of/);
    expect(() => validateSimplicialRequest({ ...base, coefficientField: 4 })).toThrow(/2, 3, 5, 7, 11, 13, 17, or 19/);
    expect(() => validateSimplicialRequest({ ...base, parameters: { maxSimplexDimension: null as never } })).toThrow(/between 1 and 3/);
    expect(() => validateSimplicialRequest({ ...base, parameters: 'wide' as never })).toThrow('parameters must be an object.');
    expect(() => validateSimplicialRequest({ ...base, parameters: { maxEdgeLength: '2' as never } })).toThrow(/maxEdgeLength must be positive/);
    expect(() => validateSimplicialRequest({ ...base, resultLimit: 1.5 })).toThrow(/resultLimit must be an integer/);
    expect(() => validateSimplicialRequest({ ...base, resultLimit: 201 })).toThrow(/between 1 and 200/);
  });

  it('names the offending field and hint on every failure', () => {
    const thrown = (run: () => unknown) => { try { run(); } catch (error) { return error as ToolInputError; } throw new Error('did not throw'); };
    const error = thrown(() => validateSimplicialRequest({ kind: 'simplicial', complex: 'rips', points: [[0, 0], [1, Infinity]] }));
    expect(error).toBeInstanceOf(ToolInputError);
    expect(error).toMatchObject({ code: 'invalid_input', field: 'points[1][1]' });
    expect(thrown(() => validateSimplicialRequest({ kind: 'simplicial', complex: 'wing' as never, points: [[0, 0], [1, 1]] }))).toMatchObject({ field: 'complex', hint: 'Allowed values: rips, alpha, cech.' });
    expect(thrown(() => validateCubicalRequest({ kind: 'cubical', downsample: 3 as never }))).toMatchObject({ field: 'downsample', hint: 'Allowed values: 1, 2, 4.' });
  });

  it('checks every cubical field the schema declares', () => {
    const values = { source: 'values' as const, width: 2, height: 2, values: [0, 1, 1, 0] };
    expect(validateCubicalRequest({ kind: 'cubical', ...values, binarize: false, filtration: 'superlevel', downsample: 4, foreground: 'light', threshold: 255, resultLimit: 200 })).toBeTruthy();
    expect(() => validateCubicalRequest({ kind: 'cubical', source: 'maybe' as never })).toThrow('Invalid cubical source.');
    expect(() => validateCubicalRequest({ kind: 'cubical', ...values, binarize: 'no' as never })).toThrow('binarize must be true or false.');
    expect(() => validateCubicalRequest({ kind: 'cubical', ...values, filtration: 'sideways' as never })).toThrow('filtration must be sublevel or superlevel.');
    expect(() => validateCubicalRequest({ kind: 'cubical', ...values, downsample: 0 as never })).toThrow('downsample must be 1, 2, or 4.');
    expect(() => validateCubicalRequest({ kind: 'cubical', ...values, foreground: 'both' as never })).toThrow('foreground must be dark or light.');
    expect(() => validateCubicalRequest({ kind: 'cubical', ...values, threshold: '100' as never })).toThrow(/between 0 and 255/);
    expect(() => validateCubicalRequest({ kind: 'cubical', ...values, resultLimit: 0 })).toThrow(/resultLimit/);
    expect(() => validateCubicalRequest({ kind: 'cubical', source: 'values', width: 1, height: 2, values: [0, 1] })).toThrow(/between 2 and 256/);
    expect(() => validateCubicalRequest({ kind: 'cubical', source: 'values', width: 300, height: 2, values: [] })).toThrow(/between 2 and 256/);
    expect(() => validateCubicalRequest({ kind: 'cubical', ...values, values: [0, 1, Number.NaN, 0] })).toThrow('values[2] must be a finite number.');
  });

  it('refuses fields that belong to a different source instead of silently ignoring them', () => {
    expect(() => validateCubicalRequest({ kind: 'cubical', values: [0, 1, 1, 0], width: 2, height: 2 })).toThrow(/only used when source is "values"/);
    expect(() => validateCubicalRequest({ kind: 'cubical', source: 'sample', sample: 'donut', width: 2 })).toThrow(/only used when source is "values"/);
    expect(() => validateCubicalRequest({ kind: 'cubical', source: 'current', sample: 'donut' })).toThrow(/sample is only used when source is "sample"/);
  });
});
