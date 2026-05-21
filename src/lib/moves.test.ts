import { describe, expect, it } from 'vitest';
import { diffPos, getValidMoves } from './moves';

describe('diffPos', () => {
  it('returns empty when strings are identical', () => {
    expect(diffPos('SOAR', 'SOAR')).toEqual([]);
  });

  it('returns single index when one letter differs', () => {
    expect(diffPos('SOAR', 'BOAR')).toEqual([0]);
    expect(diffPos('SOAR', 'SEAR')).toEqual([1]);
    expect(diffPos('SOAR', 'SOAP')).toEqual([3]);
  });

  it('returns all indices when multiple letters differ', () => {
    expect(diffPos('BOOT', 'BOTS')).toEqual([2, 3]);
    expect(diffPos('SOAR', 'BEAR')).toEqual([0, 1]);
  });

  it('returns 0..n-1 when no letter matches', () => {
    expect(diffPos('ABCD', 'EFGH')).toEqual([0, 1, 2, 3]);
  });
});

describe('getValidMoves', () => {
  const wordSet = new Set(['CAT', 'BAT', 'COT', 'CAR', 'BAR']);

  it('returns one-letter neighbors that are in the word set', () => {
    const moves = getValidMoves('CAT', new Set(), null, 0, true, wordSet);
    expect(moves.sort()).toEqual(['BAT', 'CAR', 'COT']);
  });

  it('excludes already-used words', () => {
    const moves = getValidMoves('CAT', new Set(['BAT']), null, 0, true, wordSet);
    expect(moves.sort()).toEqual(['CAR', 'COT']);
  });

  it('blocks the streaked position when streakRule on and streakCount >= 2', () => {
    // streakPos=2 means the last position was the change point — block it
    const moves = getValidMoves('CAT', new Set(), 2, 2, true, wordSet);
    expect(moves.sort()).toEqual(['BAT', 'COT']); // CAR (position 2 change) excluded
  });

  it('streakCount < 2 does not block even when streakRule on', () => {
    const moves = getValidMoves('CAT', new Set(), 2, 1, true, wordSet);
    expect(moves.sort()).toEqual(['BAT', 'CAR', 'COT']);
  });

  it('streakRule off allows all positions even at high streakCount', () => {
    const moves = getValidMoves('CAT', new Set(), 2, 99, false, wordSet);
    expect(moves.sort()).toEqual(['BAT', 'CAR', 'COT']);
  });

  it('returns empty when no neighbor is in the word set', () => {
    const moves = getValidMoves('XYZ', new Set(), null, 0, true, wordSet);
    expect(moves).toEqual([]);
  });

  it('returns empty when the current word is the only word in the set', () => {
    const onlyOne = new Set(['CAT']);
    expect(getValidMoves('CAT', new Set(), null, 0, true, onlyOne)).toEqual([]);
  });
});
