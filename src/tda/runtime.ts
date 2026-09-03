import { getWorkspaceState, updateWorkspace } from '../state';
import { imageSample } from './samples';
import { computeClient } from './computeClient';
import type { ComputeResult, CubicalRequest, ScalarImage, SimplicialRequest } from './types';
import { validateCubicalRequest, validateSimplicialRequest } from './validation';

export interface ComputeBackend {
  run(request: SimplicialRequest | CubicalRequest, currentImage: ScalarImage, signal?: AbortSignal): Promise<ComputeResult>;
}

export class TdaRuntime {
  private generation = 0;

  constructor(private readonly backend: ComputeBackend = computeClient) {}

  async computeSimplicial(request: SimplicialRequest, signal?: AbortSignal): Promise<ComputeResult> {
    validateSimplicialRequest(request);
    return this.run(request, signal);
  }

  async computeCubical(request: CubicalRequest, signal?: AbortSignal): Promise<ComputeResult> {
    validateCubicalRequest(request);
    if ((request.source ?? 'current') === 'sample') {
      updateWorkspace({ currentImage: imageSample(request.sample!) });
    } else if (request.source === 'values') {
      updateWorkspace({
        currentImage: {
          name: 'agent-values',
          width: request.width!,
          height: request.height!,
          values: [...request.values!],
        },
      });
    }
    return this.run(request, signal);
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

  private async run(request: SimplicialRequest | CubicalRequest, signal?: AbortSignal): Promise<ComputeResult> {
    const generation = ++this.generation;
    updateWorkspace({
      status: 'computing',
      activity: `Computing ${request.kind} persistence…`,
      error: null,
      latestRequest: request,
      latestResult: null,
    });
    try {
      const result = await this.backend.run(request, getWorkspaceState().currentImage, signal);
      if (generation !== this.generation) throw new Error('This result was superseded by a newer computation.');
      updateWorkspace({ status: 'ready', activity: `${result.kind} persistence ready.`, latestResult: result });
      return result;
    } catch (error) {
      if (generation === this.generation) {
        const message = error instanceof Error ? error.message : String(error);
        updateWorkspace({ status: 'error', activity: 'Computation failed.', error: message });
      }
      throw error;
    }
  }
}

export const tdaRuntime = new TdaRuntime();
