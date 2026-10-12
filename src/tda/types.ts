export const COMPLEX_KINDS = ['rips', 'alpha', 'cech'] as const;

export type ComplexKind = (typeof COMPLEX_KINDS)[number];

export interface ComplexParameters {
  maxEdgeLength?: number;
  maxRadius?: number;
  maxSimplexDimension?: number;
}

export interface SimplicialRequest {
  kind: 'simplicial';
  complex: ComplexKind;
  points: number[][];
  coefficientField?: number;
  /** How many persistence pairs an agent receives (strongest first). The workbench always keeps up to 200. */
  resultLimit?: number;
  parameters?: ComplexParameters;
}

export const IMAGE_SAMPLE_IDS = ['donut', 'pretzel', 'glasses'] as const;
export type ImageSampleId = (typeof IMAGE_SAMPLE_IDS)[number];

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
  /** Pairs in the dimensions the complex can be trusted for; see `excludedPairs`. */
  pairCount: number;
  pairsByDimension: Record<number, number>;
  /** Classes that are still alive at the end of the filtration. */
  essentialCount: number;
  essentialByDimension: Record<number, number>;
  /** Per dimension: pairs still alive at the computed end or that live at least `persistenceThreshold`. */
  persistentByDimension: Record<number, number>;
  persistenceThreshold: number;
  /** Pairs left out per dimension because the complex was capped below that dimension. */
  excludedPairs: Record<number, number>;
  returnedPairCount: number;
  strongestPairs: SerializablePair[];
}

export interface FiltrationSimplex {
  vertices: number[];
  filtration: number;
}

export interface FiltrationEdge {
  vertices: [number, number];
  filtration: number;
}

export interface SimplicialVisualization {
  supported: boolean;
  reason: string | null;
  simplices: FiltrationSimplex[];
  simplexCount: number;
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
    /** The filtration limits used. */
    parameters: ComplexParameters;
    /** Limits the caller did not give; they were taken from the scale of the cloud. */
    defaulted: Array<'maxEdgeLength' | 'maxRadius'>;
    scale: { diameter: number; connectingDistance: number };
  };
  complexSummary: {
    simplexCount: number;
    simplexCountsByDimension: Record<number, number>;
    maxDimension: number;
  };
  visualization: SimplicialVisualization;
  persistence: PersistenceSummary;
  interpretation: {
    /** Highest homology dimension the complex can be trusted for; higher classes are left out. */
    reliableThroughDimension: number;
    warnings: string[];
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
