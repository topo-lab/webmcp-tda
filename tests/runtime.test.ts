import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getWorkspaceState, PLACEHOLDER_IMAGE_NAME, updateWorkspace } from '../src/state';
import { ToolInputError } from '../src/tda/errors';
import { TdaRuntime, type ComputeBackend } from '../src/tda/runtime';
import type { ComputeResult, CubicalRequest, SimplicialRequest } from '../src/tda/types';
import { cubicalResult, simplicialResult } from './helpers/fixtures';

vi.mock('../src/tda/imageSources', () => ({
  loadImageSample: vi.fn(async () => ({
    image: { name: 'chocolate-doughnut', width: 2, height: 2, values: [0, 255, 255, 0] },
    rgba: new Uint8ClampedArray(16),
  })),
}));

const request: SimplicialRequest = { kind: 'simplicial', complex: 'rips', points: [[0, 0], [1, 0], [0, 1]] };
const otherRequest: SimplicialRequest = { ...request, complex: 'cech' };

interface Call {
  signal: AbortSignal | undefined;
  resolve: (result: ComputeResult) => void;
  reject: (error: unknown) => void;
}

/** A backend whose runs stay open until the test settles them, like a busy worker. */
function openBackend() {
  const calls: Call[] = [];
  const backend: ComputeBackend = {
    run: (_request, _image, signal) => new Promise<ComputeResult>((resolve, reject) => {
      // Like the real client: a signal that is already aborted rejects at once.
      if (signal?.aborted) {
        reject(signal.reason);
        return;
      }
      calls.push({ signal, resolve, reject });
      signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
    }),
  };
  return { backend, calls };
}

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

