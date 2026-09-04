import type { Config, Layout, PlotData, Shape } from 'plotly.js';
import type { SerializablePair } from '../tda/types';

export interface PersistenceDiagramOptions {
  playhead?: number;
}

export interface PersistenceDiagramFigure {
  data: Array<Partial<PlotData>>;
  layout: Partial<Layout>;
  config: Partial<Config>;
}

const DIMENSIONS = [
  { dimension: 0, label: 'H₀', color: '#137963' },
  { dimension: 1, label: 'H₁', color: '#e85f3f' },
  { dimension: 2, label: 'H₂', color: '#7657d6' },
] as const;

function diagramBounds(pairs: SerializablePair[]) {
  const finiteValues = pairs.flatMap((pair) => [pair.birth, pair.death === 'infinity' ? pair.birth : pair.death]);
  const dataMinimum = finiteValues.length === 0 ? 0 : Math.min(0, ...finiteValues);
  const dataMaximum = finiteValues.length === 0 ? 1 : Math.max(0, ...finiteValues);
  const dataSpan = dataMaximum - dataMinimum;
  const span = dataSpan > Number.EPSILON
    ? dataSpan
    : Math.max(1, Math.abs(dataMinimum), Math.abs(dataMaximum));
  const padding = span * 0.06;
  const minimum = dataMinimum < 0 ? dataMinimum - padding : 0;
  const numericMaximum = dataMaximum + padding;
  const infinityLevel = pairs.some((pair) => pair.death === 'infinity')
    ? numericMaximum + span * 0.12
    : null;
  const axisMaximum = infinityLevel === null ? numericMaximum : infinityLevel + span * 0.08;
  return { minimum, numericMaximum, infinityLevel, axisMaximum };
}

function formatTick(value: number): string {
  if (Math.abs(value) < Number.EPSILON) return '0';
  const absolute = Math.abs(value);
  if (absolute >= 10_000 || absolute < 0.001) return value.toExponential(1).replace('.0e', 'e');
  return String(Number(value.toPrecision(3)));
}

function diagramShapes(
  minimum: number,
  numericMaximum: number,
  axisMaximum: number,
  infinityLevel: number | null,
  playhead?: number,
): Partial<Shape>[] {
  const shapes: Partial<Shape>[] = [{
    type: 'line',
    x0: minimum,
    y0: minimum,
    x1: numericMaximum,
    y1: numericMaximum,
    line: { color: '#9fb2b6', width: 1.25 },
    layer: 'below',
  }];
  if (infinityLevel !== null) {
    shapes.push({
      type: 'line',
      x0: minimum,
      y0: infinityLevel,
      x1: axisMaximum,
      y1: infinityLevel,
      line: { color: '#c8d5d7', width: 1, dash: 'dot' },
      layer: 'below',
    });
  }
  if (playhead !== undefined) {
    const position = Math.max(minimum, Math.min(numericMaximum, playhead));
    shapes.push(
      {
        type: 'line',
        x0: position,
        y0: minimum,
        x1: position,
        y1: axisMaximum,
        line: { color: '#e85f3f', width: 1.5, dash: 'dash' },
      },
      {
        type: 'line',
        x0: minimum,
        y0: position,
        x1: axisMaximum,
        y1: position,
        line: { color: '#e85f3f', width: 1.5, dash: 'dash' },
      },
    );
  }
  return shapes;
}

