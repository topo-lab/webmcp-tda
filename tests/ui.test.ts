import { describe, expect, it } from 'vitest';
import { parsePointInput } from '../src/ui/app';

describe('human point input', () => {
  it('accepts a consistent finite point cloud', () => {
    expect(parsePointInput('[[0,0],[1,0],[0,1]]')).toEqual([[0, 0], [1, 0], [0, 1]]);
  });

  it('rejects malformed coordinates before drawing or computing', () => {
    expect(() => parsePointInput('[[0,0],[1,"bad"]]')).toThrow('finite numbers');
    expect(() => parsePointInput('[[0,0],[1,0,2]]')).toThrow('finite numbers');
  });
});
