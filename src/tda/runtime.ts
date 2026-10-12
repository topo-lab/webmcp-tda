import { getWorkspaceState, PLACEHOLDER_IMAGE_NAME, updateWorkspace } from '../state';
import { isAbortError, ToolInputError } from './errors';
import { loadImageSample, type LoadedImage } from './imageSources';
import { computeClient } from './computeClient';
import type { ComputeResult, CubicalRequest, ScalarImage, SimplicialRequest } from './types';
import { validateCubicalRequest, validateSimplicialRequest } from './validation';

export interface ComputeBackend {
  run(request: SimplicialRequest | CubicalRequest, currentImage: ScalarImage, signal?: AbortSignal): Promise<ComputeResult>;
}

export type RunOrigin = 'human' | 'agent';

export interface RunOptions {
  /** A person's run is stopped as soon as it can no longer be shown. An agent's run always finishes for its caller. */
  origin?: RunOrigin;
  signal?: AbortSignal;
}

export interface ComputeOutcome {
  result: ComputeResult;
  /** False when a newer request or an input edit replaced this one in the visible workbench. */
  shownInWorkspace: boolean;
}

interface Job {
  controller: AbortController;
  origin: RunOrigin;
}

function cancelled(message: string): DOMException {
  return new DOMException(message, 'AbortError');
}

export class TdaRuntime {
  private generation = 0;
  private readonly jobs = new Set<Job>();

  constructor(private readonly backend: ComputeBackend = computeClient) {}

  /** An input edit replaces what is shown and stops work the person started; agent calls keep running. */
  invalidateResult(activity: string): void {
    ++this.generation;
    this.abortJobs((job) => job.origin === 'human', 'The input changed before the computation finished.');
    updateWorkspace({ status: 'idle', latestResult: null, error: null, activity });
  }

  /** The Cancel button: stops every running or queued computation, whoever started it. */
  cancel(): void {
    ++this.generation;
    this.abortJobs(() => true, 'The person using the page cancelled the computation.');
    updateWorkspace({ status: 'idle', latestResult: null, error: null, activity: 'Computation cancelled.' });
  }

  async computeSimplicial(request: SimplicialRequest, options: RunOptions = {}): Promise<ComputeOutcome> {
    validateSimplicialRequest(request);
    return this.run(request, options);
  }

  async computeCubical(request: CubicalRequest, options: RunOptions = {}): Promise<ComputeOutcome> {
    validateCubicalRequest(request);
    if ((request.source ?? 'current') === 'sample') {
      return this.run(request, options, (signal) => loadImageSample(request.sample!, signal));
    } else if (request.source === 'values') {
      return this.run(request, options, () => ({
        image: {
          name: 'agent-values',
          width: request.width!,
          height: request.height!,
          values: [...request.values!],
        },
        rgba: null,
      }));
    } else if (getWorkspaceState().currentImage.name === PLACEHOLDER_IMAGE_NAME) {
      throw new ToolInputError('invalid_input', 'The workbench image is still loading.', {
        field: 'source',
        hint: 'Retry in a moment, or use source "sample" or "values".',
      });
    }
    return this.run(request, options);
  }

  getLatestResult() {
    const state = getWorkspaceState();
    return {
      status: state.status,
      activity: state.activity,
      error: state.error,
      latestRequest: state.latestRequest,
      latestResult: state.latestResult,
      currentImage: {
        name: state.currentImage.name,
        width: state.currentImage.width,
        height: state.currentImage.height,
      },
    };
  }

  private abortJobs(select: (job: Job) => boolean, reason: string): void {
    for (const job of this.jobs) {
      if (select(job)) job.controller.abort(cancelled(reason));
    }
  }

  private async run(
    request: SimplicialRequest | CubicalRequest,
    { origin = 'human', signal }: RunOptions,
    prepareImage?: (signal: AbortSignal) => LoadedImage | { image: ScalarImage; rgba: null } | Promise<LoadedImage>,
  ): Promise<ComputeOutcome> {
    // The newest request owns the workbench, so a person's older run can never be shown.
    this.abortJobs((job) => job.origin === 'human', 'A newer computation replaced this one.');
    const generation = ++this.generation;
    const job: Job = { controller: new AbortController(), origin };
    this.jobs.add(job);
    const forwardAbort = () => job.controller.abort(signal?.reason);
    if (signal?.aborted) forwardAbort();
    else signal?.addEventListener('abort', forwardAbort, { once: true });

    updateWorkspace({
      status: 'computing',
      activity: `Computing ${request.kind} persistence…`,
      error: null,
      latestRequest: request,
      latestResult: null,
    });
    try {
      let image = getWorkspaceState().currentImage;
      if (job.controller.signal.aborted) throw job.controller.signal.reason;
      if (prepareImage) {
        const loaded = await prepareImage(job.controller.signal);
        if (job.controller.signal.aborted) throw job.controller.signal.reason;
        image = loaded.image;
        // Image preparation is part of the job: an older download must not replace a newer input or result.
        if (generation === this.generation) updateWorkspace({ currentImage: image, currentImageRgba: loaded.rgba });
      }
      const result = await this.backend.run(request, image, job.controller.signal);
      const shownInWorkspace = generation === this.generation;
      if (shownInWorkspace) {
        updateWorkspace({ status: 'ready', activity: `${result.kind} persistence ready.`, latestResult: result });
      }
      return { result, shownInWorkspace };
    } catch (error) {
      if (generation === this.generation) {
        if (isAbortError(error)) {
          updateWorkspace({ status: 'idle', activity: 'Computation cancelled.', error: null });
        } else {
          updateWorkspace({
            status: 'error',
            activity: 'Computation failed.',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      throw error;
    } finally {
      this.jobs.delete(job);
      signal?.removeEventListener('abort', forwardAbort);
    }
  }
}

export const tdaRuntime = new TdaRuntime();
