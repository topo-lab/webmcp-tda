import { ToolInputError } from './errors';
import { COMPLEX_KINDS, IMAGE_SAMPLE_IDS, type CubicalRequest, type SimplicialRequest } from './types';

export const PRIME_FIELDS = [2, 3, 5, 7, 11, 13, 17, 19] as const;
export const MAX_POINTS = 256;
export const MAX_RESULT_LIMIT = 200;
export const DEFAULT_RESULT_LIMIT = 10;
export const MAX_IMAGE_SIDE = 256;
export const MAX_IMAGE_VALUES = MAX_IMAGE_SIDE * MAX_IMAGE_SIDE;
export const DOWNSAMPLE_FACTORS = [1, 2, 4] as const;
export const FILTRATION_DIRECTIONS = ['sublevel', 'superlevel'] as const;
export const FOREGROUND_SIDES = ['dark', 'light'] as const;
export const IMAGE_SOURCES = ['current', 'sample', 'values'] as const;
export const MAX_COORDINATE_MAGNITUDE = 1_000_000;
export const MAX_LINEAR_SCALE = 4_000_000;
export const MAX_POTENTIAL_SIMPLICES = 2_000_000;

const PRIME_FIELD_SET: ReadonlySet<number> = new Set(PRIME_FIELDS);

export function defaultMaximumSimplexDimension(points: number[][]): 2 | 3 {
  return points[0]?.length === 3 ? 3 : 2;
}

function invalid(message: string, field?: string, hint?: string): never {
  throw new ToolInputError('invalid_input', message, { field, hint });
}

function assertFinite(value: unknown, label: string, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) invalid(`${label} must be a finite number.`, field);
}

function assertChoice<T extends string | number>(
  value: unknown,
  choices: readonly T[],
  field: string,
  message: string,
): asserts value is T {
  if (!choices.some((choice) => choice === value)) invalid(message, field, `Allowed values: ${choices.join(', ')}.`);
}

function assertResultLimit(value: unknown): void {
  if (value !== undefined && (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > MAX_RESULT_LIMIT)) {
    invalid(`resultLimit must be an integer between 1 and ${MAX_RESULT_LIMIT}.`, 'resultLimit');
  }
}

export function validateSimplicialRequest(input: SimplicialRequest): SimplicialRequest {
  if (!COMPLEX_KINDS.includes(input.complex)) {
    invalid('Unsupported simplicial complex.', 'complex', `Allowed values: ${COMPLEX_KINDS.join(', ')}.`);
  }
  if (!Array.isArray(input.points) || input.points.length < 2 || input.points.length > MAX_POINTS) {
    invalid(`points must contain between 2 and ${MAX_POINTS} points.`, 'points');
  }
  const dimension = input.points[0]?.length;
  if (dimension !== 2 && dimension !== 3) invalid('Points must be 2D or 3D.', 'points');
  input.points.forEach((point, pointIndex) => {
    if (!Array.isArray(point) || point.length !== dimension) {
      invalid(`Point ${pointIndex} does not match dimension ${dimension}.`, `points[${pointIndex}]`);
    }
    point.forEach((value, coordinateIndex) => {
      const field = `points[${pointIndex}][${coordinateIndex}]`;
      assertFinite(value, field, field);
      if (Math.abs(value) > MAX_COORDINATE_MAGNITUDE) invalid(`${field} exceeds the coordinate magnitude limit.`, field);
    });
  });

  const coefficientField = input.coefficientField === undefined ? 2 : input.coefficientField;
  if (!PRIME_FIELD_SET.has(coefficientField)) {
    invalid(
      `coefficientField must be one of ${PRIME_FIELDS.slice(0, -1).join(', ')}, or ${PRIME_FIELDS.at(-1)}.`,
      'coefficientField',
      'Omit the field to use 2.',
    );
  }
  assertResultLimit(input.resultLimit);
  const parameters = input.parameters ?? {};
  if (typeof parameters !== 'object' || parameters === null || Array.isArray(parameters)) {
    invalid('parameters must be an object.', 'parameters');
  }
  const maxSimplexDimension = parameters.maxSimplexDimension === undefined
    ? defaultMaximumSimplexDimension(input.points)
    : parameters.maxSimplexDimension;
  if (!Number.isInteger(maxSimplexDimension) || maxSimplexDimension < 1 || maxSimplexDimension > 3) {
    invalid('maxSimplexDimension must be an integer between 1 and 3.', 'parameters.maxSimplexDimension', 'Omit the field to use the default for the input dimension.');
  }
  const positiveParameters: Array<['maxEdgeLength' | 'maxRadius', number | undefined]> = [
    ['maxEdgeLength', parameters.maxEdgeLength],
    ['maxRadius', parameters.maxRadius],
  ];
  positiveParameters.forEach(([name, value]) => {
    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > MAX_LINEAR_SCALE)) {
      invalid(`${name} must be positive and at most ${MAX_LINEAR_SCALE} when provided.`, `parameters.${name}`);
    }
  });
  const complexSize = potentialSimplexCount(input);
  if (complexSize > MAX_POTENTIAL_SIMPLICES) {
    throw new ToolInputError(
      'budget_exceeded',
      `This request can generate up to ${complexSize.toLocaleString()} simplices, above the browser safety budget of ${MAX_POTENTIAL_SIMPLICES.toLocaleString()}. Use fewer points or a smaller maximum simplex dimension.`,
      { field: 'points', hint: 'Fewer points or parameters.maxSimplexDimension = 1 or 2 reduce the size.' },
    );
  }
  return input;
}

