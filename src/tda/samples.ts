export const POINT_SAMPLE_IDS = ['circle', 'figure-eight', 'clusters', 'sphere'] as const;
export type PointSampleId = (typeof POINT_SAMPLE_IDS)[number];

export function circlePoints(count = 32): number[][] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return [Math.cos(angle), Math.sin(angle)];
  });
}

export function figureEightPoints(count = 40): number[][] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return [Math.sin(angle), Math.sin(angle * 2) * 0.72];
  });
}

export function clusterPoints(): number[][] {
  const offsets = [
    [-0.18, -0.12], [0.04, -0.16], [0.2, -0.02], [-0.12, 0.14], [0.1, 0.16],
  ];
  return [[-0.72, 0], [0.72, 0]].flatMap(([centerX, centerY]) =>
    offsets.map(([x, y]) => [centerX! + x!, centerY! + y!]),
  );
}

export function spherePoints(count = 28): number[][] {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, index) => {
    const y = 1 - (index / (count - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = goldenAngle * index;
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
  });
}

export function pointSample(id: PointSampleId): number[][] {
  if (id === 'figure-eight') return figureEightPoints();
  if (id === 'clusters') return clusterPoints();
  if (id === 'sphere') return spherePoints();
  return circlePoints();
}
