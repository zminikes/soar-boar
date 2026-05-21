import { WORDS } from '../data/wordlist';
import { WORDS3 } from '../data/wordlist3';
import { STARTER_WORDS } from '../data/starters';
import { STARTER_WORDS3 } from '../data/starters3';
import { THIS_THAT_PAIRS, type ThisThatPair } from '../data/pairs';

export type ModeId = 'classic' | 'soyboy' | 'thisthat';

export interface Mode {
  id: ModeId;
  name: string;
  sub: string;
  wordLen: number;
  duration: number | null;
  isLadder?: boolean;
  getWords: () => ReadonlySet<string>;
  getStarters: () => readonly string[];
  getPairs?: () => readonly ThisThatPair[];
  posPts: number[];
  posLabels: string[];
  tutorialStart: string;
  tutorialTarget: string;
  tutorialWords: string[];
  tutorialHints: string[];
}

export const MODES: Record<ModeId, Mode> = {
  classic: {
    id: 'classic',
    name: 'Soar Boar',
    sub: '4-letter words',
    wordLen: 4,
    duration: 60,
    getWords: () => WORDS,
    getStarters: () => STARTER_WORDS,
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
    getWords: () => WORDS3,
    getStarters: () => STARTER_WORDS3,
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
    getWords: () => WORDS,
    getStarters: () => [],
    getPairs: () => THIS_THAT_PAIRS,
    posPts: [1, 4, 3, 2],
    posLabels: ['1st', '2nd', '3rd', '4th'],
    tutorialStart: 'THIS',
    tutorialTarget: 'THAT',
    tutorialWords: ['THIS', 'THIN', 'THAN', 'THAT'],
    tutorialHints: ['Type THIN', 'Now type THAN', 'Now type THAT'],
  },
};
