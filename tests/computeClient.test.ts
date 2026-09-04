import { describe, expect, it } from 'vitest';
import { ComputeClient, type WorkerTransport } from '../src/tda/computeClient';
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

const result: ComputeResult = {
  kind: 'simplicial',
  complex: 'rips',
  input: { pointCount: 2, dimension: 2, coefficientField: 2, parameters: { maxSimplexDimension: 2 } },
  complexSummary: { simplexCount: 3, simplexCountsByDimension: { 0: 2, 1: 1 }, maxDimension: 1 },
  visualization: { supported: true, reason: null, simplices: [{ vertices: [0, 1], filtration: 1 }], simplexCount: 1, edges: [{ vertices: [0, 1], filtration: 1 }], edgeCount: 1, truncated: false, minFiltration: 0, maxFiltration: 1 },
  persistence: { pairCount: 1, pairsByDimension: { 0: 1 }, essentialCount: 1, returnedPairCount: 1, strongestPairs: [] },
  interpretation: { reliableThroughDimension: 1, warning: null },
  elapsedMs: 1,
};

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
});
