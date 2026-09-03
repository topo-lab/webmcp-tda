import { IMAGE_SAMPLE_IDS, type ComplexKind } from './types';

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
  {
    id: 'ellipsoid-rips',
    name: 'Ellipsoid Rips',
    status: 'experimental',
    dimensions: [2, 3],
    parameters: ['neighborhoodSize', 'axesMode', 'maxFiltration', 'maxSimplexDimension'],
    filtrationUnits: 'twice ellipsoid birth radius',
    note: 'Anisotropic flag complex; it is not a nerve.',
  },
  {
    id: 'ellipsoid-cech',
    name: 'Ellipsoid Čech',
    status: 'experimental',
    dimensions: [2, 3],
    parameters: ['neighborhoodSize', 'axesMode', 'maxFiltration', 'maxSimplexDimension'],
    filtrationUnits: 'ellipsoid scale',
    note: 'True nerve of fitted convex ellipsoids.',
  },
  {
    id: 'wing',
    name: 'Wing',
    status: 'experimental',
    dimensions: [2],
    parameters: ['q', 'theta', 'neighborhoodSize', 'maxEps', 'maxSimplexDimension'],
    filtrationUnits: 'epsilon',
    note: 'Curvature-adaptive 2D flag complex; it is not a nerve.',
  },
  {
    id: 'box',
    name: 'Box filtration',
    status: 'experimental',
    dimensions: [2, 3],
    parameters: ['stepSize', 'alpha', 'maxSteps', 'maxSimplexDimension'],
    filtrationUnits: 'stepSize multiples',
    note: 'Nerve of growing axis-aligned boxes with quantized filtration values.',
  },
  {
    id: 'k-fold-cover',
    name: 'k-fold cover',
    status: 'stable',
    dimensions: [3],
    parameters: ['k', 'maxSquaredRadius', 'maxSimplexDimension'],
    filtrationUnits: 'squared radius',
    note: 'Exact order-k Delaunay multicover persistence; requires nondegenerate 3D input.',
  },
  {
    id: 'witness',
    name: 'Euclidean weak witness',
    status: 'experimental',
    dimensions: [2, 3],
    parameters: ['numLandmarks', 'maxAlphaSquare', 'maxSimplexDimension'],
    filtrationUnits: 'squared relaxation',
    note: 'Weak witness complex with deterministic farthest-point landmarks.',
  },
];

export const CAPABILITIES = {
  service: 'WebMCP TDA',
  execution: 'browser-local WebAssembly in a Web Worker',
  persistence: 'one-parameter persistent homology over a prime coefficient field',
  limits: {
    maximumPoints: 256,
    maximumKFoldCoverPoints: 48,
    maximumImageVertices: 65_536,
    maximumReturnedPairs: 200,
    maximumPotentialSimplices: 2_000_000,
    maximumCoordinateMagnitude: 1_000_000,
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
