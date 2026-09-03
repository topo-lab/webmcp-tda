export const COMPLEX_KINDS = [
  'rips',
  'alpha',
  'cech',
  'ellipsoid-rips',
  'ellipsoid-cech',
  'wing',
  'box',
  'k-fold-cover',
  'witness',
] as const;

export type ComplexKind = (typeof COMPLEX_KINDS)[number];

export interface ComplexParameters {
  maxEdgeLength?: number;
  maxRadius?: number;
  maxSimplexDimension?: number;
  neighborhoodSize?: number;
  axesMode?: number | 'pca';
  maxFiltration?: number;
  q?: number;
  theta?: number;
  maxEps?: number;
  stepSize?: number;
  alpha?: number;
  maxSteps?: number;
  k?: number;
  maxSquaredRadius?: number;
  numLandmarks?: number;
  maxAlphaSquare?: number;
}

export interface SimplicialRequest {
  kind: 'simplicial';
  complex: ComplexKind;
  points: number[][];
  coefficientField?: number;
  resultLimit?: number;
  parameters?: ComplexParameters;
}

export type ImageSampleId = 'ring' | 'two-rings' | 'two-blobs';

export interface ScalarImage {
  name: string;
  width: number;
  height: number;
  values: number[];
}

export interface CubicalRequest {
  kind: 'cubical';
  source?: 'current' | 'sample' | 'values';
  sample?: ImageSampleId;
  width?: number;
  height?: number;
  values?: number[];
  /** Binarize the scalar image before building the cubical filtration. Defaults to true. */
  binarize?: boolean;
  /** Gray-level cutoff in [0, 255]. Omit to use Otsu's automatic threshold. */
  threshold?: number;
  /** Which side of the threshold represents the object and enters the filtration first. */
  foreground?: 'dark' | 'light';
  filtration?: 'sublevel' | 'superlevel';
  downsample?: 1 | 2 | 4;
  resultLimit?: number;
}

export interface SerializablePair {
  id: string;
  dimension: number;
  birth: number;
  death: number | 'infinity';
  lifetime: number | 'infinity';
}

export interface PersistenceSummary {
  pairCount: number;
  pairsByDimension: Record<number, number>;
  essentialCount: number;
  returnedPairCount: number;
  strongestPairs: SerializablePair[];
}

export interface FiltrationEdge {
  vertices: [number, number];
  filtration: number;
}

export interface SimplicialVisualization {
  supported: boolean;
  reason: string | null;
  edges: FiltrationEdge[];
  edgeCount: number;
  truncated: boolean;
  minFiltration: number;
  maxFiltration: number;
}

export interface SimplicialResult {
  kind: 'simplicial';
  complex: ComplexKind;
  input: {
    pointCount: number;
    dimension: number;
    coefficientField: number;
    parameters: ComplexParameters;
  };
  complexSummary: {
    simplexCount: number;
    simplexCountsByDimension: Record<number, number>;
    maxDimension: number;
  };
  visualization: SimplicialVisualization;
  persistence: PersistenceSummary;
  interpretation: {
    reliableThroughDimension: number;
    warning: string | null;
  };
  elapsedMs: number;
}

export interface CubicalResult {
  kind: 'cubical';
  input: {
    name: string;
    width: number;
    height: number;
    binarized: boolean;
    threshold: number | null;
    foreground: 'dark' | 'light' | null;
    filtration: 'sublevel' | 'superlevel';
    downsample: 1 | 2 | 4;
  };
  persistence: PersistenceSummary;
  elapsedMs: number;
}

export type ComputeRequest = SimplicialRequest | CubicalRequest;
export type ComputeResult = SimplicialResult | CubicalResult;

export interface WorkerRequestMessage {
  id: string;
  request: ComputeRequest;
  currentImage?: ScalarImage;
}

export type WorkerResponseMessage =
  | { id: string; ok: true; result: ComputeResult }
  | { id: string; ok: false; error: string };
