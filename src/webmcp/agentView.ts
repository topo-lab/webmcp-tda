import { COMPLEX_CAPABILITIES } from '../tda/capabilities';
import { isAbortError, ToolInputError, type ToolErrorCode } from '../tda/errors';
import { PLACEHOLDER_IMAGE_NAME } from '../state';
import { IMAGE_SAMPLES } from '../tda/imageSources';
import { formatScale } from '../tda/scale';
import { PERSISTENCE_FRACTION } from '../tda/summary';
import { DEFAULT_RESULT_LIMIT } from '../tda/validation';
import type {
  ComputeRequest,
  ComputeResult,
  CubicalResult,
  SerializablePair,
  SimplicialResult,
} from '../tda/types';

export interface AgentPair {
  dimension: number;
  birth: number;
  death: number | 'infinity';
}

interface AgentResultCommon {
  ok: true;
  /** What birth and death are measured in. */
  units: string;
  /** Connected components left at the end of the filtration (essential H0 classes). */
  components: number;
  /** Long-lived H1 classes, or null when the complex cannot be trusted for H1. */
  loops: number | null;
  /** Long-lived H2 classes of a 3D cloud, or null when they do not apply or cannot be trusted. */
  voids: number | null;
  longLived: string;
  pairsByDimension: Record<number, number>;
  pairsTotal: number;
  pairsReturned: number;
  /** Strongest first. An H0 class that never merges has death "infinity". */
  pairs: AgentPair[];
  warnings: string[];
  /** False when a newer request replaced this one in the visible workbench. */
  shownInWorkspace: boolean;
  elapsedMs: number;
}

export interface SimplicialAgentResult extends AgentResultCommon {
  kind: 'simplicial';
  input: SimplicialResult['input'] & { complex: SimplicialResult['complex'] };
}

export interface CubicalAgentResult extends AgentResultCommon {
  kind: 'cubical';
  input: CubicalResult['input'];
}

export type AgentResult = SimplicialAgentResult | CubicalAgentResult;

export interface AgentError {
  ok: false;
  error: { code: ToolErrorCode; message: string; field?: string; hint?: string };
}

const KNOWN_IMAGE_NAMES: ReadonlySet<string> = new Set([
  ...Object.values(IMAGE_SAMPLES).map((sample) => sample.name),
  'agent-values',
  PLACEHOLDER_IMAGE_NAME,
]);

/** Names the page generated are safe to show an agent; an uploaded file name is the person's text, not ours. */
export function describeImageName(name: string): string {
  return KNOWN_IMAGE_NAMES.has(name) ? name : 'uploaded image';
}

/** Text the page wrote may quote an uploaded file name; the agent sees the generic label instead. */
export function redactImageName(text: string, imageName: string): string {
  return KNOWN_IMAGE_NAMES.has(imageName) || imageName.length === 0 ? text : text.split(imageName).join('uploaded image');
}

function toAgentPair(pair: SerializablePair): AgentPair {
  return { dimension: pair.dimension, birth: pair.birth, death: pair.death };
}

function unitsFor(result: ComputeResult): string {
  if (result.kind === 'simplicial') {
    return COMPLEX_CAPABILITIES.find((entry) => entry.id === result.complex)!.filtrationUnits;
  }
  return 'image value (gray level; a binary mask uses 0 and 255)';
}

export function toAgentResult(
  result: ComputeResult,
  options: { limit?: number; shownInWorkspace: boolean },
): AgentResult {
  const { persistence } = result;
  const limit = options.limit ?? DEFAULT_RESULT_LIMIT;
  const reliable = result.kind === 'simplicial' ? result.interpretation.reliableThroughDimension : Number.POSITIVE_INFINITY;
  const threeDimensional = result.kind === 'simplicial' && result.input.dimension === 3;
  const common: AgentResultCommon = {
    ok: true,
    units: unitsFor(result),
    components: persistence.essentialByDimension[0] ?? 0,
    loops: reliable >= 1 ? persistence.persistentByDimension[1] ?? 0 : null,
    voids: threeDimensional && reliable >= 2 ? persistence.persistentByDimension[2] ?? 0 : null,
    longLived: `essential, or lifetime >= ${formatScale(persistence.persistenceThreshold)} (${PERSISTENCE_FRACTION * 100}% of the filtration range)`,
    pairsByDimension: persistence.pairsByDimension,
    pairsTotal: persistence.pairCount,
    pairsReturned: Math.min(limit, persistence.strongestPairs.length),
    pairs: persistence.strongestPairs.slice(0, limit).map(toAgentPair),
    warnings: result.kind === 'simplicial' ? result.interpretation.warnings : [],
    shownInWorkspace: options.shownInWorkspace,
    elapsedMs: Math.round(result.elapsedMs * 10) / 10,
  };
  if (result.kind === 'simplicial') {
    const { defaulted, ...input } = result.input;
    return {
      ...common,
      kind: 'simplicial',
      input: { complex: result.complex, ...input, ...(defaulted.length > 0 ? { defaulted } : {}) } as SimplicialAgentResult['input'],
    };
  }
  return { ...common, kind: 'cubical', input: { ...result.input, name: describeImageName(result.input.name) } };
}

/** A request without its bulk data: point coordinates and image values are the caller's own input. */
export function summarizeRequest(request: ComputeRequest | null): Record<string, unknown> | null {
  if (request === null) return null;
  if (request.kind === 'simplicial') {
    return {
      kind: request.kind,
      complex: request.complex,
      pointCount: request.points.length,
      coefficientField: request.coefficientField ?? 2,
      parameters: request.parameters ?? {},
    };
  }
  const { values, ...rest } = request;
  return { ...rest, ...(values === undefined ? {} : { valueCount: values.length }) };
}

export function toAgentError(error: unknown): AgentError {
  if (error instanceof ToolInputError) {
    return {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.field === undefined ? {} : { field: error.field }),
        ...(error.hint === undefined ? {} : { hint: error.hint }),
      },
    };
  }
  if (isAbortError(error)) {
    return { ok: false, error: { code: 'cancelled', message: 'The computation was cancelled before it finished.' } };
  }
  return {
    ok: false,
    error: { code: 'compute_failed', message: error instanceof Error ? error.message : String(error) },
  };
}
