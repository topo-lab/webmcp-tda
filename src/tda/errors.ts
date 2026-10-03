export type ToolErrorCode =
  | 'invalid_input'
  | 'unsupported_field'
  | 'budget_exceeded'
  | 'cancelled'
  | 'compute_failed';

export interface ToolErrorDetails {
  field?: string;
  hint?: string;
}

/**
 * An expected failure of a tool call. The WebMCP draft reports a rejected `execute` to the
 * caller as a generic `UnknownError`, so the tool layer turns these into returned results
 * that carry the code, the field and a hint; the human workbench still shows `message`.
 */
export class ToolInputError extends Error {
  readonly code: ToolErrorCode;
  readonly field: string | undefined;
  readonly hint: string | undefined;

  constructor(code: ToolErrorCode, message: string, details: ToolErrorDetails = {}) {
    super(message);
    this.name = 'ToolInputError';
    this.code = code;
    this.field = details.field;
    this.hint = details.hint;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
