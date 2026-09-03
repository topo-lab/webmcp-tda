import type { ComputeRequest, ComputeResult, ScalarImage, WorkerRequestMessage, WorkerResponseMessage } from './types';

export interface WorkerTransport {
  onmessage: ((event: MessageEvent<WorkerResponseMessage>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: WorkerRequestMessage): void;
  terminate(): void;
}

interface PendingJob {
  id: string;
  request: ComputeRequest;
  currentImage: ScalarImage;
  resolve: (result: ComputeResult) => void;
  reject: (error: Error) => void;
  removeAbortListener: () => void;
}

export class ComputeClient {
  private worker: WorkerTransport | null = null;
  private nextId = 0;
  private active: PendingJob | null = null;
  private readonly queue: PendingJob[] = [];

  constructor(private readonly workerFactory: () => WorkerTransport = () => new Worker(
    new URL('./compute.worker.ts', import.meta.url),
    { type: 'module' },
  )) {}

  private ensureWorker(): WorkerTransport {
    if (!this.worker) {
      this.worker = this.workerFactory();
      this.worker.onmessage = this.handleMessage;
      this.worker.onerror = this.handleError;
    }
    return this.worker;
  }

  private handleMessage = (event: MessageEvent<WorkerResponseMessage>) => {
    const message = event.data;
    const job = this.active;
    if (!job || message.id !== job.id) return;
    this.active = null;
    job.removeAbortListener();
    if (message.ok) job.resolve(message.result);
    else job.reject(new Error(message.error));
    this.pump();
  };

  private handleError = (event: ErrorEvent) => {
    const error = event.error instanceof Error ? event.error : new Error(event.message || 'Compute worker failed.');
    const job = this.active;
    this.active = null;
    job?.removeAbortListener();
    job?.reject(error);
    this.restartWorker();
    this.pump();
  };

  private restartWorker(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  private cancel(job: PendingJob, reason: unknown): void {
    const error = reason instanceof Error ? reason : new DOMException('Computation cancelled.', 'AbortError');
    if (this.active?.id === job.id) {
      this.active = null;
      job.removeAbortListener();
      job.reject(error);
      this.restartWorker();
      this.pump();
      return;
    }
    const queueIndex = this.queue.findIndex((candidate) => candidate.id === job.id);
    if (queueIndex >= 0) {
      this.queue.splice(queueIndex, 1);
      job.removeAbortListener();
      job.reject(error);
    }
  }

  private pump(): void {
    if (this.active || this.queue.length === 0) return;
    const job = this.queue.shift()!;
    this.active = job;
    this.ensureWorker().postMessage({ id: job.id, request: job.request, currentImage: job.currentImage });
  }

  run(request: ComputeRequest, currentImage: ScalarImage, signal?: AbortSignal): Promise<ComputeResult> {
    if (signal?.aborted) return Promise.reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    const id = `compute-${++this.nextId}`;
    return new Promise((resolve, reject) => {
      let job: PendingJob;
      const onAbort = () => this.cancel(job, signal?.reason);
      job = {
        id,
        request,
        currentImage,
        resolve,
        reject,
        removeAbortListener: () => signal?.removeEventListener('abort', onAbort),
      };
      signal?.addEventListener('abort', onAbort, { once: true });
      this.queue.push(job);
      this.pump();
    });
  }

  dispose(): void {
    this.restartWorker();
    const error = new Error('Compute client disposed.');
    if (this.active) {
      this.active.removeAbortListener();
      this.active.reject(error);
      this.active = null;
    }
    for (const job of this.queue) {
      job.removeAbortListener();
      job.reject(error);
    }
    this.queue.length = 0;
  }
}

export const computeClient = new ComputeClient();
