import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { MODE_CONFIGS, type ModeId } from '../lib/modes';
import { getWords } from '../data/modeData';
import { MSG_DURATION } from '../game/constants';
import { bfsPath } from '../lib/bfs';
import { diffPos, getValidMoves } from '../lib/moves';
import type { ChainEntry, DebugState, EndResult, KeyEvent, Msg, MsgKind } from '../lib/types';
import { isTouchDevice } from '../platform/dom';
import { gameReducer, initGameState } from './playScreenReducer';
import { MascotIcon } from './MascotIcon';
import { ChainRows } from './ChainRows';
import { Keyboard } from './Keyboard';

interface PlayScreenProps {
  puzzleSeed: number;
  onEnd: (result: EndResult) => void;
  onHome: () => void;
  onRestart: () => void;
  onNewPuzzle: () => void;
  debug: DebugState;
  modeId?: ModeId;
}

export function PlayScreen({
  puzzleSeed,
  onEnd,
  onHome,
  onRestart,
  onNewPuzzle,
  debug,
  modeId = 'classic',
}: PlayScreenProps) {
  const cfg = MODE_CONFIGS[modeId];
  const isLadder = !!cfg.isLadder;

  const [state, dispatch] = useReducer(
    gameReducer,
    { isLadder, cfg, modeId, puzzleSeed },
    initGameState,
  );

  // Ephemeral UI state — independent of the reducer'd game state.
  const [msg, setMsg] = useState<Msg>({ text: '', type: '' });
  const [shaking, setShaking] = useState(false);
  const [wiggleIdx, setWiggleIdx] = useState<number | null>(null);
  const [hintOn, setHintOn] = useState<boolean>(() => localStorage.getItem('hintOn') === 'true');
  useEffect(() => {
    localStorage.setItem('hintOn', String(hintOn));
  }, [hintOn]);

  // Mirror state into a ref so the interval callback can read fresh values
  // without re-creating the interval every render. (One ref replaces the
  // 9-ref mirror pattern from pre-reducer.)
  const stateRef = useRef(state);
  stateRef.current = state;

  // Track all setTimeout IDs so they can be cleared on unmount — prevents
  // "setState on unmounted component" warnings if the user navigates away
  // during a triggerShake (320ms), msg auto-hide (2000ms), or end-of-game
  // delay (300 / 700 / 1800ms).
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  useEffect(
    () => () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current.clear();
    },
    [],
  );
  const setTimer = useCallback((fn: () => void, ms: number): ReturnType<typeof setTimeout> => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
    return id;
  }, []);

  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showMsg = useCallback(
    (text: string, type: MsgKind): void => {
      if (msgTimerRef.current !== null) clearTimeout(msgTimerRef.current);
      setMsg({ text, type });
      msgTimerRef.current = setTimer(() => {
        msgTimerRef.current = null;
        setMsg({ text: '', type: '' });
      }, MSG_DURATION);
    },
    [setTimer],
  );

  const triggerShake = useCallback((): void => {
    setShaking(true);
    setTimer(() => setShaking(false), 320);
  }, [setTimer]);

  // Countdown — ticks once per second while in countdown phase.
  useEffect(() => {
    if (state.phase !== 'countdown') return;
    const id = setInterval(() => dispatch({ type: 'TICK_COUNTDOWN' }), 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  // Timer — skipped for ladder mode and forever mode. The reducer's
  // TICK_TIMER atomically transitions to gameOver when timeLeft hits 0;
  // we watch that here to fire onEnd with the timeup payload.
  useEffect(() => {
    if (state.phase !== 'playing' || debug.foreverMode || isLadder || state.gameOver) return;
    const id = setInterval(() => dispatch({ type: 'TICK_TIMER' }), 1000);
    return () => clearInterval(id);
  }, [state.phase, debug.foreverMode, isLadder, state.gameOver]);

  // Time's-up side effect — fires once when the timer-driven gameOver
  // latches. Win + dead-end-forever paths set gameOver imperatively from
  // submitWord with their own onEnd payloads, both keeping timeLeft > 0,
  // so the `timeLeft === 0` guard naturally excludes them. (A `!deadEnd`
  // guard here would BREAK the non-forever dead-end-then-timer-expires
  // path — the player needs onEnd to fire even if they dead-ended early
  // and waited out the clock. Original code matched the behaviour
  // here.)
  const timeupHandledRef = useRef(false);
  useEffect(() => {
    if (timeupHandledRef.current) return;
    if (state.gameOver && state.timeLeft === 0 && !isLadder) {
      timeupHandledRef.current = true;
      setTimer(
        () =>
          onEnd({
            score: stateRef.current.score,
            chain: stateRef.current.chain,
            deadEnd: false,
          }),
        300,
      );
    }
  }, [state.gameOver, state.timeLeft, isLadder, onEnd, setTimer]);

  // ── Hint wiggle: after 10s idle, wiggle a useful tile letter ──
  // Resets whenever the player types, current word changes, or hint toggles
  // — so even mid-word the hint reappears 10s after the last keystroke,
  // pointing at the next letter to change.
  useEffect(() => {
    setWiggleIdx(null);
    if (!hintOn || state.phase !== 'playing' || state.gameOver) return;
    const t = setTimeout(() => {
      let idx: number | null = null;
      if (isLadder && state.targetWord) {
        const path = bfsPath(state.currentWord, state.targetWord, getWords(modeId));
        if (path && path.length > 1) {
          const next = path[1];
          for (let i = 0; i < next.length; i++) {
            if (next[i] !== state.currentWord[i]) {
              idx = i;
              break;
            }
          }
        }
      } else {
        // Non-ladder: pick the position with the most valid moves
        const moves = getValidMoves(
          state.currentWord,
          state.usedWords,
          state.streakPos,
          state.streakCount,
          debug.streakRule,
          getWords(modeId),
        );
        if (moves.length) {
          const counts = new Array<number>(cfg.wordLen).fill(0);
          for (const m of moves) {
            for (let i = 0; i < m.length; i++)
              if (m[i] !== state.currentWord[i]) {
                counts[i]++;
                break;
              }
          }
          let best = 0;
          for (let i = 1; i < counts.length; i++) if (counts[i] > counts[best]) best = i;
          if (counts[best] > 0) idx = best;
        }
      }
      if (idx != null) setWiggleIdx(idx);
    }, 10000);
    return () => clearTimeout(t);
  }, [
    hintOn,
    state.phase,
    state.gameOver,
    state.typed,
    state.currentWord,
    state.targetWord,
    state.acceptKey,
    state.usedWords,
    state.streakPos,
    state.streakCount,
    isLadder,
    debug.streakRule,
    modeId,
    cfg,
  ]);

  const submitWord = useCallback(
    (word: string): void => {
      const s = stateRef.current;
      if (s.gameOver) return;
      const upper = word.toUpperCase();
      if (!getWords(modeId).has(upper)) {
        showMsg('Not a word', 'error');
        triggerShake();
        return;
      }
      const diffs = diffPos(s.currentWord, upper);
      if (diffs.length !== 1) {
        showMsg(diffs.length === 0 ? 'Same as current word' : 'Change exactly one letter', 'error');
        triggerShake();
        return;
      }
      if (s.usedWords.has(upper)) {
        showMsg('Already used', 'error');
        triggerShake();
        return;
      }
      const pos = diffs[0];
      // Streak rule applies only to timed/forever (free-form) modes, not ladder.
      const newStreakCount = s.streakPos === pos ? s.streakCount + 1 : 1;
      if (!isLadder && debug.streakRule && newStreakCount >= 3) {
        showMsg(`Can't change letter ${pos + 1} three times`, 'error');
        triggerShake();
        return;
      }
      const pts = cfg.posPts[pos];

      // Apply the accepted move via reducer.
      dispatch({ type: 'SUBMIT_ACCEPTED', word: upper, pos, pts });
      // Compute the post-action shape locally so the onEnd payloads below
      // see the new chain/score (stateRef.current is still pre-dispatch
      // until the next render commits).
      const newChain: ChainEntry[] = [...s.chain, { word: upper, pts }];
      const newScore = s.score + pts;
      const newUsed = new Set(s.usedWords).add(upper);

      // Ladder mode: check if we've hit the target → solved!
      if (isLadder && upper === s.targetWord) {
        dispatch({ type: 'GAME_OVER' });
        showMsg('Solved!', 'ok');
        setTimer(
          () =>
            onEnd({
              score: newChain.length - 1, // moves taken
              chain: newChain,
              deadEnd: false,
              win: true,
              target: s.targetWord,
              par: s.par,
            }),
          700,
        );
        return;
      }

      showMsg(isLadder ? '✓' : `+${pts} pt${pts !== 1 ? 's' : ''}`, 'ok');

      // Dead-end detection (skipped in ladder — backtracking is fine there)
      if (!isLadder) {
        const moves = getValidMoves(
          upper,
          newUsed,
          pos,
          newStreakCount,
          debug.streakRule,
          getWords(modeId),
        );
        if (moves.length === 0) {
          dispatch({ type: 'SET_DEAD_END' });
          if (debug.foreverMode) {
            dispatch({ type: 'GAME_OVER' });
            setTimer(() => onEnd({ score: newScore, chain: newChain, deadEnd: true }), 1800);
          }
        }
      }
    },
    [
      isLadder,
      debug.streakRule,
      debug.foreverMode,
      showMsg,
      triggerShake,
      onEnd,
      modeId,
      cfg,
      setTimer,
    ],
  );

  const handleKeyDown = useCallback(
    (e: KeyEvent): void => {
      const s = stateRef.current;
      if (s.gameOver) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (s.phase === 'countdown') {
        // Only a letter press starts the game — Enter / Backspace during the
        // pre-roll are ignored. Dispatch START_PLAYING and fall through so
        // the same keystroke also lands as the first typed letter. The
        // reducer processes both dispatches sequentially (START_PLAYING
        // first, then TYPE_LETTER on the now-playing state), so this works
        // without waiting for stateRef to reflect the phase change.
        if (!/^[a-zA-Z]$/.test(e.key)) return;
        dispatch({ type: 'START_PLAYING' });
      } else if (s.phase !== 'playing') {
        return;
      }
      if (e.key === 'Enter') {
        if (s.typed.length === cfg.wordLen) submitWord(s.typed);
      } else if (e.key === 'Backspace') {
        dispatch({ type: 'BACKSPACE' });
        setMsg({ text: '', type: '' });
      } else if (/^[a-zA-Z]$/.test(e.key) && s.typed.length < cfg.wordLen) {
        const next = s.typed + e.key.toUpperCase();
        dispatch({ type: 'TYPE_LETTER', letter: e.key, wordLen: cfg.wordLen });
        if (next.length === cfg.wordLen) submitWord(next);
      }
    },
    [submitWord, cfg],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Real-time validation
  const typedDiffs =
    state.typed.length === cfg.wordLen ? diffPos(state.currentWord, state.typed) : [];
  const tooMany = typedDiffs.length > 1;
  const noChange = typedDiffs.length === 0 && state.typed.length === cfg.wordLen;
  const persistentError = tooMany
    ? `Changed ${typedDiffs.length} letters — change just 1`
    : noChange
      ? 'Same as current word'
      : '';
  const displayMsg: Msg = persistentError ? { text: persistentError, type: 'error' } : msg;

  const urgent = !isLadder && state.timeLeft <= 10 && !debug.foreverMode;
  // `?? 1` is a type-narrower placation, not runtime defense: the
  // surrounding ternary short-circuits when isLadder (the only mode
  // where cfg.duration is null), so the divisor is reached only when
  // cfg.duration is a number. TS can't follow the correlation back.
  const denom = cfg.duration ?? 1;
  const pct = debug.foreverMode || isLadder ? 100 : (state.timeLeft / denom) * 100;
  const wordsPlayed = state.chain.length - 1;

  return (
    <div className="stagger">
      <div
        className="hdr hdr-compact"
        onClick={onHome}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onHome();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Back to home"
      >
        <MascotIcon size={56} modeId={cfg.id} />
        <div className="wordmark">
          {cfg.name.split(' ')[0]} <span className="accent">{cfg.name.split(' ')[1]}</span>
        </div>
        {debug.foreverMode && !isLadder && <span className="forever-badge">∞</span>}
      </div>

      {/* Context strip — sits in the same slot for every mode.
          Timed modes show the countdown; ladder modes show the persistent
          goal so it can't get pushed below the fold by the on-screen
          keyboard. Shared slot keeps header height consistent across modes. */}
      {!debug.foreverMode && !isLadder && (
        <div className="timer-wrap">
          <div className="timer-row">
            <span className="timer-label">
              {state.phase === 'countdown' ? 'Starting in' : 'Time left'}
            </span>
            <span className={`timer-secs${urgent ? ' urgent' : ''}`}>
              {state.phase === 'countdown' ? state.countdown : state.timeLeft}s
            </span>
          </div>
          <div className={`timer-track${urgent ? ' urgent' : ''}`}>
            <div
              className={`timer-fill${urgent ? ' urgent' : ''}${state.phase === 'countdown' ? ' paused' : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {isLadder && state.targetWord && (
        <div className="goal-strip" aria-label={`Goal: reach ${state.targetWord}`}>
          <span className="goal-strip-label">Goal</span>
          <svg
            className="goal-strip-arrow"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
          <div className="goal-strip-tiles">
            {state.targetWord.split('').map((l, i) => (
              <div key={i} className="goal-strip-tile">
                {l}
              </div>
            ))}
          </div>
          {hintOn && state.par != null && <span className="goal-strip-par">Best: {state.par}</span>}
        </div>
      )}

      <div className="score-row">
        <div className="score-display">
          <div className="score-badge">{isLadder ? wordsPlayed : state.score}</div>
          <div className="score-sub">
            {isLadder
              ? `move${wordsPlayed !== 1 ? 's' : ''}`
              : `word${wordsPlayed !== 1 ? 's' : ''} played`}
          </div>
        </div>
        <div className="score-meta">
          <button type="button" className="btn-newword" onClick={onNewPuzzle}>
            New word
          </button>
          {isLadder && (
            <button
              type="button"
              className={`hint-btn${hintOn ? ' active' : ''}`}
              onClick={() => setHintOn((h) => !h)}
              aria-label={hintOn ? 'Hide hint' : 'Show hint'}
              aria-pressed={hintOn}
            >
              {hintOn ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a19.78 19.78 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a19.46 19.46 0 0 1-2.16 3.19" />
                  <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
              <span className="hint-tooltip">{hintOn ? 'Hide hint' : 'Show hint'}</span>
            </button>
          )}
          <button
            type="button"
            className="restart-btn"
            onClick={onRestart}
            aria-label="Restart same puzzle"
            title="Restart same puzzle"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="section-label">Current word</div>
        <div className="tile-row">
          {state.currentWord.split('').map((l, i) => {
            const isWiggle = wiggleIdx === i;
            return (
              <div
                key={`${state.acceptKey}-${i}`}
                className={`tile accept${isWiggle ? ' wiggle' : ''}`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {l}
              </div>
            );
          })}
        </div>
      </div>

      {state.deadEnd && (
        <div className="dead-end-banner">
          <div>
            <div className="dead-end-title" style={{ fontSize: 13, fontWeight: 800 }}>
              Dead end!
            </div>
            <div className="dead-end-sub" style={{ fontSize: 12, marginTop: 2 }}>
              No valid moves left from <strong>{state.currentWord}</strong>.
              {debug.foreverMode ? ' Ending game…' : ' Wait for the timer.'}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          opacity: state.deadEnd ? 0.4 : 1,
          pointerEvents: state.deadEnd ? 'none' : 'auto',
        }}
      >
        <div className="section-label">Next word</div>
        <div className={`tile-row${shaking ? ' shake' : ''}`}>
          {Array.from({ length: cfg.wordLen }, (_, i) => {
            const letter = state.typed[i] || '';
            const isCursor = i === state.typed.length && state.typed.length < cfg.wordLen;
            const isWrong = (tooMany || noChange) && typedDiffs.includes(i);
            return (
              <div
                key={i}
                className={`tile next${isCursor ? ' cursor' : ''}${isWrong ? ' wrong' : ''}`}
              >
                {letter}
              </div>
            );
          })}
        </div>
        <div className={`input-hint ${displayMsg.type}`}>{displayMsg.text || ' '}</div>
        {!isTouchDevice && (
          <div className="kbd-hint">
            type · <kbd>⌫</kbd> delete · <kbd>↵</kbd> submit
          </div>
        )}
      </div>

      {/* Goal is now in the header context strip above (.goal-strip), so
          it stays visible above the on-screen keyboard. */}

      {state.chain.length > 1 && (
        <div style={{ marginTop: 20 }}>
          <div className="section-label">Ladder</div>
          <ChainRows chain={state.chain} modeId={modeId} />
        </div>
      )}

      <Keyboard onKey={(k) => handleKeyDown({ key: k })} visible={!state.deadEnd} />
    </div>
  );
}
