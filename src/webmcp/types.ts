export interface ToolExecuteOptions {
  signal: AbortSignal;
}

export interface WebMcpTool {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
    consequentialHint?: boolean;
  };
  /** Hosts differ: some pass no options and a null input, so both are optional here. */
  execute: (input?: unknown, options?: ToolExecuteOptions) => Promise<unknown>;
}

export interface ModelContextApi {
  registerTool(tool: WebMcpTool, options?: { signal?: AbortSignal; exposedTo?: string[] }): Promise<void>;
}

declare global {
  interface Document {
    readonly modelContext?: ModelContextApi;
  }
}
