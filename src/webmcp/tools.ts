import { CAPABILITIES } from '../tda/capabilities';
import { ToolInputError } from '../tda/errors';
import { tdaRuntime, type TdaRuntime } from '../tda/runtime';
import { IMAGE_SAMPLE_IDS, type ComputeRequest, type CubicalRequest, type SimplicialRequest } from '../tda/types';
import {
  DEFAULT_RESULT_LIMIT,
  DOWNSAMPLE_FACTORS,
  FILTRATION_DIRECTIONS,
  FOREGROUND_SIDES,
  IMAGE_SOURCES,
  MAX_COORDINATE_MAGNITUDE,
  MAX_IMAGE_SIDE,
  MAX_IMAGE_VALUES,
  MAX_LINEAR_SCALE,
  MAX_POINTS,
  MAX_RESULT_LIMIT,
  PRIME_FIELDS,
} from '../tda/validation';
import {
  describeImageName,
  redactImageName,
  summarizeRequest,
  toAgentError,
  toAgentResult,
  type AgentError,
} from './agentView';
import type { WebMcpTool } from './types';

const objectSchema = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});

const resultLimitSchema = {
  type: 'integer',
  minimum: 1,
  maximum: MAX_RESULT_LIMIT,
  default: DEFAULT_RESULT_LIMIT,
  description: `Strongest persistence pairs to return, 1 to ${MAX_RESULT_LIMIT}.`,
};

const parametersSchema = objectSchema({
  maxEdgeLength: {
    type: 'number',
    exclusiveMinimum: 0,
    maximum: MAX_LINEAR_SCALE,
    description: 'Rips limit in distance units. Default: the diameter of the cloud.',
  },
  maxRadius: {
    type: 'number',
    exclusiveMinimum: 0,
    maximum: MAX_LINEAR_SCALE,
    description: 'Čech limit as a ball radius. Default: the diameter of the cloud.',
  },
  maxSimplexDimension: {
    type: 'integer',
    minimum: 1,
    maximum: 3,
    description: 'Highest simplex dimension built. Default 2 for 2D input, 3 for 3D input.',
  },
});

const emptySchema = objectSchema({});

const EMPTY_KEYS = new Set<string>();
const SIMPLICIAL_KEYS = new Set(['complex', 'points', 'coefficientField', 'resultLimit', 'parameters']);
const SIMPLICIAL_PARAMETER_KEYS = new Set(['maxEdgeLength', 'maxRadius', 'maxSimplexDimension']);
const CUBICAL_KEYS = new Set([
  'source',
  'sample',
  'width',
  'height',
  'values',
  'binarize',
  'threshold',
  'foreground',
  'filtration',
  'downsample',
  'resultLimit',
]);

function assertOnlyKnownKeys(input: unknown, allowed: ReadonlySet<string>, label: string): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ToolInputError('invalid_input', `${label} must be an object.`, { field: label });
  }
  const unexpected = Object.keys(input).find((key) => !allowed.has(key));
  if (unexpected) {
    throw new ToolInputError('unsupported_field', `${label} contains unsupported field "${unexpected}".`, {
      field: unexpected,
      hint: `Allowed fields: ${[...allowed].join(', ') || 'none'}.`,
    });
  }
}

/** Some hosts call a tool with no input at all. */
function normalizeInput(input: unknown): unknown {
  return input === undefined || input === null ? {} : input;
}

/**
 * The WebMCP draft reports a rejected `execute` to the caller as a generic `UnknownError`, so expected
 * failures are returned. Only a cancellation by the host is rethrown: nobody is waiting for a result.
 */
async function respond<T>(signal: AbortSignal | undefined, work: () => Promise<T>): Promise<T | AgentError> {
  try {
    return await work();
  } catch (error) {
    if (signal?.aborted) throw error;
    return toAgentError(error);
  }
}

function limitOf(input: Record<string, unknown>): number {
  return typeof input.resultLimit === 'number' ? input.resultLimit : DEFAULT_RESULT_LIMIT;
}

