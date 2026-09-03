import { describe, expect, it, vi } from 'vitest';
import { TdaRuntime, type ComputeBackend } from '../src/tda/runtime';
import type { ComputeResult } from '../src/tda/types';
import { createWebMcpTools } from '../src/webmcp/tools';

const fakeResult: ComputeResult = {
  kind: 'simplicial',
  complex: 'rips',
  input: {
    pointCount: 3,
    dimension: 2,
    coefficientField: 2,
    parameters: { maxEdgeLength: 1.5, maxSimplexDimension: 2 },
  },
  complexSummary: {
    simplexCount: 7,
    simplexCountsByDimension: { 0: 3, 1: 3, 2: 1 },
    maxDimension: 2,
  },
  visualization: {
    supported: true,
    reason: null,
    edges: [{ vertices: [0, 1], filtration: 1 }],
    edgeCount: 1,
    truncated: false,
    minFiltration: 0,
    maxFiltration: 1,
  },
  persistence: {
    pairCount: 1,
    pairsByDimension: { 0: 1 },
    essentialCount: 1,
    returnedPairCount: 1,
    strongestPairs: [{ id: 'H0:0:inf', dimension: 0, birth: 0, death: 'infinity', lifetime: 'infinity' }],
  },
  interpretation: { reliableThroughDimension: 1, warning: null },
  elapsedMs: 2,
};

describe('WebMCP tool contract', () => {
  it('exposes four tools that complement the human workbench', () => {
    const backend: ComputeBackend = { run: vi.fn().mockResolvedValue(fakeResult) };
    const tools = createWebMcpTools(new TdaRuntime(backend));
    expect(tools.map((tool) => tool.name)).toEqual([
      'tda_get_capabilities',
      'tda_compute_simplicial_persistence',
      'tda_compute_cubical_persistence',
      'tda_get_latest_result',
    ]);
    expect(tools.filter((tool) => tool.annotations?.readOnlyHint).map((tool) => tool.name)).toEqual([
      'tda_get_capabilities',
      'tda_get_latest_result',
    ]);
  });

  it('passes the WebMCP cancellation signal into the computation backend', async () => {
    const run = vi.fn().mockResolvedValue(fakeResult);
    const runtime = new TdaRuntime({ run });
    const tool = createWebMcpTools(runtime).find((candidate) => candidate.name === 'tda_compute_simplicial_persistence')!;
    const controller = new AbortController();
    await tool.execute({
      complex: 'rips',
      points: [[0, 0], [1, 0], [0, 1]],
      parameters: { maxEdgeLength: 1.5 },
    }, { signal: controller.signal });
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ kind: 'simplicial', complex: 'rips' }), expect.any(Object), controller.signal);
  });

  it('keeps the newer result when overlapping computations finish out of order', async () => {
    let resolveFirst: ((result: ComputeResult) => void) | undefined;
    const newer = { ...fakeResult, complex: 'cech' as const };
    const backend: ComputeBackend = {
      run: vi.fn()
        .mockImplementationOnce(() => new Promise<ComputeResult>((resolve) => { resolveFirst = resolve; }))
        .mockResolvedValueOnce(newer),
    };
    const runtime = new TdaRuntime(backend);
    const first = runtime.computeSimplicial({ kind: 'simplicial', complex: 'rips', points: [[0, 0], [1, 0]] });
    const second = runtime.computeSimplicial({ kind: 'simplicial', complex: 'cech', points: [[0, 0], [1, 0]] });
    await expect(second).resolves.toMatchObject({ complex: 'cech' });
    resolveFirst?.(fakeResult);
    await expect(first).rejects.toThrow(/superseded/);
    expect(runtime.getLatestResult().latestResult).toMatchObject({ complex: 'cech' });
  });
});
