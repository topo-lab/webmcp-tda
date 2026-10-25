import { describe, expect, it } from 'vitest';
import {
  imagePipelinePresentation,
  parsePointInput,
  resultDescription,
  pointCloudFitMaximumFiltration,
  pointCloudFiltrationRadii,
  webMcpStatusLabel,
  WORKBENCH_COMPLEX_KINDS,
} from '../src/ui/app';
import { normalizePointCloud3D } from '../src/ui/pointCloudVisualization';
import { cubicalResult, simplicialResult, summary } from './helpers/fixtures';

describe('human point input', () => {
  it('accepts a consistent finite point cloud', () => {
    expect(parsePointInput('[[0,0],[1,0],[0,1]]')).toEqual([[0, 0], [1, 0], [0, 1]]);
  });

  it('rejects malformed coordinates before drawing or computing', () => {
    expect(() => parsePointInput('[[0,0],[1,"bad"]]')).toThrow('finite numbers');
    expect(() => parsePointInput('[[0,0],[1,0,2]]')).toThrow('finite numbers');
  });

  it('offers the same three complex families as the agent API', () => {
    expect(WORKBENCH_COMPLEX_KINDS).toEqual(['rips', 'alpha', 'cech']);
  });

  it('combines the WebMCP name and registration state in one badge label', () => {
    expect(webMcpStatusLabel('registering')).toBe('WebMCP checking');
    expect(webMcpStatusLabel('ready')).toBe('WebMCP ready');
    expect(webMcpStatusLabel('unsupported')).toBe('WebMCP unavailable in this browser');
    expect(webMcpStatusLabel('error')).toBe('WebMCP error');
  });

  it('keeps the 2D projection fit fixed when filtration playback starts', () => {
    const beforeCompute = pointCloudFitMaximumFiltration('rips', { maxEdgeLength: 0.7 }, null);
    const afterCompute = pointCloudFitMaximumFiltration('rips', { maxEdgeLength: 0.7 }, 0.58);
    const beforePlayback = pointCloudFiltrationRadii(2, 'rips', 0.58, beforeCompute!, false);
    const duringPlayback = pointCloudFiltrationRadii(2, 'rips', 0, afterCompute!, true);

    expect(beforeCompute).toBe(0.7);
    expect(afterCompute).toBe(0.7);
    expect(beforePlayback).toEqual({ diskRadius: null, fitDiskRadius: 0.35 });
    expect(duringPlayback).toEqual({ diskRadius: 0, fitDiskRadius: 0.35 });
  });

  it('keeps the image pipeline stable and dims the mask when it is disabled', () => {
    expect(imagePipelinePresentation(true)).toEqual({
      stepCount: '3',
      grayscaleLabel: '2 · Grayscale',
      ariaLabel: 'Original color, grayscale, and binary mask previews',
      maskDisabled: false,
    });
    expect(imagePipelinePresentation(false)).toEqual({
      stepCount: '3',
      grayscaleLabel: '2 · Grayscale filtration',
      ariaLabel: 'Original color, grayscale filtration, and dimmed unused binary mask preview',
      maskDisabled: true,
    });
  });

  it('normalizes 3D geometry and filtration values together', () => {
    const simplices = [
      { vertices: [0], filtration: 0 },
      { vertices: [1], filtration: 0 },
      { vertices: [0, 1], filtration: 4 },
    ];
    const rips = normalizePointCloud3D([[0, 0, 0], [4, 0, 0]], 'rips', simplices);
    expect(rips.points).toEqual([-1, 0, 0, 1, 0, 0]);
    expect(rips.simplices.at(-1)?.filtration).toBe(2);
    expect(rips.scaleFiltrationValue(4)).toBe(2);

    const alpha = normalizePointCloud3D([[0, 0, 0], [4, 0, 0]], 'alpha', simplices);
    expect(alpha.simplices.at(-1)?.filtration).toBe(1);
    expect(alpha.scaleFiltrationValue(4)).toBe(1);
  });

  it('applies the same point limit as the tools before it says points are ready', () => {
    const many = JSON.stringify(Array.from({ length: 257 }, (_, index) => [index, 0]));
    expect(() => parsePointInput(many)).toThrow('At most 256 points are supported.');
    expect(parsePointInput(JSON.stringify(Array.from({ length: 256 }, (_, index) => [index, 0])))).toHaveLength(256);
  });

  it('describes what was found and what long-lived means, then appends the warnings', () => {
    const rips = simplicialResult({
      persistence: summary({ essentialByDimension: { 0: 1 }, persistentByDimension: { 1: 2 }, persistenceThreshold: 0.2 }),
      interpretation: { reliableThroughDimension: 1, warnings: ['Raise maxEdgeLength to see them merge.'] },
    });
    expect(resultDescription(rips)).toBe(
      'Vietoris–Rips on 3 2D points found 1 connected component, 2 long-lived loops (H₁). '
      + 'Long-lived means the class survives to the computed end, or lives at least 0.2 (20% as long as the longest-lived class of dimension 1 or higher). Raise maxEdgeLength to see them merge.',
    );
    const sphere = simplicialResult({
      input: { ...simplicialResult().input, dimension: 3 },
      persistence: summary({ essentialByDimension: { 0: 1 }, persistentByDimension: { 1: 0, 2: 1 } }),
      interpretation: { reliableThroughDimension: 2, warnings: [] },
    });
    expect(resultDescription(sphere)).toMatch(/1 connected component, 0 long-lived loops \(H₁\), 1 long-lived void \(H₂\)\./);
    const edgesOnly = simplicialResult({ interpretation: { reliableThroughDimension: 0, warnings: [] } });
    expect(resultDescription(edgesOnly)).not.toMatch(/loop/);
    const nothingToCompare = simplicialResult({ persistence: summary({ persistenceThreshold: 0 }) });
    expect(resultDescription(nothingToCompare)).toMatch(/Long-lived means the class survives to the computed end\.$/);
  });

  it('describes an image result with its segmentation and counts', () => {
    expect(resultDescription(cubicalResult({ persistence: summary({ persistentByDimension: { 1: 1 }, essentialByDimension: { 0: 1 } }) })))
      .toMatch(/^The agent-values image was analyzed as a 2 × 2 sublevel cubical filtration over F₂\. It was segmented at gray level 127 with dark pixels as foreground\. It has 1 connected component, 1 long-lived loop \(H₁\)\./);
    const gray = cubicalResult({ input: { ...cubicalResult().input, binarized: false, threshold: null, foreground: null } });
    expect(resultDescription(gray)).toMatch(/Its grayscale values were used directly\./);
  });
});
