// Data-bound mode lookups. Imports raw wordlist/starter/pair data and
// resolves them per ModeId. Components and helpers that need the runtime
// data go through these functions rather than reading them off a mode
// config — keeps src/lib/modes.ts free of data dependencies.

import type { ModeId } from '../lib/modes';
import type { ThisThatPair } from './pairs';
import { WORDS } from './wordlist';
import { WORDS3 } from './wordlist3';
import { STARTER_WORDS } from './starters';
import { STARTER_WORDS3 } from './starters3';
import { THIS_THAT_PAIRS } from './pairs';

const WORD_SETS: Record<ModeId, ReadonlySet<string>> = {
  classic: WORDS,
  soyboy: WORDS3,
  thisthat: WORDS,
};

const STARTERS: Record<ModeId, readonly string[]> = {
  classic: STARTER_WORDS,
  soyboy: STARTER_WORDS3,
  thisthat: [], // pairs drive start words
};

const PAIRS: Record<ModeId, readonly ThisThatPair[]> = {
  classic: [],
  soyboy: [],
  thisthat: THIS_THAT_PAIRS,
};

export function getWords(modeId: ModeId): ReadonlySet<string> {
  return WORD_SETS[modeId];
}

export function getStarters(modeId: ModeId): readonly string[] {
  return STARTERS[modeId];
}

export function getPairs(modeId: ModeId): readonly ThisThatPair[] {
  return PAIRS[modeId];
}