describe('overlapping computations', () => {
  it('gives every caller its own result and shows only the newest request', async () => {
    const { backend, calls } = openBackend();
    const runtime = new TdaRuntime(backend);
    const first = runtime.computeSimplicial(request, { origin: 'agent' });
    const second = runtime.computeSimplicial(otherRequest, { origin: 'agent' });
    const olderResult = simplicialResult({ complex: 'rips' });
    const newerResult = simplicialResult({ complex: 'cech' });

    calls[1]!.resolve(newerResult);
    await expect(second).resolves.toEqual({ result: newerResult, shownInWorkspace: true });
    calls[0]!.resolve(olderResult);
    await expect(first).resolves.toEqual({ result: olderResult, shownInWorkspace: false });
    expect(getWorkspaceState()).toMatchObject({ status: 'ready', latestResult: newerResult });
  });

  it('stops a computation the person started when the input changes, but never an agent run', async () => {
    const { backend, calls } = openBackend();
    const runtime = new TdaRuntime(backend);
    const person = runtime.computeSimplicial(request);
    const agent = runtime.computeSimplicial(otherRequest, { origin: 'agent' });
    // The agent's run replaced the person's, so the person's run is already stopped.
    await expect(person).rejects.toMatchObject({ name: 'AbortError' });
    expect(calls[0]!.signal?.aborted).toBe(true);

    runtime.invalidateResult('Point coordinates changed.');
    expect(calls[1]!.signal?.aborted).toBe(false);
    expect(getWorkspaceState()).toMatchObject({ status: 'idle', latestResult: null, activity: 'Point coordinates changed.' });

    const result = simplicialResult({ complex: 'cech' });
    calls[1]!.resolve(result);
    await expect(agent).resolves.toEqual({ result, shownInWorkspace: false });
    expect(getWorkspaceState().latestResult).toBeNull();
  });

  it('terminates the person’s own running computation when an input edit arrives', async () => {
    const { backend, calls } = openBackend();
    const runtime = new TdaRuntime(backend);
    const person = runtime.computeSimplicial(request);
    runtime.invalidateResult('Filtration settings changed.');
    await expect(person).rejects.toMatchObject({ name: 'AbortError' });
    expect(calls[0]!.signal?.aborted).toBe(true);
    // The superseded run must not overwrite the message the edit just set.
    expect(getWorkspaceState()).toMatchObject({ status: 'idle', activity: 'Filtration settings changed.' });
  });

  it('cancels every run, whoever started it, and leaves the workbench idle', async () => {
    const { backend, calls } = openBackend();
    const runtime = new TdaRuntime(backend);
    const person = runtime.computeSimplicial(request);
    const agent = runtime.computeSimplicial(otherRequest, { origin: 'agent' });
    person.catch(() => undefined);
    runtime.cancel();
    await expect(agent).rejects.toMatchObject({ name: 'AbortError' });
    expect(calls.every((call) => call.signal?.aborted)).toBe(true);
    expect(getWorkspaceState()).toMatchObject({ status: 'idle', latestResult: null, activity: 'Computation cancelled.' });
  });

  it('forwards an abort from the host to the run and clears its listener', async () => {
    const { backend, calls } = openBackend();
    const runtime = new TdaRuntime(backend);
    const host = new AbortController();
    const run = runtime.computeSimplicial(request, { origin: 'agent', signal: host.signal });
    host.abort(new DOMException('stopped', 'AbortError'));
    await expect(run).rejects.toMatchObject({ name: 'AbortError' });
    expect(calls[0]!.signal?.aborted).toBe(true);
    expect(getWorkspaceState()).toMatchObject({ status: 'idle', activity: 'Computation cancelled.', error: null });

    const already = new AbortController();
    already.abort();
    await expect(runtime.computeSimplicial(request, { origin: 'agent', signal: already.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('reports a failed run only while it is the newest request', async () => {
    const { backend, calls } = openBackend();
    const runtime = new TdaRuntime(backend);
    const failing = runtime.computeSimplicial(request, { origin: 'agent' });
    calls[0]!.reject(new Error('engine failed'));
    await expect(failing).rejects.toThrow('engine failed');
    expect(getWorkspaceState()).toMatchObject({ status: 'error', error: 'engine failed', activity: 'Computation failed.' });

    const older = runtime.computeSimplicial(request, { origin: 'agent' });
    const newer = runtime.computeSimplicial(otherRequest, { origin: 'agent' });
    calls[1]!.reject('plain string failure');
    await expect(older).rejects.toBe('plain string failure');
    expect(getWorkspaceState().status).toBe('computing');
    calls[2]!.resolve(simplicialResult());
    await newer;
    expect(getWorkspaceState().status).toBe('ready');

    const refused = runtime.computeSimplicial(request, { origin: 'agent' });
    calls[3]!.reject('not an Error');
    await expect(refused).rejects.toBe('not an Error');
    expect(getWorkspaceState()).toMatchObject({ status: 'error', error: 'not an Error' });
  });
});

describe('image inputs', () => {
  const backend: ComputeBackend = { run: vi.fn(async () => cubicalResult()) };

  it('refuses source "current" while only the placeholder image exists', async () => {
    updateWorkspace({ currentImage: { name: PLACEHOLDER_IMAGE_NAME, width: 2, height: 2, values: [255, 255, 255, 255] } });
    const runtime = new TdaRuntime(backend);
    await expect(runtime.computeCubical({ kind: 'cubical' })).rejects.toBeInstanceOf(ToolInputError);
    await expect(runtime.computeCubical({ kind: 'cubical' })).rejects.toThrow('still loading');
  });

  it('loads a bundled sample into the workbench before computing', async () => {
    const runtime = new TdaRuntime(backend);
    const request: CubicalRequest = { kind: 'cubical', source: 'sample', sample: 'donut' };
    await runtime.computeCubical(request);
    expect(getWorkspaceState().currentImage.name).toBe('chocolate-doughnut');
    expect(backend.run).toHaveBeenLastCalledWith(request, expect.objectContaining({ name: 'chocolate-doughnut' }), expect.any(AbortSignal));
  });

  it('shows a supplied grid as the current image', async () => {
    const runtime = new TdaRuntime(backend);
    await runtime.computeCubical({ kind: 'cubical', source: 'values', width: 2, height: 2, values: [0, 1, 1, 0] });
    expect(getWorkspaceState().currentImage).toMatchObject({ name: 'agent-values', width: 2, height: 2, values: [0, 1, 1, 0] });
    expect(runtime.getLatestResult()).toMatchObject({
      status: 'ready',
      currentImage: { name: 'agent-values', width: 2, height: 2 },
    });
  });
});
