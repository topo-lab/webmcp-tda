import type { ComputeResult, ScalarImage } from './tda/types';

export type ServiceStatus = 'idle' | 'computing' | 'ready' | 'error';
export type WebMcpStatus = 'registering' | 'ready' | 'unsupported' | 'error';

export interface WorkspaceState {
  status: ServiceStatus;
  webMcpStatus: WebMcpStatus;
  activity: string;
  error: string | null;
  currentImage: ScalarImage;
  currentImageRgba: Uint8ClampedArray | null;
  latestResult: ComputeResult | null;
  latestRequest: unknown;
}

const state: WorkspaceState = {
  status: 'idle',
  webMcpStatus: 'registering',
  activity: 'Ready for a human or agent request.',
  error: null,
  currentImage: { name: 'loading-example', width: 2, height: 2, values: [255, 255, 255, 255] },
  currentImageRgba: null,
  latestResult: null,
  latestRequest: null,
};

const listeners = new Set<(state: WorkspaceState) => void>();

export function getWorkspaceState(): WorkspaceState {
  return state;
}

export function updateWorkspace(patch: Partial<WorkspaceState>): void {
  Object.assign(state, patch);
  listeners.forEach((listener) => listener(state));
}

export function subscribeWorkspace(listener: (state: WorkspaceState) => void): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}
