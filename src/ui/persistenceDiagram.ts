import type { Config, Data, Layout, PlotData, PlotHoverEvent, PlotlyHTMLElement, PlotMouseEvent, Shape } from 'plotly.js';
import type { SerializablePair } from '../tda/types';
import { diagramPointForPair, INTERVAL_DIMENSIONS, pairIdFromHoverPoint, visibleDiagramPairs } from './intervalLink';

export interface PersistenceDiagramOptions {
  playhead?: number;
}

export interface PersistenceDiagramFigure {
  data: Array<Partial<PlotData>>;
  layout: Partial<Layout>;
  config: Partial<Config>;
}


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
  const visiblePairs = visibleDiagramPairs(pairs);
  const { minimum, numericMaximum, infinityLevel, axisMaximum } = diagramBounds(visiblePairs);
  const numericTicks = Array.from(
    { length: 5 },
    (_, index) => minimum + ((numericMaximum - minimum) * index) / 4,
  );
  const data = INTERVAL_DIMENSIONS.map(({ dimension, label, color }): Partial<PlotData> => {
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
        pair.id,
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
    // Fixed margins: with automargin the left margin grows after the first draw, which re-derives the equal-scale ranges once.
    automargin: false,
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
      margin: { l: 76, r: 30, t: 48, b: 58 },
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
        // Keep equal scales by shrinking the plot area, never by stretching a range: the ranges stay exactly as declared.
        constrain: 'domain',
      },
      shapes: diagramShapes(minimum, numericMaximum, axisMaximum, infinityLevel, options.playhead),
      annotations: visiblePairs.length === 0 ? [{
        // Two short lines: one long line ran past a phone-width plot onto the tick labels.
        text: 'Run a computation<br>to see the diagram.',
        x: 0.5,
        y: 0.5,
        xref: 'paper',
        yref: 'paper',
        showarrow: false,
        font: { family: 'IBM Plex Mono, monospace', size: 11, color: '#71858b' },
        bgcolor: 'rgba(255, 255, 255, .9)',
        borderpad: 4,
      }] : [],
    },
    config: {
      responsive: true,
      displaylogo: false,
      displayModeBar: true,
      // Plotly 4 adds a "Share chart..." button that uploads the chart to Plotly Cloud; this page never uploads.
      showSendToCloud: false,
      modeBarButtonsToRemove: [
        'sendChartToCloud',
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

type PlotlyGraph = PlotlyHTMLElement & {
  removeListener?(event: 'plotly_hover', callback: (event: PlotHoverEvent) => void): void;
  removeListener?(event: 'plotly_unhover', callback: (event: PlotMouseEvent) => void): void;
};

interface PlotlyFx {
  hover(root: HTMLElement, points: Array<{ curveNumber: number; pointNumber: number }>): void;
  unhover(root: HTMLElement): void;
}

interface DiagramRenderState {
  disposed: boolean;
  rendering: boolean;
  signature: string;
  pending?: PersistenceDiagramFigure;
  pairs: SerializablePair[];
  emphasizedId: string | null;
  emphasisGeneration: number;
  hoverBound: boolean;
  removeHover?: () => void;
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

const hoverHandlers = new WeakMap<HTMLElement, (id: string | null) => void>();

function bindDiagramHover(container: HTMLElement, state: DiagramRenderState): void {
  if (state.hoverBound) return;
  const graph = container as PlotlyGraph;
  if (typeof graph.on !== 'function') return;
  const onHover = (event: PlotHoverEvent) => {
    hoverHandlers.get(container)?.(pairIdFromHoverPoint(event.points[0]));
  };
  const onUnhover = () => {
    hoverHandlers.get(container)?.(null);
  };
  graph.on('plotly_hover', onHover);
  graph.on('plotly_unhover', onUnhover);
  state.hoverBound = true;
  state.removeHover = () => {
    graph.removeListener?.('plotly_hover', onHover);
    graph.removeListener?.('plotly_unhover', onUnhover);
  };
}

function markerEmphasis(pairs: readonly SerializablePair[], id: string | null): { sizes: number[][]; widths: number[][] } {
  const visible = visibleDiagramPairs(pairs);
  const sizes: number[][] = [];
  const widths: number[][] = [];
  for (const { dimension } of INTERVAL_DIMENSIONS) {
    const group = visible.filter((pair) => pair.dimension === dimension);
    sizes.push(group.map((pair) => {
      const base = pair.death === 'infinity' ? 10 : 8;
      return pair.id === id ? base + 6 : base;
    }));
    widths.push(group.map((pair) => pair.id === id ? 2.8 : 0.8));
  }
  return { sizes, widths };
}

const emphasisTails = new WeakMap<HTMLElement, Promise<void>>();

function enqueueEmphasis(container: HTMLElement, state: DiagramRenderState): void {
  const generation = state.emphasisGeneration;
  const previous = emphasisTails.get(container) ?? Promise.resolve();
  const next = previous
    .then(() => applyEmphasis(container, state, generation))
    .catch(() => {
      // A purged plot rejects the restyle; the next hover starts a new one.
    });
  emphasisTails.set(container, next);
}

async function applyEmphasis(container: HTMLElement, state: DiagramRenderState, generation: number): Promise<void> {
  const Plotly = loadedPlotly;
  if (state.disposed || state.rendering || state.emphasisGeneration !== generation || !Plotly) return;
  const id = state.emphasizedId;
  const { sizes, widths } = markerEmphasis(state.pairs, id);
  await Plotly.restyle(container, {
    'marker.size': sizes,
    'marker.line.width': widths,
  } as Data);
  if (state.disposed || state.emphasisGeneration !== generation || state.rendering) return;
  const fx = (Plotly as PlotlyApi & { Fx?: PlotlyFx }).Fx;
  if (!fx) return;
  if (id) {
    const point = diagramPointForPair(state.pairs, id);
    if (point) fx.hover(container, [point]);
  } else {
    fx.unhover(container);
  }
}

async function flushDiagramRender(container: HTMLElement, state: DiagramRenderState): Promise<void> {
  state.rendering = true;
  state.emphasisGeneration += 1;
  const Plotly = await loadPlotly();
  while (!state.disposed && state.pending) {
    const figure = state.pending;
    state.pending = undefined;
    await Plotly.react(container, figure.data, figure.layout, figure.config);
    bindDiagramHover(container, state);
  }
  state.rendering = false;
  if (!state.disposed && state.emphasizedId) enqueueEmphasis(container, state);
}

export function renderPersistenceDiagram(
  container: HTMLElement,
  pairs: SerializablePair[],
  options: PersistenceDiagramOptions = {},
): void {
  const signature = JSON.stringify([pairs, options]);
  let state = renderStates.get(container);
  if (!state || state.disposed) {
    state = {
      disposed: false,
      rendering: false,
      signature: '',
      pairs: [],
      emphasizedId: null,
      emphasisGeneration: 0,
      hoverBound: false,
    };
    renderStates.set(container, state);
  }
  state.pairs = pairs;
  if (state.signature === signature) return;
  state.signature = signature;
  state.pending = buildPersistenceDiagram(pairs, options);
  if (!state.rendering) void flushDiagramRender(container, state);
}

export function onPersistenceDiagramHover(container: HTMLElement, handler: (id: string | null) => void): void {
  hoverHandlers.set(container, handler);
}

/** Enlarge one diagram point and show its existing Plotly tooltip. `null` restores the markers. */
export function emphasizeDiagramPair(container: HTMLElement, pairs: SerializablePair[], id: string | null): void {
  const state = renderStates.get(container);
  if (!state || state.disposed) return;
  state.pairs = pairs;
  state.emphasizedId = id;
  state.emphasisGeneration += 1;
  if (!state.rendering) enqueueEmphasis(container, state);
}

/** Drop a barcode-driven tooltip clear that has not landed yet, without scheduling another. */
export function cancelPendingDiagramEmphasis(container: HTMLElement): void {
  const state = renderStates.get(container);
  if (!state || state.disposed) return;
  state.emphasisGeneration += 1;
  state.emphasizedId = null;
}

export function unmountPersistenceDiagram(container: HTMLElement): void {
  const state = renderStates.get(container);
  if (state) {
    state.disposed = true;
    state.pending = undefined;
    state.emphasisGeneration += 1;
    state.removeHover?.();
    renderStates.delete(container);
  }
  hoverHandlers.delete(container);
  loadedPlotly?.purge(container);
}
