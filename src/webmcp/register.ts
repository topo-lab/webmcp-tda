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
    if (typeof modelContext?.registerTool !== 'function') {
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

export interface PageLifecycleEvents {
  addEventListener(type: 'pagehide' | 'pageshow', listener: (event: PageTransitionEvent) => void): void;
  removeEventListener(type: 'pagehide' | 'pageshow', listener: (event: PageTransitionEvent) => void): void;
}

/**
 * Keeps the tools registered across back/forward-cache navigation. A page that is stored
 * (`persisted`) unregisters its tools and registers them again when it is restored; a page that is
 * really going away needs no cleanup, because a document's tools disappear with it.
 */
export function keepWebMcpRegistered(tools: WebMcpTool[], page: PageLifecycleEvents = window): () => void {
  let unregister: (() => void) | null = registerWebMcpTools(tools);

  const onPageHide = (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    unregister?.();
    unregister = null;
  };
  const onPageShow = (event: PageTransitionEvent) => {
    if (!event.persisted || unregister !== null) return;
    updateWorkspace({ webMcpStatus: 'registering' });
    unregister = registerWebMcpTools(tools);
  };

  page.addEventListener('pagehide', onPageHide);
  page.addEventListener('pageshow', onPageShow);
  return () => {
    page.removeEventListener('pagehide', onPageHide);
    page.removeEventListener('pageshow', onPageShow);
    unregister?.();
    unregister = null;
  };
}
