import { describe, expect, it } from 'vitest';
import { pickLadderPair, pickStarter } from './puzzle';
import { WORDS } from '../data/wordlist';
import { STARTER_WORDS } from '../data/starters';
import { THIS_THAT_PAIRS } from '../data/pairs';
import { MODE_CONFIGS, tutorialPair } from './modes';
import type { ThisThatPair } from './types';

describe('pickStarter', () => {
  it('is deterministic across calls with the same seed', () => {
    const a = pickStarter(STARTER_WORDS, WORDS, 'TUTORIAL', 0.5);
    const b = pickStarter(STARTER_WORDS, WORDS, 'TUTORIAL', 0.5);
    expect(a).toBe(b);
  });

  it('picks distinct words for distinct seeds (sampling check)', () => {
    const seeds = [0, 0.25, 0.5, 0.75];
    const picks = seeds.map((s) => pickStarter(STARTER_WORDS, WORDS, 'TUTORIAL', s));
    expect(new Set(picks).size).toBeGreaterThan(1);
  });

  it('uses Math.floor(seed * pool.length) % pool.length indexing', () => {
    // Recreate the pool the function builds internally and confirm the
    // mapping is what we think it is — guards against future drift in
    // the pool-construction step.
    const pool = STARTER_WORDS.map((w) => w.toUpperCase()).filter((w) => WORDS.has(w));
    const seed = 0.5;
    const expected = pool[Math.floor(seed * pool.length) % pool.length];
    expect(pickStarter(STARTER_WORDS, WORDS, 'TUTORIAL', seed)).toBe(expected);
  });

  it('falls back to tutorialStart when the starter pool is empty', () => {
    expect(pickStarter([], WORDS, 'FALLBACK', 0.5)).toBe('FALLBACK');
  });

  it('falls back to tutorialStart when no starter survives the word-set filter', () => {
    const starters = ['xxxa', 'xxxb', 'xxxc']; // none in WORDS
    expect(pickStarter(starters, WORDS, 'FALLBACK', 0.5)).toBe('FALLBACK');
  });

  it('uppercases starters before checking word-set membership', () => {
    // STARTER_WORDS data is lowercase; WORDS is uppercase. The function
    // must uppercase first or the pool would be empty.
    const result = pickStarter(STARTER_WORDS, WORDS, 'TUTORIAL', 0.5);
    expect(result).toMatch(/^[A-Z]+$/);
    expect(result).not.toBe('TUTORIAL'); // tutorial fallback would mean the pool was empty
  });
});

describe('pickLadderPair', () => {
  const fallback: ThisThatPair = tutorialPair(MODE_CONFIGS.thisthat);

  it('is deterministic across calls with the same seed', () => {
    const a = pickLadderPair(THIS_THAT_PAIRS, fallback, 0.5);
    const b = pickLadderPair(THIS_THAT_PAIRS, fallback, 0.5);
    expect(a).toBe(b);
  });

  it('picks distinct pairs for distinct seeds (sampling check)', () => {
    const seeds = [0, 0.25, 0.5, 0.75];
    const picks = seeds.map((s) => pickLadderPair(THIS_THAT_PAIRS, fallback, s));
    const starts = new Set(picks.map((p) => p.start));
    expect(starts.size).toBeGreaterThan(1);
  });

  it('uses Math.floor(seed * pairs.length) % pairs.length indexing', () => {
    const seed = 0.5;
    const expected = THIS_THAT_PAIRS[Math.floor(seed * THIS_THAT_PAIRS.length) % THIS_THAT_PAIRS.length];
    expect(pickLadderPair(THIS_THAT_PAIRS, fallback, seed)).toBe(expected);
  });

  it('falls back to the provided fallback when pairs is empty', () => {
    expect(pickLadderPair([], fallback, 0.5)).toBe(fallback);
  });

  it('tutorialPair() builds a ThisThatPair shaped from a ModeConfig', () => {
    expect(fallback).toEqual({
      start: 'THIS',
      end: 'THAT',
      par: 3, // tutorialWords.length - 1 = ['THIS','THIN','THAN','THAT'].length - 1
      path: ['THIS', 'THIN', 'THAN', 'THAT'],
    });
  });
});
