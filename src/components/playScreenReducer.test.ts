import { describe, expect, it } from 'vitest';
import { MODE_CONFIGS } from '../lib/modes';
import { gameReducer, initGameState, type GameState } from './playScreenReducer';

// Build a synthetic state without going through initGameState (which calls
// data pickers with a seed). Tests that need a real starter use
// initGameState with a fixed seed.
function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'playing',
    countdown: 0,
    currentWord: 'SOAR',
    targetWord: '',
    par: null,
    typed: '',
    usedWords: new Set(['SOAR']),
    chain: [{ word: 'SOAR', pts: null }],
    score: 0,
    timeLeft: 60,
    acceptKey: 0,
    deadEnd: false,
    streakPos: null,
    streakCount: 0,
    gameOver: false,
    ...overrides,
  };
}

describe('initGameState', () => {
  it('classic mode: timed, in countdown phase, single-entry chain at the picked starter', () => {
    const state = initGameState({
      isLadder: false,
      cfg: MODE_CONFIGS.classic,
      modeId: 'classic',
      puzzleSeed: 0.5,
    });
    expect(state.phase).toBe('countdown');
    expect(state.timeLeft).toBe(60);
    expect(state.chain).toHaveLength(1);
    expect(state.chain[0].pts).toBeNull();
    expect(state.usedWords.size).toBe(1);
    expect(state.usedWords.has(state.currentWord)).toBe(true);
    expect(state.targetWord).toBe('');
    expect(state.gameOver).toBe(false);
  });

  it('thisthat ladder mode: starts in playing phase, target + par populated', () => {
    const state = initGameState({
      isLadder: true,
      cfg: MODE_CONFIGS.thisthat,
      modeId: 'thisthat',
      puzzleSeed: 0.5,
    });
    expect(state.phase).toBe('playing');
    expect(state.targetWord).not.toBe('');
    expect(state.par).not.toBeNull();
  });

  it('soyboy mode: 3-letter starter, 45-second timer', () => {
    const state = initGameState({
      isLadder: false,
      cfg: MODE_CONFIGS.soyboy,
      modeId: 'soyboy',
      puzzleSeed: 0.5,
    });
    expect(state.currentWord).toHaveLength(3);
    expect(state.timeLeft).toBe(45);
  });
});

describe('gameReducer — TICK_COUNTDOWN', () => {
  it('decrements countdown', () => {
    const next = gameReducer(makeState({ phase: 'countdown', countdown: 4 }), { type: 'TICK_COUNTDOWN' });
    expect(next.countdown).toBe(3);
    expect(next.phase).toBe('countdown');
  });

  it('transitions to playing when countdown hits 0', () => {
    const next = gameReducer(makeState({ phase: 'countdown', countdown: 1 }), { type: 'TICK_COUNTDOWN' });
    expect(next.countdown).toBe(0);
    expect(next.phase).toBe('playing');
  });
});

describe('gameReducer — TICK_TIMER', () => {
  it('decrements timeLeft', () => {
    const next = gameReducer(makeState({ timeLeft: 30 }), { type: 'TICK_TIMER' });
    expect(next.timeLeft).toBe(29);
    expect(next.gameOver).toBe(false);
  });

  it('latches gameOver=true when timeLeft hits 0', () => {
    const next = gameReducer(makeState({ timeLeft: 1 }), { type: 'TICK_TIMER' });
    expect(next.timeLeft).toBe(0);
    expect(next.gameOver).toBe(true);
  });

  // This is the bug-catching test for the phase 4f deep-review fix:
  // a player who dead-ends in non-forever mode and then waits for the
  // timer must still trigger gameOver via TICK_TIMER. Without this, the
  // PlayScreen's timeup useEffect can't fire onEnd and the game hangs.
  it('still latches gameOver when player has already dead-ended', () => {
    const next = gameReducer(makeState({ timeLeft: 1, deadEnd: true }), { type: 'TICK_TIMER' });
    expect(next.gameOver).toBe(true);
    expect(next.timeLeft).toBe(0);
    expect(next.deadEnd).toBe(true); // preserved
  });
});

