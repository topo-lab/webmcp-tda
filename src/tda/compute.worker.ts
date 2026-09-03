/// <reference lib="webworker" />

import { GudhiPersistentCohomology, type AlphaComplexResult } from 'tda-wasm';
import { imageSample } from './samples';
import { binarizeImage, closeBinaryImage, gaussianBlurImage } from './imageProcessing';
import { summarizeComplex, summarizePersistence } from './summary';
import type {
  ComplexParameters,
  ComputeRequest,
  CubicalRequest,
  ScalarImage,
  SimplicialRequest,
  SimplicialResult,
  WorkerRequestMessage,
  WorkerResponseMessage,
} from './types';
import { validateCubicalRequest, validateSimplicialRequest } from './validation';

const workerScope = self as DedicatedWorkerGlobalScope;
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

function defaults(request: SimplicialRequest): Required<Pick<ComplexParameters, 'maxSimplexDimension'>> & ComplexParameters {
  const pointCount = request.points.length;
  return {
    maxSimplexDimension: request.parameters?.maxSimplexDimension ?? 2,
    maxEdgeLength: request.parameters?.maxEdgeLength ?? 1.5,
    maxRadius: request.parameters?.maxRadius ?? 1,
    neighborhoodSize: request.parameters?.neighborhoodSize ?? Math.min(8, pointCount),
    axesMode: request.parameters?.axesMode ?? 'pca',
    maxFiltration: request.parameters?.maxFiltration,
    q: request.parameters?.q ?? 0.3,
    theta: request.parameters?.theta ?? Math.PI / 4,
    maxEps: request.parameters?.maxEps,
    stepSize: request.parameters?.stepSize ?? 0.1,
    alpha: request.parameters?.alpha ?? 0.5,
    maxSteps: request.parameters?.maxSteps ?? 20,
    k: request.parameters?.k ?? 2,
    maxSquaredRadius: request.parameters?.maxSquaredRadius ?? 4,
    numLandmarks: request.parameters?.numLandmarks ?? Math.min(16, pointCount),
    maxAlphaSquare: request.parameters?.maxAlphaSquare ?? 1,
  };
}

function reportedParameters(kind: SimplicialRequest['complex'], parameters: ComplexParameters): ComplexParameters {
  const maxSimplexDimension = parameters.maxSimplexDimension;
  switch (kind) {
    case 'rips': return { maxEdgeLength: parameters.maxEdgeLength, maxSimplexDimension };
    case 'alpha': return { maxSimplexDimension };
    case 'cech': return { maxRadius: parameters.maxRadius, maxSimplexDimension };
    case 'ellipsoid-rips':
    case 'ellipsoid-cech':
      return {
        neighborhoodSize: parameters.neighborhoodSize,
        axesMode: parameters.axesMode,
        maxFiltration: parameters.maxFiltration,
        maxSimplexDimension,
      };
    case 'wing':
      return {
        q: parameters.q,
        theta: parameters.theta,
        neighborhoodSize: parameters.neighborhoodSize,
        maxEps: parameters.maxEps,
        maxSimplexDimension,
      };
    case 'box':
      return {
        stepSize: parameters.stepSize,
        alpha: parameters.alpha,
        maxSteps: parameters.maxSteps,
        maxSimplexDimension,
      };
    case 'k-fold-cover':
      return { k: parameters.k, maxSquaredRadius: parameters.maxSquaredRadius, maxSimplexDimension };
    case 'witness':
      return { numLandmarks: parameters.numLandmarks, maxAlphaSquare: parameters.maxAlphaSquare, maxSimplexDimension };
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
  const parameters = defaults(request);
  const maxDimension = parameters.maxSimplexDimension;
  let complex: AlphaComplexResult;

  switch (request.complex) {
    case 'rips':
      complex = engine.computeRipsComplex(points, dimension, parameters.maxEdgeLength!, maxDimension);
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
      complex = engine.computeCechComplex(points, dimension, parameters.maxRadius!, maxDimension);
      break;
    case 'ellipsoid-rips':
      complex = engine.computeEllipsoidRipsComplex(
        points, dimension, parameters.neighborhoodSize!, parameters.axesMode!, maxDimension, parameters.maxFiltration,
      );
      break;
    case 'ellipsoid-cech':
      complex = engine.computeEllipsoidCechComplex(
        points, dimension, parameters.neighborhoodSize!, parameters.axesMode!, maxDimension, parameters.maxFiltration,
      );
      break;
    case 'wing':
      complex = engine.computeWingComplex(
        points, parameters.q!, parameters.theta!, parameters.neighborhoodSize!, maxDimension, parameters.maxEps,
      );
      break;
    case 'box':
      complex = engine.computeBoxFiltration(
        points, dimension, parameters.stepSize!, parameters.alpha!, parameters.maxSteps, maxDimension, false,
      );
      break;
    case 'k-fold-cover':
      complex = engine.computeKFoldCoverComplex(points, parameters.k!, parameters.maxSquaredRadius, maxDimension);
      break;
    case 'witness':
      complex = engine.computeEuclideanWitnessComplex(
        points, dimension, parameters.numLandmarks!, parameters.maxAlphaSquare!, maxDimension,
      );
      break;
  }

  const coefficientField = request.coefficientField ?? 2;
  const persistence = engine.computePersistence(complex.simplices, coefficientField);
  return {
    kind: 'simplicial',
    complex: request.complex,
    input: {
      pointCount: request.points.length,
      dimension,
      coefficientField,
      parameters: reportedParameters(request.complex, parameters),
    },
    complexSummary: summarizeComplex(complex.simplices),
    persistence: summarizePersistence(persistence, request.resultLimit ?? 50),
    interpretation: {
      reliableThroughDimension: Math.max(0, maxDimension - 1),
      warning: maxDimension < 3
        ? `The complex was capped at simplex dimension ${maxDimension}. H${maxDimension} classes can be truncation artifacts; interpret only H0 through H${Math.max(0, maxDimension - 1)}.`
        : null,
    },
    elapsedMs: performance.now() - startedAt,
  };
}

function resolveImage(request: CubicalRequest, currentImage?: ScalarImage): ScalarImage {
  const source = request.source ?? 'current';
  if (source === 'sample') return imageSample(request.sample!);
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
  if (filtration === 'superlevel') {
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
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
    persistence: summarizePersistence(persistence, request.resultLimit ?? 50),
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