export function buildPersistenceDiagram(
  pairs: SerializablePair[],
  options: PersistenceDiagramOptions = {},
): PersistenceDiagramFigure {
  const visiblePairs = pairs.filter((pair) => pair.dimension >= 0 && pair.dimension <= 2);
  const { minimum, numericMaximum, infinityLevel, axisMaximum } = diagramBounds(visiblePairs);
  const numericTicks = Array.from(
    { length: 5 },
    (_, index) => minimum + ((numericMaximum - minimum) * index) / 4,
  );
  const data = DIMENSIONS.map(({ dimension, label, color }): Partial<PlotData> => {
    const dimensionPairs = visiblePairs.filter((pair) => pair.dimension === dimension);
    return {
      type: 'scatter',
      mode: 'markers',
      name: label,
      x: dimensionPairs.map((pair) => pair.birth),
      y: dimensionPairs.map((pair) => pair.death === 'infinity' ? infinityLevel ?? axisMaximum : pair.death),
      customdata: dimensionPairs.map((pair) => [
        pair.death === 'infinity' ? '∞' : String(pair.death),
        pair.lifetime === 'infinity' ? '∞' : String(pair.lifetime),
      ]),
      marker: {
        color,
        size: dimensionPairs.map((pair) => pair.death === 'infinity' ? 10 : 8),
        symbol: dimensionPairs.map((pair) => pair.death === 'infinity' ? 'diamond' : 'circle'),
        opacity: dimensionPairs.map((pair) => options.playhead === undefined
          || (pair.birth <= options.playhead && (pair.death === 'infinity' || options.playhead < pair.death)) ? 1 : 0.22),
        line: { color: '#17313a', width: 0.8 },
      },
      hovertemplate: `<b>${label}</b><br>birth %{x:.4g}<br>death %{customdata[0]}<br>lifetime %{customdata[1]}<extra></extra>`,
      showlegend: false,
      cliponaxis: false,
    };
  });

  const axisStyle = {
    range: [minimum, axisMaximum] as [number, number],
    fixedrange: false,
    automargin: true,
    showgrid: true,
    gridcolor: '#e1e9e9',
    gridwidth: 1,
    zeroline: false,
    showline: true,
    linecolor: '#9fb2b6',
    linewidth: 1,
    mirror: true,
    ticks: 'outside' as const,
    tickcolor: '#9fb2b6',
    tickfont: { family: 'IBM Plex Mono, monospace', size: 10, color: '#71858b' },
    title: { standoff: 10, font: { family: 'IBM Plex Mono, monospace', size: 11, color: '#526971' } },
  };

  return {
    data,
    layout: {
      autosize: true,
      height: 410,
      margin: { l: 62, r: 30, t: 48, b: 58 },
      paper_bgcolor: '#ffffff',
      plot_bgcolor: '#ffffff',
      hovermode: 'closest',
      hoverlabel: {
        bgcolor: '#17313a',
        bordercolor: '#17313a',
        font: { family: 'IBM Plex Mono, monospace', size: 11, color: '#eefaff' },
      },
      showlegend: false,
      dragmode: 'zoom',
      uirevision: `persistence-diagram:${minimum}:${axisMaximum}`,
      xaxis: {
        ...axisStyle,
        title: { ...axisStyle.title, text: 'birth' },
        tickmode: 'array',
        tickvals: numericTicks,
        ticktext: numericTicks.map(formatTick),
        constrain: 'domain',
      },
      yaxis: {
        ...axisStyle,
        title: { ...axisStyle.title, text: 'death' },
        tickmode: 'array',
        tickvals: infinityLevel === null ? numericTicks : [...numericTicks, infinityLevel],
        ticktext: infinityLevel === null
          ? numericTicks.map(formatTick)
          : [...numericTicks.map(formatTick), '∞'],
        scaleanchor: 'x',
        scaleratio: 1,
      },
      shapes: diagramShapes(minimum, numericMaximum, axisMaximum, infinityLevel, options.playhead),
      annotations: visiblePairs.length === 0 ? [{
        text: 'Run a computation to see the persistence diagram.',
        x: 0.5,
        y: 0.5,
        xref: 'paper',
        yref: 'paper',
        showarrow: false,
        font: { family: 'IBM Plex Mono, monospace', size: 11, color: '#71858b' },
      }] : [],
    },
    config: {
      responsive: true,
      displaylogo: false,
      displayModeBar: true,
      modeBarButtonsToRemove: [
        'zoom2d',
        'pan2d',
        'select2d',
        'lasso2d',
        'zoomIn2d',
        'zoomOut2d',
        'autoScale2d',
        'toggleSpikelines',
        'hoverClosestCartesian',
        'hoverCompareCartesian',
      ],
      scrollZoom: false,
      doubleClick: 'reset',
      toImageButtonOptions: { filename: 'persistence-diagram', format: 'svg' },
    },
  };
}

type PlotlyApi = typeof import('plotly.js');

interface DiagramRenderState {
  disposed: boolean;
  rendering: boolean;
  signature: string;
  pending?: PersistenceDiagramFigure;
}

let loadedPlotly: PlotlyApi | undefined;
let plotlyPromise: Promise<PlotlyApi> | undefined;
const renderStates = new WeakMap<HTMLElement, DiagramRenderState>();

function loadPlotly(): Promise<PlotlyApi> {
  plotlyPromise ??= import('plotly.js-basic-dist-min').then((module) => {
    loadedPlotly = module.default;
    return module.default;
  });
  return plotlyPromise;
}

async function flushDiagramRender(container: HTMLElement, state: DiagramRenderState): Promise<void> {
  state.rendering = true;
  const Plotly = await loadPlotly();
  while (!state.disposed && state.pending) {
    const figure = state.pending;
    state.pending = undefined;
    await Plotly.react(container, figure.data, figure.layout, figure.config);
  }
  state.rendering = false;
}

export function renderPersistenceDiagram(
  container: HTMLElement,
  pairs: SerializablePair[],
  options: PersistenceDiagramOptions = {},
): void {
  const signature = JSON.stringify([pairs, options]);
  let state = renderStates.get(container);
  if (!state || state.disposed) {
    state = { disposed: false, rendering: false, signature: '' };
    renderStates.set(container, state);
  }
  if (state.signature === signature) return;
  state.signature = signature;
  state.pending = buildPersistenceDiagram(pairs, options);
  if (!state.rendering) void flushDiagramRender(container, state);
}

export function unmountPersistenceDiagram(container: HTMLElement): void {
  const state = renderStates.get(container);
  if (state) {
    state.disposed = true;
    state.pending = undefined;
    renderStates.delete(container);
  }
  loadedPlotly?.purge(container);
}
