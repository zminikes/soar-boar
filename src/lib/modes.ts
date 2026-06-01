// Pure mode config — no data imports, no React. Safe to import from
// src/lib/ (enforced by the eslint no-restricted-imports rule).
//
// Data-bound lookups (getWords, getStarters, getPairs) live in
// src/data/modeData.ts and consume MODE_CONFIGS for tutorial fallbacks.

import type { ThisThatPair } from './types';

export type ModeId = 'classic' | 'soyboy' | 'thisthat';

export interface ModeConfig {
  id: ModeId;
  name: string;
  sub: string;
  /** Editorial tagline shown on the start-screen hero. Sits in place of
      the old "Nletter words · Ns" meta line in the redesigned hero. */
  tagline: string;
  wordLen: number;
  duration: number | null;
  isLadder?: boolean;
  posPts: number[];
  posLabels: string[];
  /** Emoji shown in share text and dead-end banner — bean for the soy mode, pig otherwise. */
  shareEmoji: string;
  tutorialStart: string;
  tutorialTarget: string;
  tutorialWords: string[];
  tutorialHints: string[];
}

export const MODE_CONFIGS: Record<ModeId, ModeConfig> = {
  classic: {
    id: 'classic',
    name: 'Soar Boar',
    sub: '4-letter words',
    tagline: 'A brain-tickling four-letter word game',
    wordLen: 4,
    duration: 60,
    posPts: [1, 4, 3, 2],
    posLabels: ['1st', '2nd', '3rd', '4th'],
    shareEmoji: '🐷',
    tutorialStart: 'SOAR',
    tutorialTarget: 'BOAR',
    tutorialWords: ['SOAR', 'BOAR', 'BEAR'],
    tutorialHints: ['Type BOAR', 'Now type BEAR'],
  },
  soyboy: {
    id: 'soyboy',
    name: 'Soy Boy',
    sub: '3-letter words',
    tagline: 'A slightly chiller three-letter word game',
    wordLen: 3,
    duration: 45,
    posPts: [1, 3, 2],
    posLabels: ['1st', '2nd', '3rd'],
    shareEmoji: '🫛',
    tutorialStart: 'SOY',
    tutorialTarget: 'BOY',
    tutorialWords: ['SOY', 'BOY', 'BAY'],
    tutorialHints: ['Type BOY', 'Now type BAY'],
  },
  thisthat: {
    id: 'thisthat',
    name: 'This That',
    sub: 'Word ladder',
    tagline: 'Find the best path between two words',
    wordLen: 4,
    duration: null,
    isLadder: true,
    posPts: [1, 4, 3, 2],
    posLabels: ['1st', '2nd', '3rd', '4th'],
    shareEmoji: '🐷',
    tutorialStart: 'THIS',
    tutorialTarget: 'THAT',
    tutorialWords: ['THIS', 'THIN', 'THAN', 'THAT'],
    tutorialHints: ['Type THIN', 'Now type THAN', 'Now type THAT'],
  },
};

// Build a tutorial-fallback ThisThatPair from a mode config — used by
// pickLadderPair when no real pairs are loaded for the mode.
export function tutorialPair(mode: ModeConfig): ThisThatPair {
  return {
    start: mode.tutorialStart,
    end: mode.tutorialTarget,
    par: mode.tutorialWords.length - 1,
    path: mode.tutorialWords,
  };
}
