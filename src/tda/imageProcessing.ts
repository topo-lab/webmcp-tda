import type { ScalarImage } from './types';

export type ForegroundPolarity = 'dark' | 'light';

const GAUSSIAN_KERNEL = [1, 4, 6, 4, 1] as const;
const GAUSSIAN_WEIGHT = 16;

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Otsu's method: choose the gray-level split with the greatest between-class
 * variance. This is equivalent to minimizing weighted within-class variance.
 */
export function otsuThreshold(values: readonly number[]): number {
  if (values.length === 0) return 127;

  const histogram = new Uint32Array(256);
  let totalIntensity = 0;
  for (const value of values) {
    const shade = clampByte(value);
    histogram[shade] = (histogram[shade] ?? 0) + 1;
    totalIntensity += shade;
  }

  let backgroundWeight = 0;
  let backgroundIntensity = 0;
  let bestThreshold = 0;
  let bestVariance = -1;

  for (let threshold = 0; threshold < 256; threshold += 1) {
    backgroundWeight += histogram[threshold]!;
    if (backgroundWeight === 0) continue;

    const foregroundWeight = values.length - backgroundWeight;
    if (foregroundWeight === 0) break;

    backgroundIntensity += threshold * histogram[threshold]!;
    const backgroundMean = backgroundIntensity / backgroundWeight;
    const foregroundMean = (totalIntensity - backgroundIntensity) / foregroundWeight;
    const meanGap = backgroundMean - foregroundMean;
    const betweenClassVariance = backgroundWeight * foregroundWeight * meanGap * meanGap;

    if (betweenClassVariance > bestVariance) {
      bestVariance = betweenClassVariance;
      bestThreshold = threshold;
    }
  }

  return bestThreshold;
}

/** A small separable Gaussian blur used to suppress photo texture before thresholding. */
export function gaussianBlurImage(image: ScalarImage): ScalarImage {
  const horizontal = new Float64Array(image.values.length);
  const blurred = new Array<number>(image.values.length);
  const sample = (values: ArrayLike<number>, x: number, y: number) =>
    values[Math.max(0, Math.min(image.height - 1, y)) * image.width + Math.max(0, Math.min(image.width - 1, x))] ?? 0;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      let weighted = 0;
      for (let offset = -2; offset <= 2; offset += 1) {
        weighted += sample(image.values, x + offset, y) * GAUSSIAN_KERNEL[offset + 2]!;
      }
      horizontal[y * image.width + x] = weighted / GAUSSIAN_WEIGHT;
    }
  }

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      let weighted = 0;
      for (let offset = -2; offset <= 2; offset += 1) {
        weighted += sample(horizontal, x, y + offset) * GAUSSIAN_KERNEL[offset + 2]!;
      }
      blurred[y * image.width + x] = weighted / GAUSSIAN_WEIGHT;
    }
  }

  return { ...image, values: blurred };
}

export function binarizeValues(
  values: readonly number[],
  threshold: number,
  foreground: ForegroundPolarity = 'dark',
): number[] {
  const split = clampByte(threshold);
  return values.map((value) => {
    const shade = clampByte(value);
    const belongsToObject = foreground === 'dark' ? shade <= split : shade > split;
    return belongsToObject ? 0 : 255;
  });
}

export interface BinarizedImage {
  image: ScalarImage;
  threshold: number;
}

export function binarizeImage(
  image: ScalarImage,
  threshold: number | undefined,
  foreground: ForegroundPolarity = 'dark',
): BinarizedImage {
  const resolvedThreshold = threshold === undefined ? otsuThreshold(image.values) : clampByte(threshold);
  return {
    threshold: resolvedThreshold,
    image: {
      ...image,
      name: `${image.name} · binary`,
      values: binarizeValues(image.values, resolvedThreshold, foreground),
    },
  };
}

function morphDarkForeground(image: ScalarImage, operation: 'dilate' | 'erode'): ScalarImage {
  const values = new Array<number>(image.values.length);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      let darkCount = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const sampleX = x + offsetX;
          const sampleY = y + offsetY;
          if (
            sampleX >= 0 && sampleX < image.width
            && sampleY >= 0 && sampleY < image.height
            && image.values[sampleY * image.width + sampleX] === 0
          ) {
            darkCount += 1;
          }
        }
      }
      values[y * image.width + x] = operation === 'dilate'
        ? (darkCount > 0 ? 0 : 255)
        : (darkCount === 9 ? 0 : 255);
    }
  }
  return { ...image, values };
}

/** Fill small background holes in a binary image while preserving large loops. */
export function closeBinaryImage(image: ScalarImage, iterations = 5): ScalarImage {
  let result = image;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    result = morphDarkForeground(result, 'dilate');
  }
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    result = morphDarkForeground(result, 'erode');
  }
  return result;
}
