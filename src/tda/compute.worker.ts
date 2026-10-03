/// <reference lib="webworker" />

import { GudhiPersistentCohomology, type AlphaComplexResult } from 'tda-wasm';
import { binarizeImage, closeBinaryImage, gaussianBlurImage } from './imageProcessing';
import { interpretationWarnings, reliableThroughDimension, type ResolvedParameters } from './interpretation';
import { pointCloudScale, type PointCloudScale } from './scale';
import { summarizeComplex, summarizePersistence } from './summary';
import type {
  ComplexKind,
  ComplexParameters,
  ComputeRequest,
  CubicalRequest,
  ScalarImage,
  SimplicialRequest,
  SimplicialResult,
  WorkerRequestMessage,
  WorkerResponseMessage,
} from './types';
import {
  defaultMaximumSimplexDimension,
  MAX_RESULT_LIMIT,
  validateCubicalRequest,
  validateSimplicialRequest,
} from './validation';

const workerScope = self as DedicatedWorkerGlobalScope;
const MAX_VISUALIZATION_SIMPLICES = 20_000;
let enginePromise: Promise<GudhiPersistentCohomology> | null = null;

function getEngine(): Promise<GudhiPersistentCohomology> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const engine = new GudhiPersistentCohomology();
      await engine.initialize();
      return engine;
    })().catch((error: unknown) => {
      enginePromise = null;
      throw error;
    });
  }
  return enginePromise;
}

function flat(points: number[][]): number[] {
  return points.flatMap((point) => point);
}

/** Limits the caller leaves out default to the diameter of the cloud, so no scale cuts the filtration off. */
function resolveParameters(request: SimplicialRequest, scale: PointCloudScale): ResolvedParameters {
  const given = request.parameters ?? {};
  const fallback = scale.diameter > 0 ? scale.diameter : 1;
  const defaulted: ResolvedParameters['defaulted'] = [];
  if (request.complex === 'rips' && given.maxEdgeLength === undefined) defaulted.push('maxEdgeLength');
  if (request.complex === 'cech' && given.maxRadius === undefined) defaulted.push('maxRadius');
  return {
    maxSimplexDimension: given.maxSimplexDimension ?? defaultMaximumSimplexDimension(request.points),
    maxEdgeLength: given.maxEdgeLength ?? fallback,
    maxRadius: given.maxRadius ?? fallback,
    defaulted,
  };
}

function reportedParameters(kind: ComplexKind, parameters: ResolvedParameters): ComplexParameters {
  const { maxSimplexDimension } = parameters;
  switch (kind) {
    case 'rips': return { maxEdgeLength: parameters.maxEdgeLength, maxSimplexDimension };
    case 'alpha': return { maxSimplexDimension };
    case 'cech': return { maxRadius: parameters.maxRadius, maxSimplexDimension };
  }
}

function capAlphaSimplices(complex: AlphaComplexResult, maximumDimension: number): AlphaComplexResult {
  const simplices = complex.simplices.filter((simplex) => simplex.vertices.length - 1 <= maximumDimension);
  const dimensionCounts: Record<number, number> = {};
  simplices.forEach((simplex) => {
    const dimension = simplex.vertices.length - 1;
    dimensionCounts[dimension] = (dimensionCounts[dimension] ?? 0) + 1;
  });
  return { ...complex, simplices, dimension: maximumDimension, dimensionCounts };
}

