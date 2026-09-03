import { describe, expect, it } from 'vitest';
import { binarizeImage, binarizeValues, closeBinaryImage, gaussianBlurImage, otsuThreshold } from '../src/tda/imageProcessing';

describe('image binarization', () => {
  it('finds the valley between two separated intensity groups', () => {
    const threshold = otsuThreshold([10, 10, 12, 12, 220, 220, 224, 224]);
    expect(threshold).toBeGreaterThanOrEqual(12);
    expect(threshold).toBeLessThan(220);
  });

  it('maps the selected foreground to the first filtration level', () => {
    expect(binarizeValues([20, 230], 100, 'dark')).toEqual([0, 255]);
    expect(binarizeValues([20, 230], 100, 'light')).toEqual([255, 0]);
  });

  it('preserves image dimensions and reports the applied threshold', () => {
    const result = binarizeImage({ name: 'sample', width: 2, height: 2, values: [0, 10, 240, 255] }, 100);
    expect(result.threshold).toBe(100);
    expect(result.image).toMatchObject({ width: 2, height: 2, values: [0, 0, 255, 255] });
  });

  it('preserves a constant image while applying the denoise kernel', () => {
    const image = { name: 'flat', width: 3, height: 3, values: Array<number>(9).fill(42) };
    expect(gaussianBlurImage(image)).toEqual(image);
  });

  it('closes a small background hole in a dark foreground mask', () => {
    const values = Array<number>(49).fill(0);
    values[3 * 7 + 3] = 255;
    const closed = closeBinaryImage({ name: 'mask', width: 7, height: 7, values }, 1);
    expect(closed.values[3 * 7 + 3]).toBe(0);
  });
});
