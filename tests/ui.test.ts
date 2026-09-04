import { describe, expect, it } from 'vitest';
import {
  imagePipelinePresentation,
  parsePointInput,
  pointCloudFitMaximumFiltration,
  pointCloudFiltrationRadii,
  webMcpStatusLabel,
  WORKBENCH_COMPLEX_KINDS,
} from '../src/ui/app';
import { normalizePointCloud3D } from '../src/ui/pointCloudVisualization';

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
    expect(webMcpStatusLabel('unsupported')).toBe('WebMCP Unavailable in this browser');
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
});
