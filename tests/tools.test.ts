import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateWorkspace } from '../src/state';
import { TdaRuntime, type ComputeBackend } from '../src/tda/runtime';
import type { ComputeResult } from '../src/tda/types';
import { createWebMcpTools } from '../src/webmcp/tools';
import { simplicialResult } from './helpers/fixtures';

beforeEach(() => {
  updateWorkspace({
    status: 'idle',
    activity: 'Ready.',
    error: null,
    latestRequest: null,
    latestResult: null,
    currentImage: { name: 'test-image', width: 2, height: 2, values: [0, 255, 255, 0] },
    currentImageRgba: null,
  });
});

function tool(tools: ReturnType<typeof createWebMcpTools>, name: string) {
  return tools.find((candidate) => candidate.name === name)!;
}

describe('WebMCP tool set', () => {
  it('exposes four tools that complement the human workbench', () => {
    const tools = createWebMcpTools(new TdaRuntime({ run: vi.fn().mockResolvedValue(simplicialResult()) }));
    expect(tools.map((candidate) => candidate.name)).toEqual([
      'tda_get_capabilities',
      'tda_compute_simplicial_persistence',
      'tda_compute_cubical_persistence',
      'tda_get_latest_result',
    ]);
    expect(tools.filter((candidate) => candidate.annotations?.readOnlyHint).map((candidate) => candidate.name)).toEqual([
      'tda_get_capabilities',
      'tda_get_latest_result',
    ]);
    const schema = tool(tools, 'tda_compute_simplicial_persistence').inputSchema as { properties: { complex: { enum: string[] } } };
    expect(schema.properties.complex.enum).toEqual(['rips', 'alpha', 'cech']);
  });

  it('keeps descriptions within Chrome’s character budgets', () => {
    const tools = createWebMcpTools(new TdaRuntime({ run: vi.fn() }));
    for (const candidate of tools) {
      expect(candidate.description.length, candidate.name).toBeLessThanOrEqual(500);
      const properties = (candidate.inputSchema as { properties: Record<string, { description?: string }> }).properties;
      for (const [name, schema] of Object.entries(properties)) {
        expect((schema.description ?? '').length, `${candidate.name}.${name}`).toBeLessThanOrEqual(150);
      }
    }
  });
});

describe('overlapping and cancelled agent calls', () => {
  it('lets the host abort a running call and rethrows, because nobody awaits a result', async () => {
    let seen: AbortSignal | undefined;
    const backend: ComputeBackend = {
      run: (_request, _image, signal) => new Promise<ComputeResult>((_resolve, reject) => {
        seen = signal;
        signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
      }),
    };
    const simplicial = tool(createWebMcpTools(new TdaRuntime(backend)), 'tda_compute_simplicial_persistence');
    const host = new AbortController();
    const call = simplicial.execute({ complex: 'rips', points: [[0, 0], [1, 0], [0, 1]] }, { signal: host.signal });
    await vi.waitFor(() => expect(seen).toBeDefined());
    host.abort(new DOMException('stopped', 'AbortError'));
    await expect(call).rejects.toMatchObject({ name: 'AbortError' });
    expect(seen?.aborted).toBe(true);
  });

  it('returns a cancelled result when the page, not the host, stops the run', async () => {
    const backend: ComputeBackend = {
      run: (_request, _image, signal) => new Promise<ComputeResult>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
      }),
    };
    const runtime = new TdaRuntime(backend);
    const simplicial = tool(createWebMcpTools(runtime), 'tda_compute_simplicial_persistence');
    const call = simplicial.execute({ complex: 'rips', points: [[0, 0], [1, 0], [0, 1]] }, { signal: new AbortController().signal });
    runtime.cancel();
    await expect(call).resolves.toMatchObject({ ok: false, error: { code: 'cancelled' } });
  });

  it('answers both of two overlapping calls and says which one the workbench shows', async () => {
    const settle: Array<(result: ComputeResult) => void> = [];
    const backend: ComputeBackend = { run: () => new Promise<ComputeResult>((resolve) => { settle.push(resolve); }) };
    const simplicial = tool(createWebMcpTools(new TdaRuntime(backend)), 'tda_compute_simplicial_persistence');
    const cloud = [[0, 0], [1, 0], [0, 1]];
    const first = simplicial.execute({ complex: 'rips', points: cloud });
    const second = simplicial.execute({ complex: 'cech', points: cloud });
    settle[1]!(simplicialResult({ complex: 'cech' }));
    settle[0]!(simplicialResult({ complex: 'rips' }));
    await expect(second).resolves.toMatchObject({ ok: true, input: { complex: 'cech' }, shownInWorkspace: true });
    await expect(first).resolves.toMatchObject({ ok: true, input: { complex: 'rips' }, shownInWorkspace: false });
  });
});