export function createWebMcpTools(runtime: TdaRuntime = tdaRuntime): WebMcpTool[] {
  return [
    {
      name: 'tda_get_capabilities',
      title: 'Inspect TDA capabilities',
      description: 'List the supported complexes, parameters, limits, filtration units, defaults and result conventions before choosing a computation.',
      inputSchema: emptySchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false, consequentialHint: false },
      execute: (input, options) => respond(options?.signal, async () => {
        assertOnlyKnownKeys(normalizeInput(input), EMPTY_KEYS, 'input');
        return CAPABILITIES;
      }),
    },
    {
      name: 'tda_compute_simplicial_persistence',
      title: 'Compute simplicial persistence',
      description: 'Compute persistent homology of a 2D or 3D point cloud with a Vietoris–Rips, Alpha or Čech complex in a local Web Worker. The cloud and result also appear in the visible workbench. Birth and death are in distance (Rips), squared radius (Alpha) or radius (Čech). Omitted Rips and Čech limits default to the cloud diameter. Returns counts, long-lived features and the strongest pairs.',
      inputSchema: objectSchema({
        complex: {
          type: 'string',
          enum: ['rips', 'alpha', 'cech'],
          description: 'Complex family: Vietoris–Rips, Alpha, or Čech.',
        },
        points: {
          type: 'array',
          minItems: 2,
          maxItems: MAX_POINTS,
          items: {
            type: 'array',
            minItems: 2,
            maxItems: 3,
            items: { type: 'number', minimum: -MAX_COORDINATE_MAGNITUDE, maximum: MAX_COORDINATE_MAGNITUDE },
          },
          description: `Coordinates, all 2D or all 3D. At most ${MAX_POINTS} points.`,
        },
        coefficientField: { type: 'integer', enum: [...PRIME_FIELDS], default: 2, description: 'Prime coefficient field for homology.' },
        resultLimit: resultLimitSchema,
        parameters: parametersSchema,
      }, ['complex', 'points']),
      annotations: { readOnlyHint: false, untrustedContentHint: false, consequentialHint: false },
      execute: (input, options) => respond(options?.signal, async () => {
        const args = normalizeInput(input);
        assertOnlyKnownKeys(args, SIMPLICIAL_KEYS, 'input');
        if (args.parameters !== undefined) assertOnlyKnownKeys(args.parameters, SIMPLICIAL_PARAMETER_KEYS, 'parameters');
        const { result, shownInWorkspace } = await runtime.computeSimplicial(
          { kind: 'simplicial', ...args } as SimplicialRequest,
          { origin: 'agent', signal: options?.signal },
        );
        return toAgentResult(result, { limit: limitOf(args), shownInWorkspace });
      }),
    },
    {
      name: 'tda_compute_cubical_persistence',
      title: 'Compute image cubical persistence',
      description: 'Compute 2D cubical persistence of an image: denoise, threshold to a binary mask, close small holes, then a vertex lower-star filtration over F2. The source is the current uploaded image, a built-in sample or row-major values. Omit threshold for Otsu. Runs locally; the input and result appear in the visible workbench. Returns counts, long-lived features and the strongest pairs.',
      inputSchema: objectSchema({
        source: { type: 'string', enum: [...IMAGE_SOURCES], default: 'current', description: 'Image source. "current" is the image shown in the workbench.' },
        sample: { type: 'string', enum: [...IMAGE_SAMPLE_IDS], description: 'A bundled real photograph. Use with source "sample".' },
        width: { type: 'integer', minimum: 2, maximum: MAX_IMAGE_SIDE, description: 'Image width in pixels. Use with source "values".' },
        height: { type: 'integer', minimum: 2, maximum: MAX_IMAGE_SIDE, description: 'Image height in pixels. Use with source "values".' },
        values: {
          type: 'array',
          maxItems: MAX_IMAGE_VALUES,
          items: { type: 'number' },
          description: 'Row-major scalar values, width × height entries. Use with source "values".',
        },
        binarize: { type: 'boolean', default: true, description: 'Binarize before persistence. False keeps a grayscale filtration.' },
        threshold: { type: 'number', minimum: 0, maximum: 255, description: 'Manual gray threshold 0 to 255. Omit for Otsu automatic thresholding.' },
        foreground: { type: 'string', enum: [...FOREGROUND_SIDES], default: 'dark', description: 'Pixels on this side of the threshold become foreground.' },
        filtration: { type: 'string', enum: [...FILTRATION_DIRECTIONS], default: 'sublevel' },
        downsample: { type: 'integer', enum: [...DOWNSAMPLE_FACTORS], default: 1, description: 'Keep every n-th pixel in each direction.' },
        resultLimit: resultLimitSchema,
      }),
      annotations: { readOnlyHint: false, untrustedContentHint: false, consequentialHint: false },
      execute: (input, options) => respond(options?.signal, async () => {
        const args = normalizeInput(input);
        assertOnlyKnownKeys(args, CUBICAL_KEYS, 'input');
        const { result, shownInWorkspace } = await runtime.computeCubical(
          { kind: 'cubical', ...args } as CubicalRequest,
          { origin: 'agent', signal: options?.signal },
        );
        return toAgentResult(result, { limit: limitOf(args), shownInWorkspace });
      }),
    },
    {
      name: 'tda_get_latest_result',
      title: 'Read latest TDA result',
      description: 'Read what the visible workbench shows now: its status, a summary of the request behind it, and the compact result. The result is null after the person changes an input.',
      inputSchema: emptySchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false, consequentialHint: false },
      execute: (input, options) => respond(options?.signal, async () => {
        assertOnlyKnownKeys(normalizeInput(input), EMPTY_KEYS, 'input');
        const latest = runtime.getLatestResult();
        const request = latest.latestRequest as ComputeRequest | null;
        const imageName = latest.currentImage.name;
        return {
          ok: true as const,
          status: latest.status,
          activity: redactImageName(latest.activity, imageName),
          error: latest.error === null ? null : redactImageName(latest.error, imageName),
          request: summarizeRequest(request),
          result: latest.latestResult === null
            ? null
            : toAgentResult(latest.latestResult, { limit: request?.resultLimit ?? DEFAULT_RESULT_LIMIT, shownInWorkspace: true }),
          currentImage: {
            name: describeImageName(imageName),
            width: latest.currentImage.width,
            height: latest.currentImage.height,
          },
        };
      }),
    },
  ];
}
