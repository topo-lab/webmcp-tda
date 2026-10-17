import { describe, expect, it } from 'vitest';
import type { SerializablePair } from '../src/tda/types';
import { buildBarcode } from '../src/ui/barcode';
import { diagramPointForPair, pairIdFromHoverPoint } from '../src/ui/intervalLink';
import { buildPersistenceDiagram } from '../src/ui/persistenceDiagram';

const pairs: SerializablePair[] = [
  { id: 'h0', dimension: 0, birth: 0, death: 0.5, lifetime: 0.5 },
  { id: 'h1', dimension: 1, birth: 0.2, death: 0.8, lifetime: 0.6 },
  { id: 'h2', dimension: 2, birth: 0.6, death: 'infinity', lifetime: 'infinity' },
  { id: 'h3', dimension: 3, birth: 0.7, death: 0.9, lifetime: 0.2 },
];

describe('persistence barcode', () => {
  it('draws the same intervals as the diagram and leaves out higher dimensions', () => {
    const barcode = buildBarcode(pairs);
    const diagram = buildPersistenceDiagram(pairs);
    const barcodeIds = barcode.bands.flatMap((band) => band.intervals.map((interval) => interval.id)).sort();
    const diagramIds = diagram.data.flatMap((trace) => (trace.customdata ?? []).flatMap((row) => {
      if (!Array.isArray(row) || typeof row[2] !== 'string') return [];
      return [row[2]];
    })).sort();

    expect(barcode.empty).toBe(false);
    expect(barcodeIds).toEqual(['h0', 'h1', 'h2']);
    expect(barcodeIds).toEqual(diagramIds);
    expect(barcode.bands.map((band) => band.label)).toEqual(['H₀', 'H₁', 'H₂']);
  });

  it('places finite bars on the shared scale and runs an essential bar to the right edge', () => {
    const barcode = buildBarcode(pairs);
    const h0 = barcode.bands[0]!.intervals[0]!;
    const h1 = barcode.bands[1]!.intervals[0]!;
    const h2 = barcode.bands[2]!.intervals[0]!;

    expect(barcode.minimum).toBe(0);
    expect(barcode.maximum).toBe(0.8);
    expect(h0.xPercent).toBeCloseTo(0);
    expect(h0.widthPercent).toBeCloseTo(62.5);
    expect(h1.xPercent).toBeCloseTo(25);
    expect(h1.widthPercent).toBeCloseTo(75);
    expect(h2.essential).toBe(true);
    expect(h2.xPercent).toBeCloseTo(75);
    expect(h2.widthPercent).toBeCloseTo(25);
    expect(h2.label).toBe('H2, birth 0.6, death infinity');
    expect(h2.label).not.toMatch(/0\.9|fake/);
  });

  it('sorts a band by birth and marks intervals the playhead has not reached', () => {
    const unsorted: SerializablePair[] = [
      { id: 'later', dimension: 0, birth: 0.4, death: 0.5, lifetime: 0.1 },
      { id: 'earlier', dimension: 0, birth: 0.1, death: 0.2, lifetime: 0.1 },
    ];
    expect(buildBarcode(unsorted).bands[0]!.intervals.map((interval) => interval.id)).toEqual(['earlier', 'later']);
    expect(diagramPointForPair(unsorted, 'later')).toEqual({ curveNumber: 0, pointNumber: 0 });
    expect(diagramPointForPair(unsorted, 'earlier')).toEqual({ curveNumber: 0, pointNumber: 1 });

    const played = buildBarcode(pairs, { playhead: 0.4 });
    expect(played.playheadPercent).toBeCloseTo(50);
    expect(played.bands[0]!.intervals[0]!.active).toBe(true);
    expect(played.bands[1]!.intervals[0]!.active).toBe(true);
    expect(played.bands[2]!.intervals[0]!.active).toBe(false);
  });

  it('reads the interval id from a Plotly hover point', () => {
    expect(pairIdFromHoverPoint({ customdata: ['0.8', '0.6', 'h1'] })).toBe('h1');
    expect(pairIdFromHoverPoint({ customdata: ['0.8', '0.6'] })).toBeNull();
    expect(pairIdFromHoverPoint({ customdata: ['0.8', '0.6', ''] })).toBeNull();
    expect(pairIdFromHoverPoint({ customdata: ['0.8', '0.6', 1] })).toBeNull();
    expect(pairIdFromHoverPoint(undefined)).toBeNull();
    expect(diagramPointForPair(pairs, 'missing')).toBeNull();
    expect(diagramPointForPair(pairs, 'h3')).toBeNull();
  });

  it('is empty before a computation', () => {
    const barcode = buildBarcode([]);
    expect(barcode.empty).toBe(true);
    expect(barcode.bands).toEqual([]);
    expect(barcode.playheadPercent).toBeNull();
  });
});
