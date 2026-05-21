// Puzzle setup — picks the opening word for free-form modes and the
// start/target/par for ladder mode. Both take an optional seed in
// [0, 1) for deterministic test runs; if omitted, defaults to
// Math.random() (the only impurity, scoped to a single call site).

import type { ThisThatPair } from './types';

export function pickStarter(
  starters: readonly string[],
  words: ReadonlySet<string>,
  tutorialStart: string,
  seed?: number,
): string {
  const pool = starters.map((w) => w.toUpperCase()).filter((w) => words.has(w));
  if (!pool.length) return tutorialStart;
  const s = typeof seed === 'number' ? seed : Math.random();
  return pool[Math.floor(s * pool.length) % pool.length];
}

export function pickLadderPair(
  pairs: readonly ThisThatPair[],
  fallback: ThisThatPair,
  seed?: number,
): ThisThatPair {
  if (!pairs.length) return fallback;
  const s = typeof seed === 'number' ? seed : Math.random();
  return pairs[Math.floor(s * pairs.length) % pairs.length];
}
