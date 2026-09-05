import { describe, expect, it } from 'vitest';
import { binarizeImage, binarizeValues, gaussianBlurImage, otsuThreshold } from '../src/tda/imageProcessing';

const byte = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

// Otsu maximizes between-class variance in production. Independently minimize
// the within-class squared residuals by enumerating every split instead.
function withinClassError(values: number[], threshold: number): number {
  const groups = [values.filter((v) => v <= threshold), values.filter((v) => v > threshold)];
  if (groups.some((group) => group.length === 0)) return Infinity;
  return groups.reduce((total, group) => {
    const mean = group.reduce((sum, v) => sum + v, 0) / group.length;
    return total + group.reduce((sum, v) => sum + (v - mean) ** 2, 0);
  }, 0);
}

describe('image preprocessing mathematical oracles', () => {
  it('selects a global minimum of within-class variance on 80 reproducible histograms', () => {
    let seed = 0x0a57a2026;
    for (let sample = 0; sample < 80; sample++) {
      const values = Array.from({ length: 2 + sample }, () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return ((seed >>> 16) % 301) - 20 + 0.25;
      });
      const shades = values.map(byte);
      if (new Set(shades).size < 2) continue;
      const errors = Array.from({ length: 256 }, (_, split) => withinClassError(shades, split));
      expect(withinClassError(shades, otsuThreshold(values))).toBeCloseTo(Math.min(...errors), 8);
    }
  });

  it('uses the first optimal threshold on a plateau, reports the automatic threshold, and complements polarity at equality', () => {
    expect(otsuThreshold([20, 20, 220, 220])).toBe(20);
    expect(otsuThreshold([])).toBe(127);
    const values = [-4, 19.5, 20, 20.5, 220, 280];
    const dark = binarizeValues(values, 20, 'dark');
    const light = binarizeValues(values, 20, 'light');
    expect(dark).toEqual([0, 0, 0, 255, 255, 255]);
    expect(light).toEqual(dark.map((v) => 255 - v));
    const image = { name: 'histogram', width: 3, height: 2, values };
    const result = binarizeImage(image, undefined);
    expect(result.threshold).toBe(otsuThreshold(values));
    expect(result.image.values).toEqual(binarizeValues(values, result.threshold));
    expect(image.values).toEqual(values);
  });

  it('matches a direct 25-tap 2D convolution, including corner replication and non-square images', () => {
    // Binomial 5x5 mask is the outer product of (1, 4, 6, 4, 1) / 16.
    const kernel = [1, 4, 6, 4, 1];
    for (const [width, height] of [[1, 1], [1, 5], [5, 1], [3, 7], [8, 4]]) {
      const values = Array.from({ length: width! * height! }, (_, i) => (i * 37 + 13) % 256);
      const image = { name: 'grid', width: width!, height: height!, values };
      const expected = values.map((_, i) => {
        const x = i % image.width, y = Math.floor(i / image.width);
        let sum = 0;
        for (let ky = 0; ky < 5; ky++) for (let kx = 0; kx < 5; kx++) {
          const sx = Math.max(0, Math.min(image.width - 1, x + kx - 2));
          const sy = Math.max(0, Math.min(image.height - 1, y + ky - 2));
          sum += values[sy * image.width + sx]! * kernel[kx]! * kernel[ky]! / 256;
        }
        return sum;
      });
      const actual = gaussianBlurImage(image);
      expect(actual.values).toEqual(expected);
      expect(actual.values.every((v) => v >= Math.min(...values) && v <= Math.max(...values))).toBe(true);
      expect(image.values).toEqual(values);
    }
  });

  it('preserves an interior impulse mass and commutes with transposition', () => {
    const width = 9, height = 7;
    const values = Array<number>(width * height).fill(0);
    values[3 * width + 4] = 256;
    const blurred = gaussianBlurImage({ name: 'impulse', width, height, values }).values;
    expect(blurred.reduce((sum, v) => sum + v, 0)).toBe(256);
    expect(blurred[3 * width + 4]).toBe(36);
    const transpose = (v: number[]) => Array.from({ length: v.length }, (_, i) => v[(i % height) * width + Math.floor(i / height)]!);
    const transposed = gaussianBlurImage({ name: 'transpose', width: height, height: width, values: transpose(values) });
    expect(transposed.values).toEqual(transpose(blurred));
  });
});
