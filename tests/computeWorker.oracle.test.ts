import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ComputeRequest, ComputeResult, ScalarImage, WorkerRequestMessage, WorkerResponseMessage } from '../src/tda/types';
import { canonicalIntervals, ripsOracle, vertexGridOracle, type Interval } from './helpers/persistenceOracle';

// Only the Worker transport is replaced. This imports the production handler
// and executes the vendored tda-wasm binary used by the application.
let listener: (event: MessageEvent<WorkerRequestMessage>) => void;
let serial = 0;
const pending = new Map<string, (reply: WorkerResponseMessage) => void>();

beforeAll(async () => {
  // Browser workers have no CommonJS `module`; Node test runners can install
  // that global and spuriously activate Geogram's Node-filesystem hook.
  vi.stubGlobal('module', undefined);
  vi.stubGlobal('self', {
    addEventListener: (type: string, callback: typeof listener) => {
      if (type === 'message') listener = callback;
    },
    postMessage: (reply: WorkerResponseMessage) => {
      const resolve = pending.get(reply.id);
      pending.delete(reply.id);
      resolve?.(reply);
    },
  });
  await import('../src/tda/compute.worker');
});
afterAll(() => vi.unstubAllGlobals());

async function compute(request: ComputeRequest, currentImage?: ScalarImage): Promise<ComputeResult> {
  const id = `oracle-${serial++}`;
  const reply = await new Promise<WorkerResponseMessage>((resolve) => {
    pending.set(id, resolve);
    listener({ data: { id, request, currentImage } } as MessageEvent<WorkerRequestMessage>);
  });
  if (!reply.ok) throw new Error(reply.error);
  expect(reply.id).toBe(id);
  expect(reply.result.elapsedMs).toBeGreaterThanOrEqual(0);
  return reply.result;
}

function intervals(result: ComputeResult): Interval[] {
  expect(result.persistence.returnedPairCount).toBe(result.persistence.pairCount);
  return canonicalIntervals(result.persistence.strongestPairs.map((p) => [p.dimension, p.birth, p.death === 'infinity' ? Infinity : p.death]));
}

function expectPairs(actual: Interval[], expected: Interval[]) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((p, i) => {
    expect(p[0]).toBe(expected[i]![0]);
    expect(p[1]).toBeCloseTo(expected[i]![1], 9);
    if (expected[i]![2] === Infinity) expect(p[2]).toBe(Infinity);
    else expect(p[2]).toBeCloseTo(expected[i]![2], 9);
  });
}

describe('worker vertex cubical persistence against independent F₂ matrix reduction', () => {
  it('has an oracle with known connected, disconnected, and one-hole answers', () => {
    expect(vertexGridOracle([3, 3, 3, 3], 2, 2)).toEqual([[0, 3, Infinity]]);
    expect(vertexGridOracle([0, 2, 2, 0], 2, 2)).toEqual([[0, 0, 2], [0, 0, Infinity]]);
    expect(vertexGridOracle([0, 0, 0, 0, 5, 0, 0, 0, 0], 3, 3)).toEqual([[0, 0, Infinity], [1, 0, 5]]);
  });

  it('matches every interval on 128 seeded rectangular, tied, and negative-valued grids', async () => {
    let seed = 0x5e9d2026;
    for (let sample = 0; sample < 128; sample++) {
      const width = 2 + sample % 4;
      const height = 2 + Math.floor(sample / 4) % 3;
      const values = Array.from({ length: width * height }, () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return ((seed >>> 16) % 7) - 3;
      });
      const actual = await compute({ kind: 'cubical', source: 'values', values, width, height, binarize: false, resultLimit: 200 });
      expect(intervals(actual), `sample ${sample}: ${width}x${height}`).toEqual(vertexGridOracle(values, width, height));
    }
  });

  it('reflects intensities for superlevel and samples row-major non-square grids at the requested stride', async () => {
    const image = { name: 'asymmetric', width: 5, height: 3, values: [0, 8, 1, 8, 0, 8, 8, 8, 8, 8, 1, 8, 6, 8, 2] };
    for (const downsample of [1, 2, 4] as const) {
      const sampled: number[] = [];
      for (let y = 0; y < image.height; y += downsample) for (let x = 0; x < image.width; x += downsample) sampled.push(image.values[y * image.width + x]!);
      const reflected = sampled.map((value) => Math.min(...sampled) + Math.max(...sampled) - value);
      const result = await compute({ kind: 'cubical', binarize: false, filtration: 'superlevel', downsample }, image);
      expect(result.input).toMatchObject({ name: image.name, downsample, filtration: 'superlevel', threshold: null, foreground: null });
      expect(intervals(result)).toEqual(vertexGridOracle(reflected, Math.ceil(image.width / downsample), Math.ceil(image.height / downsample)));
    }
  });

  it('preserves two well-separated holes through the real blur/threshold/closing pipeline', async () => {
    const width = 120, height = 65;
    const values = Array.from({ length: width * height }, (_, i) => {
      const x = i % width, y = Math.floor(i / width);
      return [30, 86].some((cx) => {
        const radius = Math.hypot(x - cx, y - 32);
        return radius >= 14 && radius <= 19;
      }) ? 0 : 255;
    });
    const result = await compute({ kind: 'cubical', threshold: 127 }, { name: 'two-rings', width, height, values });
    expect(result.input).toMatchObject({ binarized: true, threshold: 127, foreground: 'dark' });
    expect(intervals(result).filter((p) => p[0] === 1)).toEqual([[1, 0, 255], [1, 0, 255]]);
  });
});

