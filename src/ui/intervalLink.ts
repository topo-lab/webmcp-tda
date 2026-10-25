import type { SerializablePair } from '../tda/types';

/** Homology the diagram and the barcode both draw, in trace order. */
export const INTERVAL_DIMENSIONS = [
  { dimension: 0, label: 'H₀', color: '#137963' },
  { dimension: 1, label: 'H₁', color: '#e85f3f' },
  { dimension: 2, label: 'H₂', color: '#7657d6' },
] as const;

export function visibleDiagramPairs(pairs: readonly SerializablePair[]): SerializablePair[] {
  return pairs.filter((pair) => pair.dimension >= 0 && pair.dimension <= 2);
}

/** Plotly trace and point for one interval. Trace order is H₀, H₁, H₂. */
export function diagramPointForPair(
  pairs: readonly SerializablePair[],
  id: string,
): { curveNumber: number; pointNumber: number } | null {
  const visible = visibleDiagramPairs(pairs);
  for (let curveNumber = 0; curveNumber < INTERVAL_DIMENSIONS.length; curveNumber += 1) {
    const dimension = INTERVAL_DIMENSIONS[curveNumber]!.dimension;
    const pointNumber = visible.filter((pair) => pair.dimension === dimension).findIndex((pair) => pair.id === id);
    if (pointNumber >= 0) return { curveNumber, pointNumber };
  }
  return null;
}

export function pairIdFromHoverPoint(point: { customdata?: unknown } | undefined): string | null {
  const data = point?.customdata;
  if (!Array.isArray(data) || data.length < 3) return null;
  const id = data[2];
  return typeof id === 'string' && id.length > 0 ? id : null;
}
