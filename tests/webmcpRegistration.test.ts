import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebMcpTool } from '../src/webmcp/types';

const mocks = vi.hoisted(() => ({
  updateWorkspace: vi.fn(),
}));

vi.mock('../src/state', () => ({
  updateWorkspace: mocks.updateWorkspace,
}));

import { keepWebMcpRegistered, registerWebMcpTools } from '../src/webmcp/register';

const tools: WebMcpTool[] = [
  {
    name: 'test_tool',
    description: 'Test tool registration.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => ({ ok: true }),
  },
  {
    name: 'second_tool',
    description: 'Test multiple tool registration.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => ({ ok: true }),
  },
];

function installBrowser(modelContext?: { registerTool: ReturnType<typeof vi.fn> }) {
  vi.stubGlobal('document', { modelContext });
  vi.stubGlobal('window', {
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  });
}

async function flushRegistration(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('WebMCP browser registration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.updateWorkspace.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('registers every tool with one lifetime signal and reports ready', async () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    installBrowser({ registerTool });

    const unregister = registerWebMcpTools(tools);
    await flushRegistration();

    expect(registerTool).toHaveBeenCalledTimes(2);
    expect(registerTool.mock.calls.map(([tool]) => tool)).toEqual(tools);
    const signals = registerTool.mock.calls.map(([, options]) => options.signal as AbortSignal);
    expect(signals[0]).toBe(signals[1]);
    expect(signals[0]?.aborted).toBe(false);
    expect(mocks.updateWorkspace).toHaveBeenCalledWith({ webMcpStatus: 'ready' });

    unregister();
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[0]?.reason).toBe('Page unloaded');

    unregister();
    expect(signals[0]?.reason).toBe('Page unloaded');
  });

  it('retries until a late-injected model context becomes available', async () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    const browserDocument: { modelContext?: { registerTool: ReturnType<typeof vi.fn> } } = {};
    vi.stubGlobal('document', browserDocument);
    vi.stubGlobal('window', {
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    });

    const unregister = registerWebMcpTools(tools);
    browserDocument.modelContext = { registerTool };
    await vi.advanceTimersByTimeAsync(250);
    await flushRegistration();

    expect(registerTool).toHaveBeenCalledTimes(2);
    expect(mocks.updateWorkspace).toHaveBeenCalledWith({ webMcpStatus: 'ready' });
    unregister();
  });

  it('reports unsupported after the bounded registration window', async () => {
    installBrowser();

    const unregister = registerWebMcpTools(tools);
    await vi.runAllTimersAsync();

    expect(mocks.updateWorkspace).toHaveBeenCalledTimes(1);
    expect(mocks.updateWorkspace).toHaveBeenCalledWith({ webMcpStatus: 'unsupported' });
    unregister();
  });

  it('aborts partial registration and reports Error failures', async () => {
    const failure = new Error('duplicate tool');
    const registerTool = vi.fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(undefined);
    installBrowser({ registerTool });

    registerWebMcpTools(tools);
    await flushRegistration();

    const signal = registerTool.mock.calls[0]?.[1].signal as AbortSignal;
    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBe(failure);
    expect(mocks.updateWorkspace).toHaveBeenCalledWith({
      webMcpStatus: 'error',
      error: 'duplicate tool',
    });
  });

  it('normalizes non-Error registration failures for the visible status', async () => {
    const registerTool = vi.fn().mockRejectedValue('registration rejected');
    installBrowser({ registerTool });

    registerWebMcpTools(tools);
    await flushRegistration();

    expect(mocks.updateWorkspace).toHaveBeenCalledWith({
      webMcpStatus: 'error',
      error: 'registration rejected',
    });
  });

  it('cancels a pending retry and ignores a failure after page cleanup', async () => {
    let rejectRegistration: ((reason: unknown) => void) | undefined;
    const registerTool = vi.fn().mockImplementation(() => new Promise<void>((_resolve, reject) => {
      rejectRegistration = reject;
    }));
    installBrowser();

    const unregisterRetry = registerWebMcpTools(tools);
    unregisterRetry();
    await vi.runAllTimersAsync();
    expect(mocks.updateWorkspace).not.toHaveBeenCalled();

    installBrowser({ registerTool });
    const unregisterActive = registerWebMcpTools(tools);
    unregisterActive();
    rejectRegistration?.(new Error('late failure'));
    await flushRegistration();
    expect(mocks.updateWorkspace).not.toHaveBeenCalled();
  });

  it('makes a queued retry inert after its registration lifetime is aborted', async () => {
    let queuedRetry: (() => void) | undefined;
    const clearTimeout = vi.fn();
    vi.stubGlobal('document', {});
    vi.stubGlobal('window', {
      setTimeout: vi.fn((callback: () => void) => {
        queuedRetry = callback;
        return 17;
      }),
      clearTimeout,
    });

    const unregister = registerWebMcpTools(tools);
    unregister();
    queuedRetry?.();
    await flushRegistration();

    expect(clearTimeout).toHaveBeenCalledWith(17);
    expect(mocks.updateWorkspace).not.toHaveBeenCalled();
  });
});

