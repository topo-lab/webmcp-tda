import type { SerializablePair } from '../tda/types';
import { INTERVAL_DIMENSIONS, visibleDiagramPairs } from './intervalLink';

export interface BarcodeInterval {
  id: string;
  dimension: 0 | 1 | 2;
  birth: number;
  death: number | 'infinity';
  /** Left edge, 0–100 across the finite scale. */
  xPercent: number;
  /** Width, 0–100. An essential interval runs to the right edge and is not given a fake death. */
  widthPercent: number;
  essential: boolean;
  /** False when a playhead is before birth or at/after a finite death. */
  active: boolean;
  label: string;
}

export interface BarcodeBand {
  dimension: 0 | 1 | 2;
  label: 'H₀' | 'H₁' | 'H₂';
  color: string;
  intervals: BarcodeInterval[];
}

export interface BarcodeFigure {
  bands: BarcodeBand[];
  minimum: number;
  maximum: number;
  ticks: number[];
  playheadPercent: number | null;
  empty: boolean;
}

export interface BarcodeOptions {
  playhead?: number;
  highlightedId?: string | null;
}

function formatFiltration(value: number): string {
  if (Math.abs(value) < 1e-8) return '0';
  const absolute = Math.abs(value);
  if (absolute >= 10_000 || absolute < 0.001) return value.toExponential(2);
  return String(Number(value.toPrecision(4)));
}

function scaleBounds(pairs: readonly SerializablePair[], playhead?: number): { minimum: number; maximum: number } {
  const finite = pairs.flatMap((pair) => [pair.birth, pair.death === 'infinity' ? pair.birth : pair.death]);
  let minimum = finite.length === 0 ? 0 : Math.min(0, ...finite);
  let maximum = finite.length === 0 ? 1 : Math.max(...finite);
  if (playhead !== undefined && Number.isFinite(playhead)) maximum = Math.max(maximum, playhead);
  if (!(maximum > minimum)) maximum = minimum + 1;
  return { minimum, maximum };
}

function intervalActive(pair: SerializablePair, playhead: number | undefined): boolean {
  if (playhead === undefined) return true;
  return pair.birth <= playhead && (pair.death === 'infinity' || playhead < pair.death);
}

export function buildBarcode(pairs: readonly SerializablePair[], options: BarcodeOptions = {}): BarcodeFigure {
  const visible = visibleDiagramPairs(pairs);
  const { minimum, maximum } = scaleBounds(visible, options.playhead);
  const span = maximum - minimum;
  const percent = (value: number) => ((value - minimum) / span) * 100;
  const bands = INTERVAL_DIMENSIONS.map((dimension) => {
    const intervals = visible
      .filter((pair) => pair.dimension === dimension.dimension)
      .map((pair) => {
        const essential = pair.death === 'infinity';
        const xPercent = percent(pair.birth);
        const end = pair.death === 'infinity' ? 100 : percent(pair.death);
        return {
          id: pair.id,
          dimension: dimension.dimension,
          birth: pair.birth,
          death: pair.death,
          xPercent,
          widthPercent: Math.max(0, end - xPercent),
          essential,
          active: intervalActive(pair, options.playhead),
          label: `H${dimension.dimension}, birth ${formatFiltration(pair.birth)}, death ${pair.death === 'infinity' ? 'infinity' : formatFiltration(pair.death)}`,
        };
      })
      .sort((left, right) => left.birth - right.birth
        || (left.death === 'infinity' ? Number.POSITIVE_INFINITY : left.death) - (right.death === 'infinity' ? Number.POSITIVE_INFINITY : right.death)
        || left.id.localeCompare(right.id));
    return { ...dimension, intervals };
  }).filter((band) => band.intervals.length > 0);

  const playheadPercent = options.playhead === undefined || !Number.isFinite(options.playhead)
    ? null
    : Math.max(0, Math.min(100, percent(options.playhead)));
  const ticks = [minimum, minimum + span / 2, maximum];
  return {
    bands,
    minimum,
    maximum,
    ticks,
    playheadPercent,
    empty: bands.length === 0,
  };
}

function percentText(value: number): string {
  return `${Number(value.toFixed(4))}%`;
}

function playheadNode(percent: number | null): HTMLSpanElement | null {
  if (percent === null) return null;
  const node = document.createElement('span');
  node.className = 'barcode-playhead';
  node.style.left = percentText(percent);
  return node;
}

interface BarcodeRenderState {
  pairs: readonly SerializablePair[] | null;
  playhead: number | undefined;
}

const renderStates = new WeakMap<HTMLElement, BarcodeRenderState>();

