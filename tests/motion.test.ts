import { describe, expect, it } from 'vitest';
import {
  MOTION_STORAGE_KEY,
  motionPaused,
  parseStoredMotion,
  readStoredMotion,
  writeStoredMotion,
} from '../src/ui/motion';

describe('Pause motion preference', () => {
  it('parses only the two stored choices', () => {
    expect(parseStoredMotion('paused')).toBe('paused');
    expect(parseStoredMotion('playing')).toBe('playing');
    expect(parseStoredMotion(null)).toBeNull();
    expect(parseStoredMotion('')).toBeNull();
    expect(parseStoredMotion('true')).toBeNull();
    expect(parseStoredMotion('paused ')).toBeNull();
  });

  it('starts paused under reduced motion until a choice is stored', () => {
    expect(motionPaused(null, true)).toBe(true);
    expect(motionPaused(null, false)).toBe(false);
    expect(motionPaused('paused', false)).toBe(true);
    expect(motionPaused('playing', true)).toBe(false);
  });

  it('round-trips the choice and ignores storage that throws', () => {
    let stored: string | null = null;
    const storage = {
      getItem: (key: string) => {
        expect(key).toBe(MOTION_STORAGE_KEY);
        return stored;
      },
      setItem: (key: string, value: string) => {
        expect(key).toBe(MOTION_STORAGE_KEY);
        stored = value;
      },
    };

    expect(readStoredMotion(storage)).toBeNull();
    writeStoredMotion(storage, true);
    expect(readStoredMotion(storage)).toBe('paused');
    writeStoredMotion(storage, false);
    expect(stored).toBe('playing');

    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readStoredMotion(blocked)).toBeNull();
    expect(() => writeStoredMotion(blocked, true)).not.toThrow();
  });
});
