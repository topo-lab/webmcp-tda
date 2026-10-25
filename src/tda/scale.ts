export interface PointCloudScale {
  /** Largest pairwise distance. */
  diameter: number;
  /** Longest edge of a minimum spanning tree: the smallest distance at which every point is connected. */
  connectingDistance: number;
}

/**
 * Two numbers that say what scale a point cloud lives at. The Rips and Čech limits default to
 * the diameter so that, unless the caller chooses a limit, nothing is cut off by scale.
 */
export function pointCloudScale(points: readonly (readonly number[])[]): PointCloudScale {
  const count = points.length;
  if (count < 2) return { diameter: 0, connectingDistance: 0 };

  const distance = (a: number, b: number): number => {
    const left = points[a]!;
    const right = points[b]!;
    let sum = 0;
    for (let axis = 0; axis < left.length; axis += 1) {
      const delta = left[axis]! - right[axis]!;
      sum += delta * delta;
    }
    return Math.sqrt(sum);
  };

  let diameter = 0;
  for (let a = 0; a < count; a += 1) {
    for (let b = a + 1; b < count; b += 1) diameter = Math.max(diameter, distance(a, b));
  }

  // Prim's algorithm; only the largest accepted edge matters.
  const reached = new Uint8Array(count);
  const best = new Float64Array(count).fill(Number.POSITIVE_INFINITY);
  best[0] = 0;
  let connectingDistance = 0;
  for (let step = 0; step < count; step += 1) {
    let next = -1;
    for (let index = 0; index < count; index += 1) {
      if (!reached[index] && (next === -1 || best[index]! < best[next]!)) next = index;
    }
    reached[next] = 1;
    connectingDistance = Math.max(connectingDistance, best[next]!);
    for (let index = 0; index < count; index += 1) {
      if (!reached[index]) best[index] = Math.min(best[index]!, distance(next, index));
    }
  }
  return { diameter, connectingDistance };
}

export function formatScale(value: number): string {
  if (value === 0) return '0';
  const absolute = Math.abs(value);
  return absolute >= 1e5 || absolute < 1e-3 ? value.toExponential(3) : String(Number(value.toPrecision(4)));
}
