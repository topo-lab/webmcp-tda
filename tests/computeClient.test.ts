import { describe, expect, it, vi } from 'vitest';
import { ComputeClient, type WorkerTransport } from '../src/tda/computeClient';
import { simplicialResult } from './helpers/fixtures';
import type { ComputeResult, ScalarImage, SimplicialRequest, WorkerRequestMessage, WorkerResponseMessage } from '../src/tda/types';

class FakeWorker implements WorkerTransport {
  onmessage: ((event: MessageEvent<WorkerResponseMessage>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  messages: WorkerRequestMessage[] = [];
  terminated = false;

  postMessage(message: WorkerRequestMessage): void {
    this.messages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  resolve(result: ComputeResult): void {
    const request = this.messages[0]!;
    this.onmessage?.({ data: { id: request.id, ok: true, result } } as MessageEvent<WorkerResponseMessage>);
  }
}

const request: SimplicialRequest = {
  kind: 'simplicial',
  complex: 'rips',
  points: [[0, 0], [1, 0]],
};

const currentImage: ScalarImage = {
  name: 'test-image',
  width: 2,
  height: 2,
  values: [0, 255, 255, 0],
};

const result: ComputeResult = simplicialResult();

describe('ComputeClient cancellation', () => {
  it('terminates an active Worker and runs the queued request in a fresh Worker', async () => {
    const workers: FakeWorker[] = [];
    const client = new ComputeClient(() => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    });
    const controller = new AbortController();
    const first = client.run(request, currentImage, controller.signal);
    const firstExpectation = expect(first).rejects.toMatchObject({ name: 'AbortError' });
    const second = client.run(request, currentImage);

    expect(workers).toHaveLength(1);
    expect(workers[0]!.messages).toHaveLength(1);
    controller.abort();
    await firstExpectation;

    expect(workers[0]!.terminated).toBe(true);
    expect(workers).toHaveLength(2);
    expect(workers[1]!.messages).toHaveLength(1);
    workers[1]!.resolve(result);
    await expect(second).resolves.toBe(result);
    client.dispose();
  });

  it('removes a cancelled queued computation without terminating the active one', async () => {
    const worker = new FakeWorker();
    const client = new ComputeClient(() => worker);
    const active = client.run(request, currentImage);
    const controller = new AbortController();
    const cancelled = client.run(request, currentImage, controller.signal);
    const rejection = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort('no longer needed');
    await rejection;
    expect(worker.terminated).toBe(false);
    expect(worker.messages).toHaveLength(1);
    worker.resolve(result);
    await expect(active).resolves.toBe(result);
    expect(worker.messages).toHaveLength(1);
    client.dispose();
  });

  it('ignores stale response IDs, propagates a backend error, and starts the next queued job', async () => {
    const worker = new FakeWorker();
    const client = new ComputeClient(() => worker);
    const first = client.run(request, currentImage);
    const rejection = expect(first).rejects.toThrow('invalid filtration');
    const second = client.run(request, currentImage);
    worker.onmessage?.({ data: { id: 'obsolete', ok: true, result } } as MessageEvent<WorkerResponseMessage>);
    expect(worker.messages).toHaveLength(1);
    worker.onmessage?.({ data: { id: worker.messages[0]!.id, ok: false, error: 'invalid filtration' } } as MessageEvent<WorkerResponseMessage>);
    await rejection;
    expect(worker.messages).toHaveLength(2);
    worker.onmessage?.({ data: { id: worker.messages[1]!.id, ok: true, result } } as MessageEvent<WorkerResponseMessage>);
    await expect(second).resolves.toBe(result);
    // A late duplicate must not become the next job's answer.
    worker.resolve(result);
    client.dispose();
  });

  it.each([
    { error: new Error('wasm trap'), message: 'ignored' },
    { error: null, message: 'worker failed to load' },
    { error: null, message: '' },
  ])('restarts after an uncaught worker error and keeps queued work: %j', async (event) => {
    const workers: FakeWorker[] = [];
    const client = new ComputeClient(() => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    });
    const first = client.run(request, currentImage);
    const rejection = expect(first).rejects.toThrow(event.error?.message || event.message || 'Compute worker failed.');
    const second = client.run(request, currentImage);
    workers[0]!.onerror?.(event as ErrorEvent);
    await rejection;
    expect(workers[0]!.terminated).toBe(true);
    expect(workers).toHaveLength(2);
    workers[1]!.resolve(result);
    await expect(second).resolves.toBe(result);
    client.dispose();
  });

  it('rejects active and queued work on disposal, detaches cancellation listeners, and never dispatches queued work', async () => {
    const worker = new FakeWorker();
    const client = new ComputeClient(() => worker);
    const controllers = [new AbortController(), new AbortController()];
    const removals = controllers.map((c) => vi.spyOn(c.signal, 'removeEventListener'));
    const jobs = controllers.map((c) => client.run(request, currentImage, c.signal));
    const rejections = jobs.map((job) => expect(job).rejects.toThrow('disposed'));
    client.dispose();
    await Promise.all(rejections);
    expect(removals.every((remove) => remove.mock.calls.length === 1)).toBe(true);
    controllers.forEach((c) => c.abort());
    expect(worker.terminated).toBe(true);
    expect(worker.messages).toHaveLength(1);
    client.dispose();
  });

  it('does not create a worker for an already-aborted request', async () => {
    const factory = vi.fn(() => new FakeWorker());
    const client = new ComputeClient(factory);
    const controller = new AbortController();
    const reason = new Error('superseded input');
    controller.abort(reason);
    await expect(client.run(request, currentImage, controller.signal)).rejects.toBe(reason);
    expect(factory).not.toHaveBeenCalled();
  });
});
