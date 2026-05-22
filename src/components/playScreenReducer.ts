// PlayScreen's game-content state machine. Pure reducer + lazy
// initializer extracted from PlayScreen.tsx so unit tests can exercise
// every transition without rendering React. The init function reads
// data (pickStarter / pickLadderPair / getStarters / getWords / getPairs)
// so this file lives under src/components/ rather than src/lib/ —
// src/lib/'s no-restricted-imports rule blocks data imports.

import { getPairs, getStarters, getWords } from '../data/modeData';
import { HEAD_START } from '../game/constants';
import { tutorialPair, type ModeConfig, type ModeId } from '../lib/modes';
import { pickLadderPair, pickStarter } from '../lib/puzzle';
import type { ChainEntry } from '../lib/types';

export type GamePhase = 'countdown' | 'playing';

export interface GameState {
  phase: GamePhase;
  countdown: number;
  currentWord: string;
  targetWord: string;
  par: number | null;
  typed: string;
  usedWords: Set<string>;
  chain: ChainEntry[];
  score: number;
  timeLeft: number;
  acceptKey: number;        // re-key for tile snap-in animation
  deadEnd: boolean;
  streakPos: number | null; // last-changed letter position (for streak rule)
  streakCount: number;      // consecutive changes at streakPos
  gameOver: boolean;        // latched once any end condition fires
}

export type GameAction =
  | { type: 'TICK_COUNTDOWN' }
  | { type: 'START_PLAYING' }
  | { type: 'TICK_TIMER' }
  | { type: 'TYPE_LETTER'; letter: string; wordLen: number }
  | { type: 'BACKSPACE' }
  | { type: 'SUBMIT_ACCEPTED'; word: string; pos: number; pts: number }
  | { type: 'SET_DEAD_END' }
  | { type: 'GAME_OVER' };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'TICK_COUNTDOWN':
      if (state.countdown <= 1) return { ...state, countdown: 0, phase: 'playing' };
      return { ...state, countdown: state.countdown - 1 };
    case 'START_PLAYING':
      return state.phase === 'countdown' ? { ...state, phase: 'playing' } : state;
    case 'TICK_TIMER':
      if (state.timeLeft <= 1) return { ...state, timeLeft: 0, gameOver: true };
      return { ...state, timeLeft: state.timeLeft - 1 };
    case 'TYPE_LETTER':
      if (state.typed.length >= action.wordLen) return state;
      return { ...state, typed: state.typed + action.letter.toUpperCase() };
    case 'BACKSPACE':
      return { ...state, typed: state.typed.slice(0, -1) };
    case 'SUBMIT_ACCEPTED': {
      const { word, pos, pts } = action;
      const newStreakCount = state.streakPos === pos ? state.streakCount + 1 : 1;
      return {
        ...state,
        currentWord: word,
        usedWords: new Set(state.usedWords).add(word),
        chain: [...state.chain, { word, pts }],
        score: state.score + pts,
        streakPos: pos,
        streakCount: newStreakCount,
        typed: '',
        acceptKey: state.acceptKey + 1,
      };
    }
    case 'SET_DEAD_END':
      return { ...state, deadEnd: true };
    case 'GAME_OVER':
      return state.gameOver ? state : { ...state, gameOver: true };
  }
}

export interface InitArgs {
  isLadder: boolean;
  cfg: ModeConfig;
  modeId: ModeId;
  puzzleSeed: number;
}

export function initGameState({ isLadder, cfg, modeId, puzzleSeed }: InitArgs): GameState {
  let start: string;
  let target = '';
  let parVal: number | null = null;
  if (isLadder) {
    const pair = pickLadderPair(getPairs(modeId), tutorialPair(cfg), puzzleSeed);
    start  = pair.start;
    target = pair.end;
    parVal = pair.par;
  } else {
    start = pickStarter(getStarters(modeId), getWords(modeId), cfg.tutorialStart, puzzleSeed);
  }
  return {
    phase: isLadder ? 'playing' : 'countdown',
    countdown: HEAD_START,
    currentWord: start,
    targetWord: target,
    par: parVal,
    typed: '',
    usedWords: new Set([start]),
    chain: [{ word: start, pts: null }],
    score: 0,
    timeLeft: cfg.duration ?? 0,
    acceptKey: 0,
    deadEnd: false,
    streakPos: null,
    streakCount: 0,
    gameOver: false,
  };
}