export function setBarcodeHighlight(container: HTMLElement, id: string | null): void {
  container.dataset.hasHighlight = id ? 'true' : 'false';
  container.querySelectorAll<HTMLElement>('[data-pair-id]').forEach((bar) => {
    if (bar.dataset.pairId === id) bar.dataset.highlighted = 'true';
    else delete bar.dataset.highlighted;
  });
}

export function renderBarcode(container: HTMLElement, pairs: readonly SerializablePair[], options: BarcodeOptions = {}): void {
  let state = renderStates.get(container);
  if (!state) {
    state = { pairs: null, playhead: undefined };
    renderStates.set(container, state);
  }
  const highlightedId = options.highlightedId ?? null;
  if (state.pairs === pairs && state.playhead === options.playhead && container.childElementCount > 0) {
    setBarcodeHighlight(container, highlightedId);
    return;
  }
  state.pairs = pairs;
  state.playhead = options.playhead;
  const figure = buildBarcode(pairs, options);
  if (figure.empty) {
    container.dataset.empty = 'true';
    container.dataset.hasHighlight = 'false';
    const empty = document.createElement('p');
    empty.className = 'barcode-empty';
    empty.textContent = 'No intervals to show.';
    container.replaceChildren(empty);
    return;
  }
  container.dataset.empty = 'false';
  const scroll = document.createElement('div');
  scroll.className = 'barcode-scroll';
  scroll.tabIndex = 0;
  scroll.setAttribute('role', 'region');
  scroll.setAttribute('aria-label', 'Persistence barcode intervals');
  for (const band of figure.bands) {
    const bandEl = document.createElement('div');
    bandEl.className = 'barcode-band';
    const label = document.createElement('span');
    label.className = 'barcode-band-label';
    label.textContent = band.label;
    const lanes = document.createElement('div');
    lanes.className = 'barcode-lanes';
    for (const interval of band.intervals) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'barcode-interval';
      button.dataset.pairId = interval.id;
      button.dataset.dimension = String(interval.dimension);
      button.dataset.essential = interval.essential ? 'true' : 'false';
      button.dataset.active = interval.active ? 'true' : 'false';
      button.setAttribute('aria-label', interval.label);
      button.style.setProperty('--x', percentText(interval.xPercent));
      button.style.setProperty('--w', percentText(interval.widthPercent));
      const bar = document.createElement('span');
      bar.className = 'barcode-interval-bar';
      bar.style.background = band.color;
      button.append(bar);
      if (interval.essential) {
        const essential = document.createElement('span');
        essential.className = 'barcode-essential';
        essential.setAttribute('aria-hidden', 'true');
        essential.textContent = '∞';
        button.append(essential);
      }
      lanes.append(button);
    }
    const bandPlayhead = playheadNode(figure.playheadPercent);
    if (bandPlayhead) lanes.append(bandPlayhead);
    bandEl.append(label, lanes);
    scroll.append(bandEl);
  }
  const axis = document.createElement('div');
  axis.className = 'barcode-axis';
  axis.setAttribute('aria-hidden', 'true');
  const spacer = document.createElement('span');
  spacer.className = 'barcode-axis-spacer';
  const track = document.createElement('div');
  track.className = 'barcode-axis-track';
  for (const tick of figure.ticks) {
    const tickLabel = document.createElement('span');
    tickLabel.textContent = formatFiltration(tick);
    track.append(tickLabel);
  }
  const axisPlayhead = playheadNode(figure.playheadPercent);
  if (axisPlayhead) track.append(axisPlayhead);
  axis.append(spacer, track);
  container.replaceChildren(scroll, axis);
  setBarcodeHighlight(container, highlightedId);
}

export function bindBarcodeHover(container: HTMLElement, onHover: (id: string | null) => void): () => void {
  let current: string | null = null;
  const publish = (id: string | null) => {
    if (id === current) return;
    current = id;
    onHover(id);
  };
  const idFrom = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return null;
    return target.closest<HTMLElement>('[data-pair-id]')?.dataset.pairId ?? null;
  };
  const onPointerOver = (event: PointerEvent) => publish(idFrom(event.target));
  const onPointerLeave = () => {
    if (container.contains(document.activeElement)) return;
    publish(null);
  };
  const onFocusIn = (event: FocusEvent) => publish(idFrom(event.target));
  const onFocusOut = (event: FocusEvent) => {
    const next = event.relatedTarget;
    if (next instanceof Node && container.contains(next)) return;
    publish(null);
  };
  container.addEventListener('pointerover', onPointerOver);
  container.addEventListener('pointerleave', onPointerLeave);
  container.addEventListener('focusin', onFocusIn);
  container.addEventListener('focusout', onFocusOut);
  return () => {
    container.removeEventListener('pointerover', onPointerOver);
    container.removeEventListener('pointerleave', onPointerLeave);
    container.removeEventListener('focusin', onFocusIn);
    container.removeEventListener('focusout', onFocusOut);
  };
}
