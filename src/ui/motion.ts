/** Persisted Pause motion choice. Absent means "no choice yet". */
export const MOTION_STORAGE_KEY = 'webmcp-tda-motion';

export type StoredMotion = 'paused' | 'playing';

export function parseStoredMotion(value: string | null): StoredMotion | null {
  if (value === 'paused' || value === 'playing') return value;
  return null;
}

export function readStoredMotion(storage: Pick<Storage, 'getItem'>): StoredMotion | null {
  try {
    return parseStoredMotion(storage.getItem(MOTION_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredMotion(storage: Pick<Storage, 'setItem'>, paused: boolean): void {
  try {
    storage.setItem(MOTION_STORAGE_KEY, paused ? 'paused' : 'playing');
  } catch {
    // Private mode and blocked storage leave the in-memory choice in place.
  }
}

/**
 * No stored choice starts paused when the system asks for reduced motion.
 * An explicit Pause motion choice wins over that default.
 */
export function motionPaused(stored: StoredMotion | null, reducedMotion: boolean): boolean {
  if (stored === 'paused') return true;
  if (stored === 'playing') return false;
  return reducedMotion;
}

interface MotionEnvironment {
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  reducedMotion: MediaQueryList;
  root: HTMLElement;
}

export interface MotionController {
  paused(): boolean;
  toggle(): void;
  subscribe(listener: (paused: boolean) => void): () => void;
  destroy(): void;
}

export function createMotionController(env: MotionEnvironment): MotionController {
  let stored = readStoredMotion(env.storage);
  let paused = motionPaused(stored, env.reducedMotion.matches);
  const listeners = new Set<(paused: boolean) => void>();

  const emit = () => {
    env.root.dataset.motion = paused ? 'paused' : 'playing';
    listeners.forEach((listener) => listener(paused));
  };

  const onPreferenceChange = () => {
    const next = motionPaused(stored, env.reducedMotion.matches);
    if (next === paused) return;
    paused = next;
    emit();
  };

  env.reducedMotion.addEventListener('change', onPreferenceChange);
  env.root.dataset.motion = paused ? 'paused' : 'playing';

  return {
    paused: () => paused,
    toggle() {
      stored = paused ? 'playing' : 'paused';
      writeStoredMotion(env.storage, stored === 'paused');
      const next = motionPaused(stored, env.reducedMotion.matches);
      if (next === paused) return;
      paused = next;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      env.reducedMotion.removeEventListener('change', onPreferenceChange);
      listeners.clear();
    },
  };
}
