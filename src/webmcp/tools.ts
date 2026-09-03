import { CAPABILITIES } from '../tda/capabilities';
import { tdaRuntime, type TdaRuntime } from '../tda/runtime';
import type { CubicalRequest, SimplicialRequest } from '../tda/types';
import type { WebMcpTool } from './types';
import { MAX_COORDINATE_MAGNITUDE, MAX_LINEAR_SCALE, MAX_SQUARED_SCALE } from '../tda/validation';

const objectSchema = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});

const parametersSchema = objectSchema({
  maxEdgeLength: { type: 'number', exclusiveMinimum: 0, maximum: MAX_LINEAR_SCALE, description: 'Rips maximum edge length.' },
  maxRadius: { type: 'number', exclusiveMinimum: 0, maximum: MAX_LINEAR_SCALE, description: 'Čech maximum ball radius.' },
  maxSimplexDimension: {
    type: 'integer',
    minimum: 1,
    maximum: 3,
    description: 'Optional override. Defaults to 2 for 2D input and 3 for 3D input.',
  },
  neighborhoodSize: { type: 'integer', minimum: 2, description: 'Local neighborhood for ellipsoid or Wing fitting.' },
  axesMode: {
    description: 'Ellipsoid tangent-to-normal ratio >= 1, or "pca" for data-derived semi-axes.',
    oneOf: [{ type: 'number', minimum: 1 }, { type: 'string', const: 'pca' }],
  },
  maxFiltration: { type: 'number', exclusiveMinimum: 0, maximum: MAX_LINEAR_SCALE, description: 'Ellipsoid filtration cutoff.' },
  q: { type: 'number', minimum: 0, maximum: 1, description: 'Wing spine-to-wing ratio.' },
  theta: { type: 'number', exclusiveMinimum: 0, maximum: Math.PI / 2, description: 'Wing angle in radians.' },
  maxEps: { type: 'number', exclusiveMinimum: 0, maximum: MAX_LINEAR_SCALE, description: 'Wing epsilon cutoff.' },
  stepSize: { type: 'number', exclusiveMinimum: 0, maximum: MAX_LINEAR_SCALE, description: 'Box filtration grid resolution.' },
  alpha: { type: 'number', minimum: 0, maximum: 1, description: 'Box growth aggressiveness.' },
  maxSteps: { type: 'integer', minimum: 1, maximum: 100 },
  k: { type: 'integer', minimum: 1, maximum: 4, description: 'k-fold cover multiplicity.' },
  maxSquaredRadius: { type: 'number', exclusiveMinimum: 0, maximum: MAX_SQUARED_SCALE, description: 'k-fold cover squared-radius cutoff.' },
  numLandmarks: { type: 'integer', minimum: 2, description: 'Weak witness landmark count.' },
  maxAlphaSquare: { type: 'number', exclusiveMinimum: 0, maximum: MAX_SQUARED_SCALE, description: 'Weak witness squared relaxation cutoff.' },
});

const emptySchema = objectSchema({});

export function createWebMcpTools(runtime: TdaRuntime = tdaRuntime): WebMcpTool[] {
  return [
    {
      name: 'tda_get_capabilities',
      title: 'Inspect TDA capabilities',
      description: 'List the supported simplicial complexes, required parameter names, input limits, filtration units, and cubical-image modes before selecting a computation.',
      inputSchema: emptySchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async () => CAPABILITIES,
    },
    {
      name: 'tda_compute_simplicial_persistence',
      title: 'Compute simplicial persistence',
      description: 'Compute one-parameter persistent homology for a supplied 2D or 3D point cloud. Use tda_get_capabilities first when choosing among Rips, Alpha, Čech, ellipsoid Rips, ellipsoid Čech, Wing, Box, exact k-fold cover, and Euclidean weak witness complexes. Runs locally in a Web Worker and updates the visible shared result.',
      inputSchema: objectSchema({
        complex: {
          type: 'string',
          enum: ['rips', 'alpha', 'cech', 'ellipsoid-rips', 'ellipsoid-cech', 'wing', 'box', 'k-fold-cover', 'witness'],
          description: 'Complex family. Wing requires 2D points. k-fold-cover requires 3D points and is capped at 48 points.',
        },
        points: {
          type: 'array',
          minItems: 2,
          maxItems: 256,
          items: {
            type: 'array',
            minItems: 2,
            maxItems: 3,
            items: { type: 'number', minimum: -MAX_COORDINATE_MAGNITUDE, maximum: MAX_COORDINATE_MAGNITUDE },
          },
          description: 'Point coordinates. Every point must have the same length, either 2 or 3. General limit: 256 points; k-fold-cover limit: 48.',
        },
        coefficientField: { type: 'integer', enum: [2, 3, 5, 7, 11, 13, 17, 19], default: 2 },
        resultLimit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
        parameters: parametersSchema,
      }, ['complex', 'points']),
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input, options) => runtime.computeSimplicial({
        kind: 'simplicial',
        ...input,
      } as SimplicialRequest, options.signal),
    },
    {
      name: 'tda_compute_cubical_persistence',
      title: 'Compute image cubical persistence',
      description: 'Denoise an image, convert it to a binary foreground mask, close small mask holes, then compute 2D vertex lower-star cubical persistence over F2. Accepts the current uploaded image, a built-in sample, or supplied row-major scalar values. Omit threshold to use Otsu auto-thresholding. Runs locally in a Web Worker and updates the visible shared result.',
      inputSchema: objectSchema({
        source: { type: 'string', enum: ['current', 'sample', 'values'], default: 'current' },
        sample: { type: 'string', enum: ['ring', 'two-rings', 'two-blobs'] },
        width: { type: 'integer', minimum: 2, maximum: 256 },
        height: { type: 'integer', minimum: 2, maximum: 256 },
        values: {
          type: 'array',
          maxItems: 65_536,
          items: { type: 'number' },
          description: 'Row-major scalar values; required when source is values and must contain width × height entries.',
        },
        binarize: { type: 'boolean', default: true, description: 'Binarize before persistence. Set false to preserve a grayscale filtration.' },
        threshold: { type: 'number', minimum: 0, maximum: 255, description: 'Manual grayscale threshold. Omit for Otsu automatic thresholding.' },
        foreground: { type: 'string', enum: ['dark', 'light'], default: 'dark', description: 'Pixels on this side of the threshold become foreground value 0.' },
        filtration: { type: 'string', enum: ['sublevel', 'superlevel'], default: 'sublevel' },
        downsample: { type: 'integer', enum: [1, 2, 4], default: 1 },
        resultLimit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
      }),
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input, options) => runtime.computeCubical({
        kind: 'cubical',
        ...input,
      } as CubicalRequest, options.signal),
    },
    {
      name: 'tda_get_latest_result',
      title: 'Read latest TDA result',
      description: 'Read the latest persistence result and current image metadata from the workspace shared by the human and agent.',
      inputSchema: emptySchema,
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async () => runtime.getLatestResult(),
    },
  ];
}
