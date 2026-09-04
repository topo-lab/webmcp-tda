import Ajv from 'ajv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CAPABILITIES } from '../src/tda/capabilities';
import { getWorkspaceState, updateWorkspace } from '../src/state';
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
    simplices: [],
    simplexCount: 0,
    edges: [],
    edgeCount: 0,
    truncated: false,
    minFiltration: 0,
    maxFiltration: 1,
  },
  persistence: {
    pairCount: 1,
    pairsByDimension: { 0: 1 },
    essentialCount: 1,
    returnedPairCount: 1,
    strongestPairs: [],
  },
  interpretation: { reliableThroughDimension: 1, warning: null },
  elapsedMs: 2,
};

function toolByName(tools: ReturnType<typeof createWebMcpTools>, name: string) {
  return tools.find((tool) => tool.name === name)!;
}

describe('WebMCP agent contract', () => {
  const signal = new AbortController().signal;

  beforeEach(() => {
    updateWorkspace({
      status: 'idle',
      activity: 'Ready for a human or agent request.',
      error: null,
      latestRequest: null,
      latestResult: null,
      currentImage: { name: 'test-image', width: 2, height: 2, values: [0, 255, 255, 0] },
      currentImageRgba: null,
    });
  });

  it('publishes spec-valid metadata, closed schemas, and explicit safety annotations', () => {
    const runtime = new TdaRuntime({ run: vi.fn().mockResolvedValue(fakeResult) });
    const tools = createWebMcpTools(runtime);
    const ajv = new Ajv({ allErrors: true, strict: false });

    expect(tools).toHaveLength(4);
    expect(new Set(tools.map((tool) => tool.name)).size).toBe(tools.length);

    for (const tool of tools) {
      expect(tool.name).toMatch(/^[A-Za-z0-9_.-]{1,128}$/);
      expect(tool.title?.trim()).not.toBe('');
      expect(tool.description.trim()).not.toBe('');
      expect(tool.inputSchema).toMatchObject({
        type: 'object',
        additionalProperties: false,
      });
      expect(() => ajv.compile(tool.inputSchema!)).not.toThrow();
      expect(tool.annotations).toEqual({
        readOnlyHint: tool.name.startsWith('tda_get_'),
        untrustedContentHint: false,
        consequentialHint: false,
      });
    }
  });

  it('uses schemas that accept valid agent calls and reject malformed inputs', () => {
    const runtime = new TdaRuntime({ run: vi.fn().mockResolvedValue(fakeResult) });
    const tools = createWebMcpTools(runtime);
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validateCapabilities = ajv.compile(toolByName(tools, 'tda_get_capabilities').inputSchema!);
    const validateSimplicial = ajv.compile(toolByName(tools, 'tda_compute_simplicial_persistence').inputSchema!);
    const validateCubical = ajv.compile(toolByName(tools, 'tda_compute_cubical_persistence').inputSchema!);
    const validateLatest = ajv.compile(toolByName(tools, 'tda_get_latest_result').inputSchema!);

    expect(validateCapabilities({})).toBe(true);
    expect(validateCapabilities({ unexpected: true })).toBe(false);
    expect(validateLatest({})).toBe(true);
    expect(validateLatest({ unexpected: true })).toBe(false);

    expect(validateSimplicial({
      complex: 'cech',
      points: [[0, 0, 0], [1, 0, 0]],
      coefficientField: 3,
      resultLimit: 20,
      parameters: { maxRadius: 2, maxSimplexDimension: 3 },
    })).toBe(true);
    expect(validateSimplicial({
      complex: 'rips',
      points: [[0, 0, 0, 0], [1, 0, 0, 0]],
    })).toBe(false);
    expect(validateSimplicial({ complex: 'wing', points: [[0, 0], [1, 0]] })).toBe(false);
    expect(validateSimplicial({ complex: 'rips', points: [[0, 0]], unexpected: true })).toBe(false);

    expect(validateCubical({
      source: 'values',
      width: 2,
      height: 2,
      values: [0, 1, 1, 0],
      binarize: false,
      filtration: 'superlevel',
    })).toBe(true);
    expect(validateCubical({ source: 'values', width: 257, height: 2, values: [] })).toBe(false);
    expect(validateCubical({ source: 'unknown' })).toBe(false);
  });

  it('executes every tool, forwards cancellation, and synchronizes the shared result', async () => {
    const cubicalResult: ComputeResult = {
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
      persistence: fakeResult.persistence,
      elapsedMs: 2,
    };
    const run = vi.fn()
      .mockResolvedValueOnce(fakeResult)
      .mockResolvedValueOnce(cubicalResult);
    const runtime = new TdaRuntime({ run } satisfies ComputeBackend);
    const tools = createWebMcpTools(runtime);

    await expect(toolByName(tools, 'tda_get_capabilities').execute({}, { signal }))
      .resolves.toBe(CAPABILITIES);

    await expect(toolByName(tools, 'tda_compute_simplicial_persistence').execute({
      complex: 'rips',
      points: [[0, 0], [1, 0], [0, 1]],
      parameters: { maxEdgeLength: 1.5 },
    }, { signal })).resolves.toBe(fakeResult);

    await expect(toolByName(tools, 'tda_compute_cubical_persistence').execute({
      source: 'values',
      width: 2,
      height: 2,
      values: [0, 255, 255, 0],
    }, { signal })).resolves.toBe(cubicalResult);

    expect(run).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ kind: 'simplicial', complex: 'rips' }),
      expect.any(Object),
      signal,
    );
    expect(run).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ kind: 'cubical', source: 'values' }),
      expect.objectContaining({ name: 'agent-values' }),
      signal,
    );

    const latest = await toolByName(tools, 'tda_get_latest_result').execute({}, { signal });
    expect(latest).toMatchObject({
      status: 'ready',
      latestResult: { kind: 'cubical' },
      currentImage: { name: 'agent-values', width: 2, height: 2 },
    });
    expect(getWorkspaceState().latestResult).toBe(cubicalResult);
  });

  it('enforces closed schemas inside the page when the browser does not', async () => {
    const runtime = new TdaRuntime({ run: vi.fn().mockResolvedValue(fakeResult) });
    const tools = createWebMcpTools(runtime);

    await expect(toolByName(tools, 'tda_get_capabilities').execute(
      { unexpected: true },
      { signal },
    )).rejects.toThrow('unsupported field "unexpected"');
    await expect(toolByName(tools, 'tda_get_latest_result').execute(
      [] as never,
      { signal },
    )).rejects.toThrow('input must be an object');
    await expect(toolByName(tools, 'tda_compute_simplicial_persistence').execute({
      complex: 'rips',
      points: [[0, 0], [1, 0]],
      parameters: { maxEdgeLength: 1, unexpected: true },
    }, { signal })).rejects.toThrow('parameters contains unsupported field "unexpected"');
    await expect(toolByName(tools, 'tda_compute_cubical_persistence').execute({
      source: 'current',
      unexpected: true,
    }, { signal })).rejects.toThrow('input contains unsupported field "unexpected"');
  });
});
