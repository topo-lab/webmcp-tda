import { createElement, lazy, Suspense } from 'react';
import { createRoot, type Root } from 'react-dom/client';

export interface PointCloudVisualization {
  render(points: number[][]): void;
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

function project2d(points: number[][]): Array<readonly [number, number]> {
  const width = 720;
  const height = 380;
  const padding = 40;
  const xs = points.map((point) => point[0] ?? 0);
  const ys = points.map((point) => point[1] ?? 0);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const offsetX = padding + (width - padding * 2 - spanX * scale) / 2;
  const offsetY = padding + (height - padding * 2 - spanY * scale) / 2;
  return points.map((point) => [
    offsetX + ((point[0] ?? 0) - minX) * scale,
    offsetY + (maxY - (point[1] ?? 0)) * scale,
  ] as const);
}

function PointCloudSvg({ points }: { points: number[][] }) {
  const positions = project2d(points);
  return createElement(
    'svg',
    { className: 'point-cloud-2d', viewBox: '0 0 720 380', role: 'img', 'aria-label': `Point cloud with ${points.length} points in two dimensions` },
    positions.map(([cx, cy], index) => createElement('circle', {
      key: index,
      cx,
      cy,
      r: 4.6,
      fill: '#eefaff',
      stroke: '#5ac8e8',
      strokeWidth: 1.4,
    })),
  );
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
    render(points) {
      const dimension = points[0]?.length === 3 ? 3 : 2;
      if (dimension === 3) {
        root.render(createElement(
          Suspense,
          { fallback: createElement('div', { className: 'point-cloud-loading' }, 'Preparing 3D view…') },
          createElement(RotatablePointCloud3D, { points }),
        ));
        return;
      }

      root.render(createElement(PointCloudSvg, { points }));
    },
    unmount() {
      root.unmount();
    },
  };
}
