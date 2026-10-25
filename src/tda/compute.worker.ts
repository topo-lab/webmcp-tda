/// <reference lib="webworker" />

import {
  alphaComplex,
  cechComplex,
  cubicalPersistence,
  load,
  persistence,
  ripsComplex,
  type Complex,
  type PointCloud,
} from '@topolab/tda-wasm';
import { binarizeImage, closeBinaryImage, gaussianBlurImage } from './imageProcessing';
import { interpretationWarnings, reliableThroughDimension, type ResolvedParameters } from './interpretation';
import { pointCloudScale, type PointCloudScale } from './scale';
import { complexSimplices, diagramPairs, ROUND_OFF_FRACTION, summarizeComplex, summarizePersistence } from './summary';
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

/** `load()` is idempotent and forgets a failed attempt, so every computation can simply await it. */
function loadEngine(): Promise<void> {
  return load();
}

function pointCloud(points: number[][], d = points[0]!.length): PointCloud {
  const coords = new Float64Array(points.length * d);
  points.forEach((point, index) => {
    for (let axis = 0; axis < d; axis += 1) coords[index * d + axis] = point[axis] ?? 0;
  });
  return { coords, d };
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

/** The faces of `complex` up to `maximumDimension`; the order is kept, so the result is still a filtration. */
function capComplex(complex: Complex, maximumDimension: number): Complex {
  const vertices: number[] = [];
  const offsets = [0];
  const filtrations: number[] = [];
  for (let index = 0; index < complex.filtrations.length; index += 1) {
    const start = complex.offsets[index]!;
    const end = complex.offsets[index + 1]!;
    if (end - start - 1 > maximumDimension) continue;
    for (let at = start; at < end; at += 1) vertices.push(complex.vertices[at]!);
    offsets.push(vertices.length);
    filtrations.push(complex.filtrations[index]!);
  }
  return {
    vertices: Int32Array.from(vertices),
    offsets: Uint32Array.from(offsets),
    filtrations: Float64Array.from(filtrations),
    scale: complex.scale,
  };
}

/**
 * Lowers every face to the smallest value among its cofaces. A triangle and its longest edge can share one smallest
 * enclosing ball whose radius rounds one ulp apart when computed from different points; 0.3's `persistence()`
 * refuses such a complex, and 0.2 applied this same lowering. See tda-wasm WASM_HONESTY.md, "Čech: filtration
 * monotonicity". Values move by a few ulps at most.
 */
function lowerFacesToCofaces(complex: Complex): Complex {
  const filtrations = Float64Array.from(complex.filtrations);
  const index = new Map<string, number>();
  const byDimension: number[][] = [];
  const verticesOf = (simplex: number) => Array.from(complex.vertices.subarray(complex.offsets[simplex]!, complex.offsets[simplex + 1]!));
  for (let simplex = 0; simplex < filtrations.length; simplex += 1) {
    const vertices = verticesOf(simplex);
    index.set(vertices.join(','), simplex);
    (byDimension[vertices.length - 1] ??= []).push(simplex);
  }
  for (let dimension = byDimension.length - 1; dimension >= 1; dimension -= 1) {
    for (const simplex of byDimension[dimension] ?? []) {
      const vertices = verticesOf(simplex);
      for (let omitted = 0; omitted < vertices.length; omitted += 1) {
        const face = index.get(vertices.filter((_, at) => at !== omitted).join(','))!;
        if (filtrations[face]! > filtrations[simplex]!) filtrations[face] = filtrations[simplex]!;
      }
    }
  }
  return { ...complex, filtrations };
}

/**
 * Pairs no longer than this are floating-point round-off, not features: alpha complexes of cospherical points
 * (the sphere example) leave bars below 2e-15 with the vendored build, up to 3e-14 with earlier ones. Relative to the largest value, so it holds at any scale.
 */
function roundOffFloor(complex: Complex): number {
  let largest = 0;
  for (const value of complex.filtrations) if (Number.isFinite(value)) largest = Math.max(largest, Math.abs(value));
  return ROUND_OFF_FRACTION * largest;
}

function buildComplex(request: SimplicialRequest, parameters: ResolvedParameters): Complex {
  const maxSimplexDim = parameters.maxSimplexDimension;
  switch (request.complex) {
    case 'rips':
      return ripsComplex(pointCloud(request.points), { maxEdgeLength: parameters.maxEdgeLength, maxSimplexDim });
    case 'alpha':
      // The alpha complex is built in 3D; a planar cloud lies in the plane z = 0, as it did with the 0.2 engine.
      return capComplex(alphaComplex(pointCloud(request.points, 3)), maxSimplexDim);
    case 'cech':
      return lowerFacesToCofaces(cechComplex(pointCloud(request.points), { maxRadius: parameters.maxRadius, maxSimplexDim }));
  }
}

async function computeSimplicial(request: SimplicialRequest): Promise<SimplicialResult> {
  validateSimplicialRequest(request);
  const startedAt = performance.now();
  await loadEngine();
  const dimension = request.points[0]!.length;
  const scale = pointCloudScale(request.points);
  const parameters = resolveParameters(request, scale);
  const maxDimension = parameters.maxSimplexDimension;
  const complex = buildComplex(request, parameters);
  const allSimplices = complexSimplices(complex);

  const coefficientField = request.coefficientField ?? 2;
  const pairs = diagramPairs(persistence(complex, { coeff: coefficientField, minPersistence: roundOffFloor(complex) }));
  const visualizableSimplices = allSimplices.filter((simplex) =>
    simplex.vertices.every((vertex) => vertex >= 0 && vertex < request.points.length),
  );
  const canAnimate = visualizableSimplices.length <= MAX_VISUALIZATION_SIMPLICES;
  const simplices = canAnimate ? visualizableSimplices : [];
  const allEdges = visualizableSimplices.filter((simplex) => simplex.vertices.length === 2);
  const edges = canAnimate ? allEdges.map((simplex) => ({
    vertices: [simplex.vertices[0]!, simplex.vertices[1]!] as [number, number],
    filtration: simplex.filtration,
  })) : [];
  let minFiltration = 0;
  let maxFiltration = 1e-9;
  complex.filtrations.forEach((filtration) => {
    if (!Number.isFinite(filtration)) return;
    minFiltration = Math.min(minFiltration, filtration);
    maxFiltration = Math.max(maxFiltration, filtration);
  });

  const reliable = reliableThroughDimension(request.complex, maxDimension, dimension);
  const summary = summarizePersistence(pairs, MAX_RESULT_LIMIT, { reliableThroughDimension: reliable, filtrationEnd: maxFiltration });
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
    complexSummary: summarizeComplex(allSimplices),
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
  await loadEngine();
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
  // Construction 'V' values the vertices (pixels) and gives each edge and square the largest value of its corners.
  const pairs = diagramPairs(cubicalPersistence({ values: Float64Array.from(values), shape: [image.height, image.width] }, { construction: 'V' }));
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
    persistence: summarizePersistence(pairs, MAX_RESULT_LIMIT, { filtrationEnd: maximum }),
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
