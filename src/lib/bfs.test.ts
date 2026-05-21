import { describe, expect, it } from 'vitest';
import { bfsPath } from './bfs';
import { WORDS } from '../data/wordlist';

describe('bfsPath', () => {
  it('returns a single-element path when start equals target', () => {
    expect(bfsPath('SOAR', 'SOAR', WORDS)).toEqual(['SOAR']);
  });

  it('finds the known 2-step path SOAR -> BEAR via the real wordlist', () => {
    // BFS explores positions 0..N then letters A..Z, so the first
    // depth-2 path it finds is BOAR (position 0, letter B) -> BEAR.
    expect(bfsPath('SOAR', 'BEAR', WORDS)).toEqual(['SOAR', 'BOAR', 'BEAR']);
  });

  it('returns null when the target is unreachable in a tiny word set', () => {
    const small = new Set(['CAT', 'BAT']); // no path to DOG
    expect(bfsPath('CAT', 'DOG', small)).toBeNull();
  });

  it('returns null when the target is not in the word set', () => {
    expect(bfsPath('SOAR', 'XYZQ', WORDS)).toBeNull();
  });

  it('respects the word-set boundary (only candidates in the set count)', () => {
    // SOAR -> BOAR -> BEAR with BOAR missing from the set: must go a
    // different way. SEAR (position 1, letter E) is the next bridge.
    const noBoar = new Set(WORDS);
    noBoar.delete('BOAR');
    expect(bfsPath('SOAR', 'BEAR', noBoar)).toEqual(['SOAR', 'SEAR', 'BEAR']);
  });
});
