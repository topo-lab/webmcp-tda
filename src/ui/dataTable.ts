import type { SerializablePair } from '../tda/types';
import { visibleDiagramPairs } from './intervalLink';

export const DATA_TABLE_ROW_LIMIT = 50;

function lifetimeRank(pair: SerializablePair): number {
  if (pair.lifetime === 'infinity' || pair.death === 'infinity') return Number.POSITIVE_INFINITY;
  return pair.lifetime;
}

/** Most persistent intervals first. Essential classes (infinite lifetime) sort ahead of finite ones. */
export function mostPersistentPairs(pairs: readonly SerializablePair[], limit = DATA_TABLE_ROW_LIMIT): SerializablePair[] {
  return [...visibleDiagramPairs(pairs)]
    .sort((left, right) => {
      const byLife = lifetimeRank(right) - lifetimeRank(left);
      if (byLife !== 0) return byLife;
      if (left.dimension !== right.dimension) return left.dimension - right.dimension;
      if (left.birth !== right.birth) return left.birth - right.birth;
      return left.id.localeCompare(right.id);
    })
    .slice(0, limit);
}

function formatValue(value: number | 'infinity'): string {
  if (value === 'infinity') return '∞';
  if (Math.abs(value) < 1e-8) return '0';
  const absolute = Math.abs(value);
  if (absolute >= 10_000 || absolute < 0.001) return value.toExponential(2);
  return String(Number(value.toPrecision(4)));
}

function cell(text: string, header = false): HTMLTableCellElement {
  const element = document.createElement(header ? 'th' : 'td');
  if (header) element.scope = 'col';
  element.textContent = text;
  return element;
}

export function renderPairTable(table: HTMLTableElement, pairs: readonly SerializablePair[], title: string): void {
  const visible = visibleDiagramPairs(pairs);
  const shown = mostPersistentPairs(pairs);
  const caption = document.createElement('caption');
  caption.textContent = visible.length === 0
    ? `${title}. No intervals yet.`
    : visible.length > shown.length
      ? `${title}. Showing the ${shown.length} most persistent of ${visible.length} intervals.`
      : `${title}. ${visible.length} interval${visible.length === 1 ? '' : 's'}.`;
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const label of ['Dimension', 'Birth', 'Death', 'Lifetime']) headRow.append(cell(label, true));
  head.append(headRow);
  const body = document.createElement('tbody');
  for (const pair of shown) {
    const row = document.createElement('tr');
    row.append(
      cell(`H${pair.dimension}`),
      cell(formatValue(pair.birth)),
      cell(formatValue(pair.death)),
      cell(formatValue(pair.lifetime)),
    );
    body.append(row);
  }
  table.replaceChildren(caption, head, body);
}

export function renderPointTable(table: HTMLTableElement, points: readonly number[][]): void {
  const shown = points.slice(0, DATA_TABLE_ROW_LIMIT);
  const dimension = points[0]?.length ?? 0;
  const caption = document.createElement('caption');
  caption.textContent = points.length === 0
    ? 'Point coordinates. No points yet.'
    : points.length > shown.length
      ? `Point coordinates. Showing the first ${shown.length} of ${points.length} points.`
      : `Point coordinates. ${points.length} point${points.length === 1 ? '' : 's'}.`;
  const headers = dimension >= 3 ? ['Point', 'x', 'y', 'z'] : ['Point', 'x', 'y'];
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const label of headers) headRow.append(cell(label, true));
  head.append(headRow);
  const body = document.createElement('tbody');
  shown.forEach((point, index) => {
    const row = document.createElement('tr');
    row.append(cell(String(index + 1)), cell(formatValue(point[0] ?? 0)), cell(formatValue(point[1] ?? 0)));
    if (dimension >= 3) row.append(cell(formatValue(point[2] ?? 0)));
    body.append(row);
  });
  table.replaceChildren(caption, head, body);
}
