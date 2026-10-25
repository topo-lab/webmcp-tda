/**
 * Small, deliberately slow F₂ boundary-matrix oracle, independent of the WASM
 * engine's cohomology and primal/dual union-find implementations. Faces must
 * precede cofaces at equal values. Zero-length intervals are omitted.
 * Cubical boundary convention: https://gudhi.inria.fr/python/latest/cubical_complex_user.html
 */
export interface Cell {
  key: string;
  dimension: number;
  value: number;
  boundary: string[];
}

export type Interval = [dimension: number, birth: number, death: number];

export function canonicalIntervals(pairs: Interval[]): Interval[] {
  return pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
}

export function reduceBoundary(cells: Cell[]): Interval[] {
  const ordered = [...cells].sort((a, b) => a.value - b.value || a.dimension - b.dimension || a.key.localeCompare(b.key));
  const indices = new Map(ordered.map((cell, index) => [cell.key, index]));
  const columns = new Map<number, Set<number>>();
  const births = new Set<number>();
  const deaths = new Set<number>();
  const pairs: Interval[] = [];

  ordered.forEach((cell, columnIndex) => {
    const column = new Set(cell.boundary.map((key) => {
      const row = indices.get(key);
      if (row === undefined || row >= columnIndex) throw new Error(`Oracle input is not a filtration: ${cell.key} -> ${key}`);
      return row;
    }));
    while (column.size > 0) {
      const pivot = Math.max(...column);
      const previous = columns.get(pivot);
      if (!previous) break;
      for (const row of previous) {
        if (column.has(row)) column.delete(row);
        else column.add(row);
      }
    }
    if (column.size === 0) births.add(columnIndex);
    else {
      const pivot = Math.max(...column);
      columns.set(pivot, column);
      deaths.add(pivot);
      const born = ordered[pivot]!;
      if (born.value < cell.value) pairs.push([born.dimension, born.value, cell.value]);
    }
  });
  for (const index of births) {
    if (!deaths.has(index)) {
      const born = ordered[index]!;
      pairs.push([born.dimension, born.value, Infinity]);
    }
  }
  return canonicalIntervals(pairs);
}

export function vertexGridOracle(values: number[], width: number, height: number): Interval[] {
  const cells: Cell[] = [];
  const vertex = (x: number, y: number) => `v:${x},${y}`;
  const horizontal = (x: number, y: number) => `h:${x},${y}`;
  const vertical = (x: number, y: number) => `e:${x},${y}`;
  const shade = (x: number, y: number) => values[y * width + x]!;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells.push({ key: vertex(x, y), dimension: 0, value: shade(x, y), boundary: [] });
      if (x + 1 < width) cells.push({
        key: horizontal(x, y), dimension: 1,
        value: Math.max(shade(x, y), shade(x + 1, y)),
        boundary: [vertex(x, y), vertex(x + 1, y)],
      });
      if (y + 1 < height) cells.push({
        key: vertical(x, y), dimension: 1,
        value: Math.max(shade(x, y), shade(x, y + 1)),
        boundary: [vertex(x, y), vertex(x, y + 1)],
      });
      if (x + 1 < width && y + 1 < height) cells.push({
        key: `q:${x},${y}`, dimension: 2,
        value: Math.max(shade(x, y), shade(x + 1, y), shade(x, y + 1), shade(x + 1, y + 1)),
        boundary: [horizontal(x, y), horizontal(x, y + 1), vertical(x, y), vertical(x + 1, y)],
      });
    }
  }
  return reduceBoundary(cells);
}

export function ripsOracle(points: number[][], cutoff: number, maxDimension: number): Interval[] {
  const cells: Cell[] = [];
  // Exhaustive subset enumeration, unlike the engine's graph expansion.
  for (let mask = 1; mask < 2 ** points.length; mask++) {
    const vertices = points.map((_, i) => i).filter((i) => mask & (1 << i));
    if (vertices.length > maxDimension + 1) continue;
    let diameter = 0;
    for (const a of vertices) for (const b of vertices) {
      diameter = Math.max(diameter, Math.hypot(...points[a]!.map((v, k) => v - points[b]![k]!)));
    }
    if (diameter > cutoff) continue;
    cells.push({
      key: vertices.join(','), dimension: vertices.length - 1, value: diameter,
      boundary: vertices.length === 1 ? [] : vertices.map((_, i) => vertices.filter((__, j) => i !== j).join(',')),
    });
  }
  return reduceBoundary(cells);
}
