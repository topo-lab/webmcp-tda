import { COMPLEX_KINDS, IMAGE_SAMPLE_IDS, type CubicalRequest, type SimplicialRequest } from './types';

const PRIME_FIELDS = new Set([2, 3, 5, 7, 11, 13, 17, 19]);
export const MAX_COORDINATE_MAGNITUDE = 1_000_000;
export const MAX_LINEAR_SCALE = 4_000_000;
export const MAX_SQUARED_SCALE = 16_000_000_000_000;
export const MAX_POTENTIAL_SIMPLICES = 2_000_000;

export function defaultMaximumSimplexDimension(points: number[][]): 2 | 3 {
  return points[0]?.length === 3 ? 3 : 2;
}

function assertFinite(value: unknown, label: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
}

export function validateSimplicialRequest(input: SimplicialRequest): SimplicialRequest {
  if (!COMPLEX_KINDS.includes(input.complex)) throw new Error('Unsupported simplicial complex.');
  if (!Array.isArray(input.points) || input.points.length < 2 || input.points.length > 256) {
    throw new Error('points must contain between 2 and 256 points.');
  }
  const dimension = input.points[0]?.length;
  if (dimension !== 2 && dimension !== 3) throw new Error('Points must be 2D or 3D.');
  input.points.forEach((point, pointIndex) => {
    if (!Array.isArray(point) || point.length !== dimension) {
      throw new Error(`Point ${pointIndex} does not match dimension ${dimension}.`);
    }
    point.forEach((value, coordinateIndex) => {
      assertFinite(value, `points[${pointIndex}][${coordinateIndex}]`);
      if (Math.abs(value) > MAX_COORDINATE_MAGNITUDE) {
        throw new Error(`points[${pointIndex}][${coordinateIndex}] exceeds the coordinate magnitude limit.`);
      }
    });
  });

  if (input.complex === 'wing' && dimension !== 2) throw new Error('Wing complexes require 2D points.');
  if (input.complex === 'k-fold-cover') {
    if (dimension !== 3) throw new Error('k-fold cover complexes require 3D points.');
    if (input.points.length > 48) throw new Error('k-fold cover input is capped at 48 points for browser safety.');
  }

  const coefficientField = input.coefficientField ?? 2;
  if (!PRIME_FIELDS.has(coefficientField)) {
    throw new Error('coefficientField must be one of 2, 3, 5, 7, 11, 13, 17, or 19.');
  }
  const resultLimit = input.resultLimit ?? 50;
  if (!Number.isInteger(resultLimit) || resultLimit < 1 || resultLimit > 200) {
    throw new Error('resultLimit must be an integer between 1 and 200.');
  }
  const parameters = input.parameters ?? {};
  const maxSimplexDimension = parameters.maxSimplexDimension ?? defaultMaximumSimplexDimension(input.points);
  if (!Number.isInteger(maxSimplexDimension) || maxSimplexDimension < 1 || maxSimplexDimension > 3) {
    throw new Error('maxSimplexDimension must be an integer between 1 and 3.');
  }
  const positiveParameters: Array<[keyof typeof parameters, number | undefined, number]> = [
    ['maxEdgeLength', parameters.maxEdgeLength, MAX_LINEAR_SCALE],
    ['maxRadius', parameters.maxRadius, MAX_LINEAR_SCALE],
    ['maxFiltration', parameters.maxFiltration, MAX_LINEAR_SCALE],
    ['maxEps', parameters.maxEps, MAX_LINEAR_SCALE],
    ['stepSize', parameters.stepSize, MAX_LINEAR_SCALE],
    ['maxSquaredRadius', parameters.maxSquaredRadius, MAX_SQUARED_SCALE],
    ['maxAlphaSquare', parameters.maxAlphaSquare, MAX_SQUARED_SCALE],
  ];
  positiveParameters.forEach(([name, value, maximum]) => {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0 || value > maximum)) {
      throw new Error(`${name} must be positive and at most ${maximum} when provided.`);
    }
  });
  if (parameters.axesMode !== undefined && parameters.axesMode !== 'pca' &&
      (!Number.isFinite(parameters.axesMode) || parameters.axesMode < 1)) {
    throw new Error('axesMode must be "pca" or a number greater than or equal to 1.');
  }
  if (parameters.q !== undefined && (!Number.isFinite(parameters.q) || parameters.q < 0 || parameters.q > 1)) {
    throw new Error('q must be between 0 and 1.');
  }
  if (parameters.theta !== undefined &&
      (!Number.isFinite(parameters.theta) || parameters.theta <= 0 || parameters.theta > Math.PI / 2)) {
    throw new Error('theta must be in (0, π/2].');
  }
  if (parameters.alpha !== undefined &&
      (!Number.isFinite(parameters.alpha) || parameters.alpha < 0 || parameters.alpha > 1)) {
    throw new Error('alpha must be between 0 and 1.');
  }
  const integerParameters: Array<[keyof typeof parameters, number | undefined, number, number]> = [
    ['neighborhoodSize', parameters.neighborhoodSize, 2, Math.min(64, input.points.length)],
    ['maxSteps', parameters.maxSteps, 1, 100],
    ['k', parameters.k, 1, Math.min(4, Math.max(1, input.points.length - 3))],
    ['numLandmarks', parameters.numLandmarks, 2, Math.min(64, input.points.length)],
  ];
  integerParameters.forEach(([name, value, minimum, maximum]) => {
    if (value !== undefined && (!Number.isInteger(value) || value < minimum || value > maximum)) {
      throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
    }
  });
  const complexSize = potentialSimplexCount(input);
  if (complexSize > MAX_POTENTIAL_SIMPLICES) {
    throw new Error(
      `This request can generate up to ${complexSize.toLocaleString()} simplices, above the browser safety budget of ${MAX_POTENTIAL_SIMPLICES.toLocaleString()}. Reduce the point/landmark count or maxSimplexDimension.`,
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
  const cappedKinds = new Set(['rips', 'cech', 'ellipsoid-rips', 'ellipsoid-cech', 'wing', 'box']);
  let vertices: number;
  if (input.complex === 'witness') {
    vertices = input.parameters?.numLandmarks ?? Math.min(16, input.points.length);
  } else if (cappedKinds.has(input.complex)) {
    vertices = input.points.length;
  } else {
    return 0;
  }
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
  if (!['current', 'sample', 'values'].includes(source)) throw new Error('Invalid cubical source.');
  if (source === 'values') {
    if (!Number.isInteger(input.width) || !Number.isInteger(input.height) || !input.width || !input.height) {
      throw new Error('width and height are required positive integers for values input.');
    }
    if (input.width > 256 || input.height > 256) throw new Error('Image dimensions are capped at 256 × 256.');
    const width = input.width;
    const height = input.height;
    if (!Array.isArray(input.values) || input.values.length !== width * height) {
      throw new Error('values must be a row-major array with width × height entries.');
    }
    input.values.forEach((value, index) => assertFinite(value, `values[${index}]`));
  }
  if (source === 'sample' && !IMAGE_SAMPLE_IDS.some((sample) => sample === input.sample)) {
    throw new Error(`sample must be ${IMAGE_SAMPLE_IDS.join(', ')}.`);
  }
  if (input.threshold !== undefined && (!Number.isFinite(input.threshold) || input.threshold < 0 || input.threshold > 255)) {
    throw new Error('threshold must be a finite number between 0 and 255.');
  }
  if (input.foreground !== undefined && input.foreground !== 'dark' && input.foreground !== 'light') {
    throw new Error('foreground must be dark or light.');
  }
  const resultLimit = input.resultLimit ?? 50;
  if (!Number.isInteger(resultLimit) || resultLimit < 1 || resultLimit > 200) {
    throw new Error('resultLimit must be an integer between 1 and 200.');
  }
  return input;
}
