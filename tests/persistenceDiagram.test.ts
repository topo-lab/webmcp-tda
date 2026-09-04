import { describe, expect, it } from 'vitest';
import type { SerializablePair } from '../src/tda/types';
import { buildPersistenceDiagram } from '../src/ui/persistenceDiagram';

const pairs: SerializablePair[] = [
  { id: 'h0', dimension: 0, birth: 0, death: 0.5, lifetime: 0.5 },
  { id: 'h1', dimension: 1, birth: 0.2, death: 0.8, lifetime: 0.6 },
  { id: 'h2', dimension: 2, birth: 0.6, death: 'infinity', lifetime: 'infinity' },
  { id: 'h3', dimension: 3, birth: 0.7, death: 0.9, lifetime: 0.2 },
];

describe('Plotly persistence diagram', () => {
  it('builds separate, distinguishable H0, H1, and H2 traces', () => {
    const figure = buildPersistenceDiagram(pairs);

    expect(figure.data.map((trace) => trace.name)).toEqual(['H₀', 'H₁', 'H₂']);
    expect(figure.data.map((trace) => trace.marker?.color)).toEqual([
      '#137963',
      '#e85f3f',
      '#7657d6',
    ]);
    expect(figure.data.flatMap((trace) => (trace.x ?? []) as number[])).not.toContain(0.7);
  });

  it('renders essential classes on a labelled infinity row with a diamond marker', () => {
    const figure = buildPersistenceDiagram(pairs);
    const h2 = figure.data[2]!;

    expect(h2.marker?.symbol).toEqual(['diamond']);
    expect(figure.layout.yaxis?.ticktext).toContain('∞');
    expect(h2.hovertemplate).toContain('death %{customdata[0]}');
  });

  it('fits a stable square range to the visible pairs and adds both playhead guides', () => {
    const figure = buildPersistenceDiagram(pairs, { playhead: 0.4 });

    expect(figure.layout.xaxis?.range?.[1]).toBeGreaterThan(0.8);
    expect(figure.layout.xaxis?.range?.[1]).toBeLessThan(1.1);
    expect(figure.layout.yaxis?.range).toEqual(figure.layout.xaxis?.range);
    expect(figure.layout.yaxis?.scaleanchor).toBe('x');
    expect(figure.layout.shapes).toHaveLength(4);
    expect(figure.config.responsive).toBe(true);
    expect(figure.config.toImageButtonOptions?.format).toBe('svg');
  });

  it('dynamically expands and formats the range for each result scale', () => {
    const compact = buildPersistenceDiagram([
      { id: 'small', dimension: 1, birth: 0, death: 0.0004, lifetime: 0.0004 },
    ]);
    const wide = buildPersistenceDiagram([
      { id: 'wide', dimension: 1, birth: 20, death: 80, lifetime: 60 },
    ]);

    expect(compact.layout.xaxis?.range?.[1]).toBeLessThan(0.001);
    expect(new Set(compact.layout.xaxis?.ticktext as string[]).size).toBe(5);
    expect(wide.layout.xaxis?.range?.[1]).toBeGreaterThan(80);
    expect(wide.layout.xaxis?.range?.[1]).toBeLessThan(90);
  });

  it('reserves the Plotly toolbar gutter outside the data region', () => {
    const figure = buildPersistenceDiagram(pairs);

    expect(figure.layout.margin?.t).toBeGreaterThanOrEqual(40);
    expect(figure.layout.xaxis?.automargin).toBe(true);
    expect(figure.config.modeBarButtonsToRemove).toContain('pan2d');
  });

  it('shows an empty-state annotation before computation', () => {
    const figure = buildPersistenceDiagram([]);

    expect(figure.layout.annotations?.[0]?.text).toContain('Run a computation');
  });
});
