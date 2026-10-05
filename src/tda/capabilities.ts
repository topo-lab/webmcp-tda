import { IMAGE_SAMPLE_IDS, type ComplexKind } from './types';
import {
  DEFAULT_RESULT_LIMIT,
  MAX_COORDINATE_MAGNITUDE,
  MAX_IMAGE_VALUES,
  MAX_POINTS,
  MAX_POTENTIAL_SIMPLICES,
  MAX_RESULT_LIMIT,
} from './validation';

export interface ComplexCapability {
  id: ComplexKind;
  name: string;
  status: 'stable' | 'experimental';
  dimensions: number[];
  parameters: string[];
  filtrationUnits: string;
  note: string;
}

export const COMPLEX_CAPABILITIES: ComplexCapability[] = [
  {
    id: 'rips',
    name: 'Vietoris–Rips',
    status: 'experimental',
    dimensions: [2, 3],
    parameters: ['maxEdgeLength', 'maxSimplexDimension'],
    filtrationUnits: 'distance',
    note: 'Flag complex from pairwise distances.',
  },
  {
    id: 'alpha',
    name: 'Alpha',
    status: 'stable',
    dimensions: [2, 3],
    parameters: ['maxSimplexDimension'],
    filtrationUnits: 'squared radius',
    note: 'Unweighted alpha complex; 2D clouds are projected to their affine hull.',
  },
  {
    id: 'cech',
    name: 'Čech',
    status: 'stable',
    dimensions: [2, 3],
    parameters: ['maxRadius', 'maxSimplexDimension'],
    filtrationUnits: 'radius',
    note: 'Nerve of Euclidean balls using exact minimal enclosing-ball radii.',
  },
];

export const CAPABILITIES = {
  service: 'WebMCP TDA',
  execution: 'browser-local WebAssembly in a Web Worker',
  persistence: 'one-parameter persistent homology over a prime coefficient field',
  limits: {
    maximumPoints: MAX_POINTS,
    maximumImageVertices: MAX_IMAGE_VALUES,
    maximumReturnedPairs: MAX_RESULT_LIMIT,
    maximumPotentialSimplices: MAX_POTENTIAL_SIMPLICES,
    maximumCoordinateMagnitude: MAX_COORDINATE_MAGNITUDE,
  },
  defaults: {
    scale: 'maxEdgeLength (Rips) and maxRadius (Čech) default to the diameter of the point cloud, so no scale cuts the filtration off',
    resultLimit: DEFAULT_RESULT_LIMIT,
  },
  results: {
    reliableDimensions: 'H0 and H1 for 2D clouds, H0 to H2 for 3D clouds; classes above that are truncation artifacts and are counted as excluded, not returned',
    longLived: 'a class is long-lived when it never dies, or lives at least 20% as long as the longest-lived class of dimension 1 or higher',
    errors: 'failures are returned as {ok:false, error:{code, message, field, hint}} instead of being thrown',
  },
  simplicialComplexes: COMPLEX_CAPABILITIES,
  cubical: {
    dimensions: [2],
    input: 'current uploaded image, built-in sample, or row-major scalar values',
    samples: IMAGE_SAMPLE_IDS,
    filtrations: ['sublevel', 'superlevel'],
    preprocessing: '5×5 Gaussian denoise, Otsu or manual thresholding, and binary morphological closing by default; grayscale may be preserved explicitly',
    construction: 'vertex lower-star cubical filtration over F2',
  },
};
