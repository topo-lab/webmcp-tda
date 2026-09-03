import { updateWorkspace } from '../state';
import type { WebMcpTool } from './types';

const RETRY_INTERVAL_MS = 250;
const MAX_ATTEMPTS = 20;

export function registerWebMcpTools(tools: WebMcpTool[]): () => void {
  const registration = new AbortController();
  let attempt = 0;
  let timer: number | undefined;

  const tryRegister = async () => {
    if (registration.signal.aborted) return;
    attempt += 1;
    const modelContext = document.modelContext;
    if (!modelContext) {
      if (attempt < MAX_ATTEMPTS) {
        timer = window.setTimeout(() => void tryRegister(), RETRY_INTERVAL_MS);
      } else {
        updateWorkspace({ webMcpStatus: 'unsupported' });
      }
      return;
    }

    try {
      await Promise.all(tools.map((tool) => modelContext.registerTool(tool, { signal: registration.signal })));
      updateWorkspace({ webMcpStatus: 'ready' });
    } catch (error) {
      if (registration.signal.aborted) return;
      registration.abort(error);
      updateWorkspace({ webMcpStatus: 'error', error: error instanceof Error ? error.message : String(error) });
    }
  };

  void tryRegister();

  return () => {
    if (timer !== undefined) window.clearTimeout(timer);
    if (!registration.signal.aborted) registration.abort('Page unloaded');
  };
}