function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  const size = Math.min(k, n - k);
  let value = 1;
  for (let index = 1; index <= size; index += 1) {
    value = (value * (n - size + index)) / index;
    if (value > MAX_POTENTIAL_SIMPLICES) return Math.ceil(value);
  }
  return Math.round(value);
}

export function potentialSimplexCount(input: SimplicialRequest): number {
  if (input.complex === 'alpha') return 0;
  const vertices = input.points.length;
  const maximumDimension = input.parameters?.maxSimplexDimension ?? defaultMaximumSimplexDimension(input.points);
  let total = 0;
  for (let simplexSize = 1; simplexSize <= maximumDimension + 1; simplexSize += 1) {
    total += binomial(vertices, simplexSize);
    if (total > MAX_POTENTIAL_SIMPLICES) return Math.ceil(total);
  }
  return total;
}

export function validateCubicalRequest(input: CubicalRequest): CubicalRequest {
  const source = input.source ?? 'current';
  assertChoice(source, IMAGE_SOURCES, 'source', 'Invalid cubical source.');

  if (source === 'values') {
    const { width, height } = input;
    const validSide = (side: unknown): side is number =>
      typeof side === 'number' && Number.isInteger(side) && side >= 2 && side <= MAX_IMAGE_SIDE;
    if (!validSide(width) || !validSide(height)) {
      invalid(
        `width and height must be integers between 2 and ${MAX_IMAGE_SIDE} for values input.`,
        'width',
        'Provide width, height and values together.',
      );
    }
    if (!Array.isArray(input.values) || input.values.length !== width * height) {
      invalid('values must be a row-major array with width × height entries.', 'values');
    }
    input.values.forEach((value, index) => assertFinite(value, `values[${index}]`, 'values'));
  } else if (input.values !== undefined || input.width !== undefined || input.height !== undefined) {
    invalid(
      `values, width and height are only used when source is "values", but source is "${source}".`,
      'source',
      'Set source to "values" to analyze a supplied grid.',
    );
  }

  if (source === 'sample') {
    if (!IMAGE_SAMPLE_IDS.some((sample) => sample === input.sample)) {
      invalid(`sample must be ${IMAGE_SAMPLE_IDS.join(', ')}.`, 'sample');
    }
  } else if (input.sample !== undefined) {
    invalid(`sample is only used when source is "sample", but source is "${source}".`, 'source', 'Set source to "sample".');
  }

  if (input.binarize !== undefined && typeof input.binarize !== 'boolean') {
    invalid('binarize must be true or false.', 'binarize', 'Use a JSON boolean, not a string.');
  }
  if (input.threshold !== undefined && (typeof input.threshold !== 'number' || !Number.isFinite(input.threshold) || input.threshold < 0 || input.threshold > 255)) {
    invalid('threshold must be a finite number between 0 and 255.', 'threshold');
  }
  if (input.foreground !== undefined) assertChoice(input.foreground, FOREGROUND_SIDES, 'foreground', 'foreground must be dark or light.');
  if (input.filtration !== undefined) assertChoice(input.filtration, FILTRATION_DIRECTIONS, 'filtration', 'filtration must be sublevel or superlevel.');
  if (input.downsample !== undefined) assertChoice(input.downsample, DOWNSAMPLE_FACTORS, 'downsample', 'downsample must be 1, 2, or 4.');
  assertResultLimit(input.resultLimit);
  return input;
}