async function computeSimplicial(request: SimplicialRequest): Promise<SimplicialResult> {
  validateSimplicialRequest(request);
  const startedAt = performance.now();
  const engine = await getEngine();
  const points = flat(request.points);
  const dimension = request.points[0]!.length;
  const scale = pointCloudScale(request.points);
  const parameters = resolveParameters(request, scale);
  const maxDimension = parameters.maxSimplexDimension;
  let complex: AlphaComplexResult;

  switch (request.complex) {
    case 'rips':
      complex = engine.computeRipsComplex(points, dimension, parameters.maxEdgeLength, maxDimension);
      break;
    case 'alpha': {
      const weightedPoints = request.points.map((point) => ({
        x: point[0]!,
        y: point[1]!,
        z: dimension === 3 ? point[2]! : 0,
        weight: 0,
      }));
      complex = capAlphaSimplices(engine.computeWeightedAlphaComplex(weightedPoints), maxDimension);
      break;
    }
    case 'cech':
      complex = engine.computeCechComplex(points, dimension, parameters.maxRadius, maxDimension);
      break;
  }

  const coefficientField = request.coefficientField ?? 2;
  const persistence = engine.computePersistence(complex.simplices, coefficientField);
  const visualizableSimplices = complex.simplices.filter((simplex) =>
    simplex.vertices.every((vertex) => vertex >= 0 && vertex < request.points.length),
  );
  const canAnimate = visualizableSimplices.length <= MAX_VISUALIZATION_SIMPLICES;
  const simplices = canAnimate
    ? visualizableSimplices.map((simplex) => ({ vertices: [...simplex.vertices], filtration: simplex.filtration }))
    : [];
  const allEdges = visualizableSimplices.filter((simplex) => simplex.vertices.length === 2);
  const edges = canAnimate ? allEdges.map((simplex) => ({
    vertices: [simplex.vertices[0]!, simplex.vertices[1]!] as [number, number],
    filtration: simplex.filtration,
  })) : [];
  let minFiltration = 0;
  let maxFiltration = 1e-9;
  complex.simplices.forEach((simplex) => {
    if (!Number.isFinite(simplex.filtration)) return;
    minFiltration = Math.min(minFiltration, simplex.filtration);
    maxFiltration = Math.max(maxFiltration, simplex.filtration);
  });

  const reliable = reliableThroughDimension(request.complex, maxDimension, dimension);
  const summary = summarizePersistence(persistence, MAX_RESULT_LIMIT, {
    reliableThroughDimension: reliable,
    filtrationRange: maxFiltration - minFiltration,
  });
  return {
    kind: 'simplicial',
    complex: request.complex,
    input: {
      pointCount: request.points.length,
      dimension,
      coefficientField,
      parameters: reportedParameters(request.complex, parameters),
      defaulted: parameters.defaulted,
      scale: { diameter: scale.diameter, connectingDistance: scale.connectingDistance },
    },
    complexSummary: summarizeComplex(complex.simplices),
    visualization: {
      supported: canAnimate,
      reason: canAnimate
        ? null
        : `Filtration playback is limited to ${MAX_VISUALIZATION_SIMPLICES.toLocaleString()} simplices.`,
      simplices,
      simplexCount: visualizableSimplices.length,
      edges,
      edgeCount: allEdges.length,
      truncated: !canAnimate,
      minFiltration,
      maxFiltration,
    },
    persistence: summary,
    interpretation: {
      reliableThroughDimension: reliable,
      warnings: interpretationWarnings({
        kind: request.complex,
        persistence: summary,
        maxSimplexDimension: maxDimension,
        defaultSimplexDimension: defaultMaximumSimplexDimension(request.points),
        parameters,
        scale,
      }),
    },
    elapsedMs: performance.now() - startedAt,
  };
}

function resolveImage(request: CubicalRequest, currentImage?: ScalarImage): ScalarImage {
  const source = request.source ?? 'current';
  if (source === 'values') {
    return { name: 'agent-values', width: request.width!, height: request.height!, values: request.values! };
  }
  if (!currentImage) throw new Error('No current image is available. Upload an image or choose source "sample" or "values".');
  return currentImage;
}

function downsampleImage(image: ScalarImage, factor: 1 | 2 | 4): ScalarImage {
  if (factor === 1) return image;
  const width = Math.ceil(image.width / factor);
  const height = Math.ceil(image.height / factor);
  const values: number[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      values.push(image.values[Math.min(y * factor, image.height - 1) * image.width + Math.min(x * factor, image.width - 1)]!);
    }
  }
  return { ...image, width, height, values };
}

function valueRange(values: readonly number[]): { minimum: number; maximum: number } {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (value < minimum) minimum = value;
    if (value > maximum) maximum = value;
  }
  return { minimum, maximum };
}

async function computeCubical(request: CubicalRequest, currentImage?: ScalarImage) {
  validateCubicalRequest(request);
  const startedAt = performance.now();
  const engine = await getEngine();
  const downsample = request.downsample ?? 1;
  const sourceImage = resolveImage(request, currentImage);
  const shouldBinarize = request.binarize ?? true;
  const foreground = request.foreground ?? 'dark';
  const processed = shouldBinarize
    ? binarizeImage(gaussianBlurImage(sourceImage), request.threshold, foreground)
    : { image: sourceImage, threshold: null };
  if (shouldBinarize) processed.image = closeBinaryImage(processed.image);
  const image = downsampleImage(processed.image, downsample);
  const filtration = request.filtration ?? 'sublevel';
  let values = image.values;
  const { minimum, maximum } = valueRange(values);
  if (filtration === 'superlevel') {
    values = values.map((value) => minimum + maximum - value);
  }
  const persistence = engine.computeCubicalPersistenceFromVertices2D(values, image.width, image.height);
  return {
    kind: 'cubical' as const,
    input: {
      name: sourceImage.name,
      width: image.width,
      height: image.height,
      binarized: shouldBinarize,
      threshold: processed.threshold,
      foreground: shouldBinarize ? foreground : null,
      filtration,
      downsample,
    },
    persistence: summarizePersistence(persistence, MAX_RESULT_LIMIT, { filtrationRange: maximum - minimum }),
    elapsedMs: performance.now() - startedAt,
  };
}

async function compute(request: ComputeRequest, currentImage?: ScalarImage) {
  return request.kind === 'simplicial'
    ? computeSimplicial(request)
    : computeCubical(request, currentImage);
}

workerScope.addEventListener('message', (event: MessageEvent<WorkerRequestMessage>) => {
  const { id, request, currentImage } = event.data;
  void compute(request, currentImage)
    .then((result) => workerScope.postMessage({ id, ok: true, result } satisfies WorkerResponseMessage))
    .catch((error: unknown) => workerScope.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } satisfies WorkerResponseMessage));
});

export {};