describe('registration across back/forward-cache navigation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.updateWorkspace.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function fakePage() {
    const listeners = new Map<string, Set<(event: PageTransitionEvent) => void>>();
    return {
      page: {
        addEventListener: (type: 'pagehide' | 'pageshow', listener: (event: PageTransitionEvent) => void) => {
          if (!listeners.has(type)) listeners.set(type, new Set());
          listeners.get(type)!.add(listener);
        },
        removeEventListener: (type: 'pagehide' | 'pageshow', listener: (event: PageTransitionEvent) => void) => {
          listeners.get(type)?.delete(listener);
        },
      },
      fire: (type: 'pagehide' | 'pageshow', persisted: boolean) => {
        listeners.get(type)?.forEach((listener) => listener({ persisted } as PageTransitionEvent));
      },
      listenerCount: () => (listeners.get('pagehide')?.size ?? 0) + (listeners.get('pageshow')?.size ?? 0),
    };
  }

  it('unregisters when the page is stored and registers again when it is restored', async () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    installBrowser({ registerTool });
    const { page, fire } = fakePage();

    keepWebMcpRegistered(tools, page);
    await flushRegistration();
    const firstSignal = registerTool.mock.calls[0]![1].signal as AbortSignal;
    expect(registerTool).toHaveBeenCalledTimes(2);
    expect(firstSignal.aborted).toBe(false);

    fire('pagehide', true);
    expect(firstSignal.aborted).toBe(true);

    fire('pageshow', true);
    await flushRegistration();
    expect(mocks.updateWorkspace).toHaveBeenCalledWith({ webMcpStatus: 'registering' });
    expect(registerTool).toHaveBeenCalledTimes(4);
    const secondSignal = registerTool.mock.calls[2]![1].signal as AbortSignal;
    expect(secondSignal).not.toBe(firstSignal);
    expect(secondSignal.aborted).toBe(false);
    expect(mocks.updateWorkspace).toHaveBeenLastCalledWith({ webMcpStatus: 'ready' });
  });

  it('leaves the tools alone when a page is discarded or loaded fresh, and never registers twice', async () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    installBrowser({ registerTool });
    const { page, fire } = fakePage();

    keepWebMcpRegistered(tools, page);
    await flushRegistration();
    const signal = registerTool.mock.calls[0]![1].signal as AbortSignal;

    fire('pagehide', false);
    expect(signal.aborted).toBe(false);
    fire('pageshow', false);
    fire('pageshow', true);
    await flushRegistration();
    expect(registerTool).toHaveBeenCalledTimes(2);
  });

  it('stops listening and unregisters on cleanup, also after the page was stored', async () => {
    const registerTool = vi.fn().mockResolvedValue(undefined);
    installBrowser({ registerTool });
    const live = fakePage();
    const stop = keepWebMcpRegistered(tools, live.page);
    await flushRegistration();
    const signal = registerTool.mock.calls[0]![1].signal as AbortSignal;
    expect(live.listenerCount()).toBe(2);
    stop();
    expect(signal.aborted).toBe(true);
    expect(live.listenerCount()).toBe(0);

    const stored = fakePage();
    const stopStored = keepWebMcpRegistered(tools, stored.page);
    stored.fire('pagehide', true);
    stopStored();
    expect(stored.listenerCount()).toBe(0);
  });

  it('treats a model context without registerTool as not yet available', async () => {
    installBrowser({} as { registerTool: ReturnType<typeof vi.fn> });
    const unregister = registerWebMcpTools(tools);
    await vi.runAllTimersAsync();
    expect(mocks.updateWorkspace).toHaveBeenCalledWith({ webMcpStatus: 'unsupported' });
    unregister();
  });
});
