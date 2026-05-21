// Pure mode config — no data imports, no React. Safe to import from
// src/lib/ (enforced by the eslint no-restricted-imports rule).
//
// Data-bound lookups (getWords, getStarters, getPairs) live in
// src/data/modeData.ts and consume MODE_CONFIGS for tutorial fallbacks.

export type ModeId = 'classic' | 'soyboy' | 'thisthat';

export interface ModeConfig {
  id: ModeId;
  name: string;
  sub: string;
  wordLen: number;
  duration: number | null;
  isLadder?: boolean;
  posPts: number[];
  posLabels: string[];
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
    wordLen: 4,
    duration: 60,
    posPts: [1, 4, 3, 2],
    posLabels: ['1st', '2nd', '3rd', '4th'],
    tutorialStart: 'SOAR',
    tutorialTarget: 'BOAR',
    tutorialWords: ['SOAR', 'BOAR', 'BEAR'],
    tutorialHints: ['Type BOAR', 'Now type BEAR'],
  },
  soyboy: {
    id: 'soyboy',
    name: 'Soy Boy',
    sub: '3-letter words',
    wordLen: 3,
    duration: 45,
    posPts: [1, 3, 2],
    posLabels: ['1st', '2nd', '3rd'],
    tutorialStart: 'SOY',
    tutorialTarget: 'BOY',
    tutorialWords: ['SOY', 'BOY', 'BAY'],
    tutorialHints: ['Type BOY', 'Now type BAY'],
  },
  thisthat: {
    id: 'thisthat',
    name: 'This That',
    sub: 'Word ladder',
    wordLen: 4,
    duration: null,
    isLadder: true,
    posPts: [1, 4, 3, 2],
    posLabels: ['1st', '2nd', '3rd', '4th'],
    tutorialStart: 'THIS',
    tutorialTarget: 'THAT',
    tutorialWords: ['THIS', 'THIN', 'THAN', 'THAT'],
    tutorialHints: ['Type THIN', 'Now type THAN', 'Now type THAT'],
  },
};