describe('worker simplicial geometry and persistence', () => {
  it('uses the distinct Rips diameter, Čech radius, and alpha squared-radius conventions on a unit square', async () => {
    const points = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (const [complex, birth, death] of [
      ['rips', 1, Math.SQRT2], ['cech', 0.5, Math.SQRT1_2], ['alpha', 0.25, 0.5],
    ] as const) {
      const result = await compute({ kind: 'simplicial', complex, points, parameters: { maxEdgeLength: 2, maxRadius: 2, maxSimplexDimension: 3 } });
      expectPairs(intervals(result), [[0, 0, birth], [0, 0, birth], [0, 0, birth], [0, 0, Infinity], [1, birth, death]]);
      if (result.kind !== 'simplicial') throw new Error('wrong result kind');
      expect(result.interpretation.reliableThroughDimension).toBe(2);
      expect(result.visualization.truncated).toBe(false);
      expect(result.visualization.edges).toHaveLength(result.complexSummary.simplexCountsByDimension[1]!);
    }
  });

  it('matches exhaustive Rips subsets and F₂ matrix reduction before, at, and after edge births', async () => {
    const clouds = [
      [[0, 0], [1, 0], [1, 1], [0, 1]],
      [[0, 0], [0, 0], [1, 0], [3, 0]],
      [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1]],
    ];
    for (const points of clouds) for (const maxSimplexDimension of [1, 2, 3]) for (const cutoff of [0.999, 1, 1.5, 4]) {
      const result = await compute({ kind: 'simplicial', complex: 'rips', points, resultLimit: 200, parameters: { maxEdgeLength: cutoff, maxSimplexDimension } });
      if (result.kind !== 'simplicial') throw new Error('wrong result kind');
      const reliable = maxSimplexDimension - 1;
      const capped = ripsOracle(points, cutoff, maxSimplexDimension);
      // Capping at dimension d makes H_d an artifact: the result reports H_0..H_(d-1) and counts the rest as excluded.
      expect(result.interpretation.reliableThroughDimension).toBe(reliable);
      expectPairs(intervals(result), capped.filter((p) => p[0] <= reliable));
      const artifacts = capped.filter((p) => p[0] > reliable).length;
      expect(Object.values(result.persistence.excludedPairs).reduce((sum, count) => sum + count, 0)).toBe(artifacts);
      // The (i+1)-skeleton determines H_i, so the reported dimensions must equal those of a larger cap.
      expectPairs(intervals(result), ripsOracle(points, cutoff, Math.max(maxSimplexDimension, 3)).filter((p) => p[0] <= reliable));
    }
  });

  it('leaves out the cycle of a capped alpha complex instead of reporting an artifact as a feature', async () => {
    const result = await compute({ kind: 'simplicial', complex: 'alpha', points: [[0, 0], [1, 0], [1, 1], [0, 1]], parameters: { maxSimplexDimension: 1 } });
    if (result.kind !== 'simplicial') throw new Error('wrong result kind');
    expect(result.complexSummary.maxDimension).toBe(1);
    expect(result.visualization.simplices.every((s) => s.vertices.length <= 2)).toBe(true);
    expect(result.interpretation.reliableThroughDimension).toBe(0);
    // Four sides and one diagonal: two independent cycles, both essential without triangles.
    expect(result.persistence.excludedPairs).toEqual({ 1: 2 });
    expect(result.interpretation.warnings.join(' ')).toMatch(/2 H1 classes are not reported: the complex is capped at simplex dimension 1/);
    expect(intervals(result).every((p) => p[0] === 0)).toBe(true);
  });

  it('does not truncate a complete alpha complex, so its top-dimension classes are real', async () => {
    const points = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1], [-1, 0.2, 0.1]];
    const result = await compute({ kind: 'simplicial', complex: 'alpha', points });
    if (result.kind !== 'simplicial') throw new Error('wrong result kind');
    expect(result.interpretation).toEqual({ reliableThroughDimension: 3, warnings: [] });
    expect(result.persistence.excludedPairs).toEqual({});
  });

  it('defaults the Rips and Čech limits to the cloud diameter, so a cloud at any scale connects', async () => {
    const unit = [[1, 0], [0.5, 0.866], [-0.5, 0.866], [-1, 0], [-0.5, -0.866], [0.5, -0.866]];
    for (const scale of [1, 100, 0.01]) {
      const points = unit.map(([x, y]) => [x! * scale, y! * scale]);
      for (const complex of ['rips', 'cech'] as const) {
        const result = await compute({ kind: 'simplicial', complex, points });
        if (result.kind !== 'simplicial') throw new Error('wrong result kind');
        expect(result.input.defaulted).toEqual([complex === 'rips' ? 'maxEdgeLength' : 'maxRadius']);
        expect(result.input.scale.diameter).toBeCloseTo(2 * scale, 6);
        expect(result.persistence.essentialByDimension[0]).toBe(1);
        expect(result.persistence.persistentByDimension[1]).toBe(1);
        // A full-range complex always has top-dimension artifacts; they are left out, and that is only news when the caller capped the depth.
        expect(Object.keys(result.persistence.excludedPairs)).toEqual(['2']);
        expect(result.interpretation.warnings).toEqual([]);
      }
    }
  });

  it('warns when a chosen limit stops the filtration before the points connect', async () => {
    const points = [[0, 0], [1, 0], [10, 0], [11, 0]];
    const rips = await compute({ kind: 'simplicial', complex: 'rips', points, parameters: { maxEdgeLength: 2 } });
    const cech = await compute({ kind: 'simplicial', complex: 'cech', points, parameters: { maxRadius: 1 } });
    if (rips.kind !== 'simplicial' || cech.kind !== 'simplicial') throw new Error('wrong result kind');
    expect(rips.input.defaulted).toEqual([]);
    expect(rips.interpretation.warnings.join(' ')).toMatch(/At maxEdgeLength 2 the complex still has 2 connected components; the points connect at 9\./);
    expect(cech.interpretation.warnings.join(' ')).toMatch(/At maxRadius 1 the complex still has 2 connected components; the points connect at 4\.5\./);
  });

  it('returns structured worker errors without losing the next valid computation', async () => {
    await expect(compute({ kind: 'cubical', source: 'current' })).rejects.toThrow('No current image');
    await expect(compute({ kind: 'simplicial', complex: 'rips', points: [[0, 0], [NaN, 0]] })).rejects.toThrow('finite number');
    const result = await compute({ kind: 'simplicial', complex: 'rips', points: [[0, 0], [1, 0]] });
    expectPairs(intervals(result), [[0, 0, 1], [0, 0, Infinity]]);
  });
});
