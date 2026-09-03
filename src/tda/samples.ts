import type { ImageSampleId, ScalarImage } from './types';

export function circlePoints(count = 32): number[][] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return [Math.cos(angle), Math.sin(angle)];
  });
}

function makeImage(id: ImageSampleId, size = 64): ScalarImage {
  const values: number[] = [];
  const center = (size - 1) / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const radius = Math.hypot(dx, dy);
      let value = 245;
      if (id === 'ring') {
        value = Math.abs(radius - size * 0.28) < size * 0.055 ? 18 : 245;
      } else if (id === 'two-rings') {
        const left = Math.hypot(x - size * 0.32, y - center);
        const right = Math.hypot(x - size * 0.68, y - center);
        value = Math.min(Math.abs(left - size * 0.17), Math.abs(right - size * 0.17)) < size * 0.04 ? 18 : 245;
      } else {
        const left = Math.hypot(x - size * 0.33, y - center);
        const right = Math.hypot(x - size * 0.67, y - center);
        value = left < size * 0.16 || right < size * 0.16 ? 25 : 245;
      }
      values.push(value);
    }
  }
  return { name: id, width: size, height: size, values };
}

export function imageSample(id: ImageSampleId): ScalarImage {
  return makeImage(id);
}
