import { createElement, lazy, Suspense, useMemo } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createFiltration } from 'tda-viz-react/filtration';
import {
  PointCloud2D,
  type PointCloud2DEdge,
  type PointCloud2DInteractionMode,
} from 'tda-viz-react/2d';
import type { ComplexKind, FiltrationSimplex } from '../tda/types';

export interface PointCloud3DFiltration {
  complex: ComplexKind;
  simplices: readonly FiltrationSimplex[];
  maxSimplexDimension: number;
  value: number;
  showCover: boolean;
}

export interface PointCloudRenderOptions {
  edges?: readonly PointCloud2DEdge[];
  diskRadii?: readonly number[];
  fitDiskRadii?: readonly number[];
  interactionMode?: PointCloud2DInteractionMode;
  showAxes?: boolean;
  filtration3d?: PointCloud3DFiltration;
  onPointsChange?: (points: number[][]) => void;
}

export interface PointCloudVisualization {
  render(points: number[][], options?: PointCloudRenderOptions): void;
  unmount(): void;
}

const ORIGIN_2D = [0, 0] as const;

export function normalizePointCloud3D(
  points: number[][],
  complex: ComplexKind,
  simplices: readonly FiltrationSimplex[],
) {
  if (points.length === 0) {
    return { points: [], simplices: [], scaleFiltrationValue: (value: number) => value };
  }
  const center = [0, 1, 2].map((axis) =>
    points.reduce((sum, point) => sum + (point[axis] ?? 0), 0) / points.length,
  );
  const centered = points.map((point) => [
    (point[0] ?? 0) - center[0]!,
    (point[1] ?? 0) - center[1]!,
    (point[2] ?? 0) - center[2]!,
  ]);
  const radius = Math.max(0.001, ...centered.map(([x, y, z]) => Math.hypot(x!, y!, z!)));
  const filtrationScale = complex === 'alpha' ? radius * radius : radius;
  const scaleFiltrationValue = (value: number) => value / filtrationScale;
  return {
    points: centered.flatMap(([x, y, z]) => [x! / radius, y! / radius, z! / radius]),
    simplices: simplices.map((simplex) => ({
      vertices: [...simplex.vertices],
      filtration: scaleFiltrationValue(simplex.filtration),
    })),
    scaleFiltrationValue,
  };
}

const RotatablePointCloud3D = lazy(async () => {
  const [{ Field3D, Nerve3D, PlayCanvasStage, PointCloud3D }, playcanvas] = await Promise.all([
    import('tda-viz-react/3d'),
    import('playcanvas'),
  ]);

  function AnimatedPointCloud3D({ points, config }: { points: number[][]; config?: PointCloud3DFiltration }) {
    const complex = config?.complex ?? 'rips';
    const simplices = config?.simplices ?? [];
    const scene = useMemo(
      () => normalizePointCloud3D(points, complex, simplices),
      [points, complex, simplices],
    );
    const maxSimplexDimension = config?.maxSimplexDimension;
    const filtration = useMemo(() => {
      if (maxSimplexDimension === undefined) return null;
      return createFiltration({
        cloud: {
          points: scene.points,
          weights: Array.from({ length: scene.points.length / 3 }, () => 0),
          dimension: 3,
        },
        convention: complex,
        complexType: complex,
        maxSimplexDimension,
        simplices: scene.simplices,
        rawPairs: [],
      });
    }, [complex, maxSimplexDimension, scene.points, scene.simplices]);
    const t = scene.scaleFiltrationValue(config?.value ?? 0);

    return createElement(
      PlayCanvasStage,
      {
        className: 'point-cloud-3d',
        cameraPosition: [0, 0.15, 3.1],
        clearColor: '#0b2531',
        enableControls: true,
        autoRotate: true,
        autoRotateSpeed: 0.34,
        // WebGPU currently reports invalid multisample textures when a hidden
        // workbench panel is resized in Chromium. WebGL2 is stable here and
        // still gives the same interactive PlayCanvas scene.
        createGraphicsDevice: (canvas: HTMLCanvasElement) => new playcanvas.WebglGraphicsDevice(canvas, {
          alpha: true,
          antialias: true,
          preserveDrawingBuffer: false,
        }),
      },
      filtration && config?.showCover ? createElement(Field3D, {
        key: 'field',
        filtration,
        t,
        color: '#5ac8e8',
        opacity: 0.1,
      }) : null,
      filtration ? createElement(Nerve3D, {
        key: 'nerve',
        filtration,
        t,
        edgeColor: '#78d4ea',
        triangleColor: '#e85f3f',
        triangleOpacity: 0.24,
      }) : null,
      createElement(PointCloud3D, {
        key: 'points',
        points: scene.points,
        dimension: 3,
        color: '#eefaff',
        size: 0.045,
      }),
    );
  }

  return { default: AnimatedPointCloud3D };
});

export function mountPointCloudVisualization(container: HTMLElement): PointCloudVisualization {
  const root: Root = createRoot(container);

  return {
    render(points, options = {}) {
      const dimension = points[0]?.length === 3 ? 3 : 2;
      if (dimension === 3) {
        root.render(createElement(
          Suspense,
          { fallback: createElement('div', { className: 'point-cloud-loading' }, 'Preparing 3D view…') },
          createElement(RotatablePointCloud3D, { points, config: options.filtration3d }),
        ));
        return;
      }

      root.render(createElement(PointCloud2D, {
        points: points.flatMap((point) => [point[0] ?? 0, point[1] ?? 0]),
        edges: options.edges,
        diskRadii: options.diskRadii,
        fitDiskRadii: options.fitDiskRadii,
        interactionMode: options.interactionMode,
        showAxes: options.showAxes,
        projectionCenter: options.showAxes ? ORIGIN_2D : undefined,
        axisColor: '#9db6bd',
        axisLabelColor: '#b8d0d5',
        diskColor: '#5ac8e8',
        diskOpacity: 0.13,
        diskStrokeColor: '#78d4ea',
        editable: Boolean(options.onPointsChange),
        onPointsChange: options.onPointsChange
          ? (flatPoints: number[]) => options.onPointsChange!(Array.from(
            { length: flatPoints.length / 2 },
            (_, index) => [flatPoints[index * 2]!, flatPoints[index * 2 + 1]!],
          ))
          : undefined,
        width: 720,
        height: 380,
        padding: 40,
        pointRadius: 4.6,
        color: '#eefaff',
        edgeColor: '#5ac8e8',
        edgeWidth: 1.4,
        className: 'point-cloud-2d',
        'aria-label': `Interactive point cloud with ${points.length} points in two dimensions`,
      }));
    },
    unmount() {
      root.unmount();
    },
  };
}
