import { createElement, lazy, Suspense } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  PointCloud2D,
  type PointCloud2DEdge,
  type PointCloud2DInteractionMode,
} from 'tda-viz-react/2d';

export interface PointCloudRenderOptions {
  edges?: readonly PointCloud2DEdge[];
  diskRadii?: readonly number[];
  fitDiskRadii?: readonly number[];
  interactionMode?: PointCloud2DInteractionMode;
  onPointsChange?: (points: number[][]) => void;
}

export interface PointCloudVisualization {
  render(points: number[][], options?: PointCloudRenderOptions): void;
  unmount(): void;
}

function normalize3d(points: number[][]): number[] {
  if (points.length === 0) return [];
  const center = [0, 1, 2].map((axis) =>
    points.reduce((sum, point) => sum + (point[axis] ?? 0), 0) / points.length,
  );
  const centered = points.map((point) => [
    (point[0] ?? 0) - center[0]!,
    (point[1] ?? 0) - center[1]!,
    (point[2] ?? 0) - center[2]!,
  ]);
  const radius = Math.max(0.001, ...centered.map(([x, y, z]) => Math.hypot(x!, y!, z!)));
  return centered.flatMap(([x, y, z]) => [x! / radius, y! / radius, z! / radius]);
}

const RotatablePointCloud3D = lazy(async () => {
  const [{ PlayCanvasStage, PointCloud3D }, playcanvas] = await Promise.all([
    import('tda-viz-react/3d'),
    import('playcanvas'),
  ]);
  return {
    default: ({ points }: { points: number[][] }) => createElement(
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
      createElement(PointCloud3D, {
        points: normalize3d(points),
        dimension: 3,
        color: '#78d4ea',
        size: 0.045,
      }),
    ),
  };
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
          createElement(RotatablePointCloud3D, { points }),
        ));
        return;
      }

      root.render(createElement(PointCloud2D, {
        points: points.flatMap((point) => [point[0] ?? 0, point[1] ?? 0]),
        edges: options.edges,
        diskRadii: options.diskRadii,
        fitDiskRadii: options.fitDiskRadii,
        interactionMode: options.interactionMode,
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