describe('gameReducer — TYPE_LETTER', () => {
  it('appends an uppercased letter to typed', () => {
    const next = gameReducer(makeState({ typed: 'BO' }), { type: 'TYPE_LETTER', letter: 'a', wordLen: 4 });
    expect(next.typed).toBe('BOA');
  });

  it('refuses to append past wordLen (defense-in-depth)', () => {
    const before = makeState({ typed: 'BOAR' });
    const next = gameReducer(before, { type: 'TYPE_LETTER', letter: 'X', wordLen: 4 });
    expect(next).toBe(before); // identity — no state change, no re-render
  });
});

describe('gameReducer — BACKSPACE', () => {
  it('slices the last character', () => {
    const next = gameReducer(makeState({ typed: 'BOA' }), { type: 'BACKSPACE' });
    expect(next.typed).toBe('BO');
  });

  it('no-op on empty typed', () => {
    const next = gameReducer(makeState({ typed: '' }), { type: 'BACKSPACE' });
    expect(next.typed).toBe('');
  });
});

describe('gameReducer — SUBMIT_ACCEPTED', () => {
  it('advances currentWord, grows chain + usedWords, clears typed, increments acceptKey', () => {
    const before = makeState({ currentWord: 'SOAR', typed: 'BOAR', score: 0, acceptKey: 5 });
    const next = gameReducer(before, { type: 'SUBMIT_ACCEPTED', word: 'BOAR', pos: 0, pts: 1 });
    expect(next.currentWord).toBe('BOAR');
    expect(next.chain).toEqual([{ word: 'SOAR', pts: null }, { word: 'BOAR', pts: 1 }]);
    expect(next.usedWords.has('BOAR')).toBe(true);
    expect(next.usedWords.has('SOAR')).toBe(true);
    expect(next.score).toBe(1);
    expect(next.typed).toBe('');
    expect(next.acceptKey).toBe(6);
  });

  it('builds streak when same position changed again', () => {
    const before = makeState({ streakPos: 0, streakCount: 1 });
    const next = gameReducer(before, { type: 'SUBMIT_ACCEPTED', word: 'HOAR', pos: 0, pts: 1 });
    expect(next.streakPos).toBe(0);
    expect(next.streakCount).toBe(2);
  });

  it('resets streakCount to 1 when a different position changes', () => {
    const before = makeState({ streakPos: 0, streakCount: 2 });
    const next = gameReducer(before, { type: 'SUBMIT_ACCEPTED', word: 'BEAR', pos: 1, pts: 4 });
    expect(next.streakPos).toBe(1);
    expect(next.streakCount).toBe(1);
  });

  it('does not mutate the previous usedWords set', () => {
    const before = makeState();
    const beforeUsed = before.usedWords;
    gameReducer(before, { type: 'SUBMIT_ACCEPTED', word: 'BOAR', pos: 0, pts: 1 });
    expect(beforeUsed.has('BOAR')).toBe(false); // original Set untouched
  });
});

describe('gameReducer — SET_DEAD_END / GAME_OVER / START_PLAYING', () => {
  it('SET_DEAD_END latches deadEnd', () => {
    const next = gameReducer(makeState(), { type: 'SET_DEAD_END' });
    expect(next.deadEnd).toBe(true);
  });

  it('GAME_OVER latches gameOver', () => {
    const next = gameReducer(makeState(), { type: 'GAME_OVER' });
    expect(next.gameOver).toBe(true);
  });

  it('GAME_OVER returns the same state object when gameOver is already true (avoids spurious re-render)', () => {
    const before = makeState({ gameOver: true });
    const next = gameReducer(before, { type: 'GAME_OVER' });
    expect(next).toBe(before); // identity
  });

  it('START_PLAYING transitions from countdown → playing', () => {
    const next = gameReducer(makeState({ phase: 'countdown' }), { type: 'START_PLAYING' });
    expect(next.phase).toBe('playing');
  });

  it('START_PLAYING is a no-op when already playing', () => {
    const before = makeState({ phase: 'playing' });
    const next = gameReducer(before, { type: 'START_PLAYING' });
    expect(next).toBe(before);
  });
});
