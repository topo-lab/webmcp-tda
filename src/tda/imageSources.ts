import type { ImageSampleId, ScalarImage } from './types';

export interface LoadedImage {
  image: ScalarImage;
  rgba: Uint8ClampedArray;
}

export interface ImageSampleDescriptor {
  label: string;
  name: string;
  url: string;
}

export const IMAGE_SAMPLES: Record<ImageSampleId, ImageSampleDescriptor> = {
  donut: {
    label: 'Chocolate doughnut',
    name: 'chocolate-doughnut',
    url: '/samples/donut.jpg',
  },
  pretzel: {
    label: 'Soft pretzel',
    name: 'soft-pretzel',
    url: '/samples/pretzel.jpg',
  },
  glasses: {
    label: 'Eyeglasses',
    name: 'eyeglasses',
    url: '/samples/glasses.jpg',
  },
};

export async function loadImageSource(source: Blob | string, name: string, signal?: AbortSignal): Promise<LoadedImage> {
  const blob = typeof source === 'string' ? await fetch(source, { signal }).then((response) => {
    if (!response.ok) throw new Error(`Could not load ${name}.`);
    return response.blob();
  }) : source;
  if (signal?.aborted) throw new DOMException('The image load was cancelled.', 'AbortError');
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(2, Math.round(bitmap.width * scale));
  const height = Math.max(2, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is unavailable.');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const rgba = context.getImageData(0, 0, width, height).data;
  const values: number[] = [];
  for (let index = 0; index < rgba.length; index += 4) {
    values.push(0.2126 * rgba[index]! + 0.7152 * rgba[index + 1]! + 0.0722 * rgba[index + 2]!);
  }
  return {
    image: { name, width, height, values },
    rgba: new Uint8ClampedArray(rgba),
  };
}

export function loadImageSample(id: ImageSampleId, signal?: AbortSignal): Promise<LoadedImage> {
  const sample = IMAGE_SAMPLES[id];
  return loadImageSource(sample.url, sample.name, signal);
}
