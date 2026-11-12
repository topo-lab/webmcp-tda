const POLICY_NAME = 'webmcp-worker';

function sameOriginScriptUrl(value: string): string {
  const base = globalThis.location?.href ?? 'http://localhost/';
  const url = new URL(value, base);
  const sameOrigin = globalThis.location !== undefined && url.origin === globalThis.location.origin;
  if (!sameOrigin && url.protocol !== 'blob:') {
    throw new TypeError('Refusing a worker URL from another origin.');
  }
  return url.href;
}

let installed = false;

interface TrustedTypePolicy {
  createScriptURL: (value: string) => unknown;
  createHTML: (value: string) => unknown;
}

interface TrustedTypesWindow {
  trustedTypes?: {
    createPolicy: (name: string, rules: Record<string, (value: string) => string>) => TrustedTypePolicy;
  };
}

const HTML_POLICY_NAME = 'webmcp-html';
let htmlPolicy: TrustedTypePolicy | null = null;

/**
 * The workbench shell is one static document fragment. The policy refuses markup that
 * can run script, so the string is not copied through unchecked.
 */
export function trustedHtml(html: string): string {
  const trustedTypes = (globalThis as typeof globalThis & TrustedTypesWindow).trustedTypes;
  if (!trustedTypes) return html;
  htmlPolicy ??= trustedTypes.createPolicy(HTML_POLICY_NAME, {
    createHTML(input: string) {
      if (/<script\b|<\/script|javascript:|\bon[a-z]+\s*=/i.test(input)) {
        throw new TypeError('Refusing markup that can run script.');
      }
      return input;
    },
  });
  return htmlPolicy.createHTML(html) as unknown as string;
}

/**
 * `new Worker(url)` is a TrustedScriptURL sink. Vite only bundles the worker when the
 * call site stays `new Worker(new URL(..., import.meta.url))`, so the named policy is
 * applied by wrapping the constructor instead of rewriting that call.
 */
export function installTrustedWorkerPolicy(): void {
  const trustedTypes = (globalThis as typeof globalThis & TrustedTypesWindow).trustedTypes;
  if (installed || !trustedTypes || !globalThis.Worker) return;
  installed = true;
  const policy = trustedTypes.createPolicy(POLICY_NAME, {
    createScriptURL: sameOriginScriptUrl,
  });
  const NativeWorker = globalThis.Worker;
  function TrustedWorker(this: Worker, scriptURL: string | URL, options?: WorkerOptions) {
    const href = scriptURL instanceof URL ? scriptURL.href : String(scriptURL);
    return new NativeWorker(policy.createScriptURL(href) as unknown as string | URL, options);
  }
  TrustedWorker.prototype = NativeWorker.prototype;
  Object.setPrototypeOf(TrustedWorker, NativeWorker);
  globalThis.Worker = TrustedWorker as unknown as typeof Worker;
}
