import { useCallback, useEffect, useRef, useState } from 'react';
import { MODE_CONFIGS, tutorialPair } from '../lib/modes';
import { getPairs, getStarters, getWords } from '../data/modeData';
import { HEAD_START, MSG_DURATION } from '../game/constants';
import { bfsPath } from '../lib/bfs';
import { diffPos, getValidMoves } from '../lib/moves';
import { pickLadderPair, pickStarter } from '../lib/puzzle';
import { isTouchDevice } from '../platform/dom';
import { MascotIcon } from './MascotIcon';
import { ChainRows } from './ChainRows';
import { Keyboard } from './Keyboard';

export function PlayScreen({ puzzleSeed, onEnd, onHome, onRestart, onNewPuzzle, debug, modeId = 'classic' }) {
  const cfg = MODE_CONFIGS[modeId];
  const isLadder = !!cfg.isLadder;
  // Ladder mode skips countdown/timer entirely
  const [phase,       setPhase]       = useState(isLadder ? 'playing' : 'countdown');
  const [countdown,   setCountdown]   = useState(HEAD_START);
  const [currentWord, setCurrentWord] = useState('');
  const [targetWord,  setTargetWord]  = useState(''); // ladder mode only
  const [par,         setPar]         = useState(null);
  const [typed,       setTyped]       = useState('');
  const [, setUsedWords]              = useState(() => new Set());
  const [chain,       setChain]       = useState([]);
  const [score,       setScore]       = useState(0);
  const [timeLeft,    setTimeLeft]    = useState(cfg.duration || 0);
  const [msg,         setMsg]         = useState({ text: '', type: '' });
  const [shaking,     setShaking]     = useState(false);
  const [acceptKey,   setAcceptKey]   = useState(0);
  const [deadEnd,     setDeadEnd]     = useState(false);
  const [hintOn, setHintOn] = useState(() => localStorage.getItem('hintOn') === 'true');
  const [wiggleIdx, setWiggleIdx] = useState(null); // which tile letter to wiggle
  useEffect(() => { localStorage.setItem('hintOn', String(hintOn)); }, [hintOn]);

  const typedRef     = useRef('');
  const currentRef   = useRef('');
  const targetRef    = useRef('');
  const usedRef      = useRef(new Set());
  const streakPosRef = useRef(null);
  const streakCntRef = useRef(0);
  const scoreRef     = useRef(0);
  const chainRef     = useRef([]);
  const phaseRef     = useRef(isLadder ? 'playing' : 'countdown');
  const gameOverRef  = useRef(false);
  const msgTimer     = useRef(null);

  useEffect(() => { currentRef.current = currentWord; }, [currentWord]);
  useEffect(() => { targetRef.current  = targetWord; },  [targetWord]);
  useEffect(() => { phaseRef.current   = phase; },       [phase]);

  // ── Hint wiggle: after 15s idle, wiggle a useful tile letter ──
  // Resets whenever the player types, current word changes, or hint toggles.
  useEffect(() => {
    setWiggleIdx(null);
    if (!hintOn || phase !== 'playing' || gameOverRef.current) return;
    const t = setTimeout(() => {
      // Pick which letter position to highlight
      let idx = null;
      if (isLadder && targetRef.current) {
        const path = bfsPath(currentRef.current, targetRef.current, getWords(modeId));
        if (path && path.length > 1) {
          const next = path[1];
          for (let i = 0; i < next.length; i++) {
            if (next[i] !== currentRef.current[i]) { idx = i; break; }
          }
        }
      } else {
        // Non-ladder: pick the position with the most valid moves
        const moves = getValidMoves(
          currentRef.current, usedRef.current,
          streakPosRef.current, streakCntRef.current,
          debug.streakRule, getWords(modeId)
        );
        if (moves.length) {
          const counts = new Array(cfg.wordLen).fill(0);
          for (const m of moves) {
            for (let i = 0; i < m.length; i++) if (m[i] !== currentRef.current[i]) { counts[i]++; break; }
          }
          let best = 0;
          for (let i = 1; i < counts.length; i++) if (counts[i] > counts[best]) best = i;
          if (counts[best] > 0) idx = best;
        }
      }
      if (idx != null) setWiggleIdx(idx);
    }, 15000);
    return () => clearTimeout(t);
  }, [hintOn, phase, typed, currentWord, acceptKey, isLadder, debug.streakRule, modeId, cfg]);

  useEffect(() => {
    let start, target = '', parVal = null;
    if (isLadder) {
      const pair = pickLadderPair(getPairs(modeId), tutorialPair(cfg), puzzleSeed);
      start  = pair.start;
      target = pair.end;
      parVal = pair.par;
      targetRef.current = target;
      setTargetWord(target);
      setPar(parVal);
    } else {
      start = pickStarter(getStarters(modeId), getWords(modeId), cfg.tutorialStart, puzzleSeed);
    }
    const s = new Set([start]);
    currentRef.current = start;
    usedRef.current    = s;
    chainRef.current   = [{ word: start, pts: null }];
    setCurrentWord(start);
    setUsedWords(s);
    setChain([{ word: start, pts: null }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown
  useEffect(() => {
    if (phase !== 'countdown') return;
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(id); setPhase('playing'); phaseRef.current = 'playing'; return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Timer — skipped for ladder mode and forever mode
  useEffect(() => {
    if (phase !== 'playing' || debug.foreverMode || isLadder) return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(id);
          gameOverRef.current = true;
          setTimeout(() => onEnd({ score: scoreRef.current, chain: chainRef.current, deadEnd: false }), 300);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, debug.foreverMode, isLadder, onEnd]);

  const showMsg = useCallback((text, type) => {
    clearTimeout(msgTimer.current);
    setMsg({ text, type });
    msgTimer.current = setTimeout(() => setMsg({ text:'', type:'' }), MSG_DURATION);
  }, []);

  const triggerShake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 320);
  }, []);

  const submitWord = useCallback((word) => {
    if (gameOverRef.current) return;
    const upper = word.toUpperCase();
    const cur   = currentRef.current;
    if (!getWords(modeId).has(upper)) { showMsg('Not a word', 'error'); triggerShake(); return; }
    const diffs = diffPos(cur, upper);
    if (diffs.length !== 1) {
      showMsg(diffs.length === 0 ? 'Same as current word' : 'Change exactly one letter', 'error');
      triggerShake(); return;
    }
    if (usedRef.current.has(upper)) { showMsg('Already used', 'error'); triggerShake(); return; }
    const pos = diffs[0];
    // Streak rule applies only to timed/forever (free-form) modes, not ladder.
    const newStreakCnt = (streakPosRef.current === pos) ? streakCntRef.current + 1 : 1;
    if (!isLadder && debug.streakRule && newStreakCnt >= 3) {
      showMsg(`Can't change letter ${pos + 1} three times`, 'error');
      triggerShake(); return;
    }
    const pts      = cfg.posPts[pos];
    const newScore = scoreRef.current + pts;
    const newUsed  = new Set([...usedRef.current, upper]);
    const newChain = [...chainRef.current, { word: upper, pts }];
    scoreRef.current    = newScore;
    usedRef.current     = newUsed;
    chainRef.current    = newChain;
    streakPosRef.current = pos;
    streakCntRef.current = newStreakCnt;
    typedRef.current = '';
    setTyped('');
    setCurrentWord(upper);
    setUsedWords(newUsed);
    setChain(newChain);
    setScore(newScore);
    setAcceptKey(k => k + 1);

    // Ladder mode: check if we've hit the target → solved!
    if (isLadder && upper === targetRef.current) {
      gameOverRef.current = true;
      showMsg('Solved!', 'ok');
      setTimeout(() => onEnd({
        score: newChain.length - 1, // moves taken
        chain: newChain,
        deadEnd: false,
        win: true,
        target: targetRef.current,
        par,
      }), 700);
      return;
    }

    showMsg(isLadder ? '✓' : `+${pts} pt${pts !== 1 ? 's' : ''}`, 'ok');

    // Dead-end detection (skipped in ladder — backtracking is fine there)
    if (!isLadder) {
      const moves = getValidMoves(upper, newUsed, pos, newStreakCnt, debug.streakRule, getWords(modeId));
      if (moves.length === 0) {
        setDeadEnd(true);
        if (debug.foreverMode) {
          gameOverRef.current = true;
          setTimeout(() => onEnd({ score: newScore, chain: newChain, deadEnd: true }), 1800);
        }
      }
    }
  }, [isLadder, par, debug.streakRule, debug.foreverMode, showMsg, triggerShake, onEnd, modeId, cfg]);

  const handleKeyDown = useCallback((e) => {
    if (gameOverRef.current) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (phaseRef.current === 'countdown' && /^[a-zA-Z]$/.test(e.key)) {
      setPhase('playing'); phaseRef.current = 'playing';
    }
    if (phaseRef.current !== 'playing') return;
    if (e.key === 'Enter') {
      if (typedRef.current.length === cfg.wordLen) submitWord(typedRef.current);
    } else if (e.key === 'Backspace') {
      const next = typedRef.current.slice(0, -1);
      typedRef.current = next; setTyped(next);
      setMsg({ text:'', type:'' });
    } else if (/^[a-zA-Z]$/.test(e.key) && typedRef.current.length < cfg.wordLen) {
      const next = typedRef.current + e.key.toUpperCase();
      typedRef.current = next; setTyped(next);
      if (next.length === cfg.wordLen) submitWord(next);
    }
  }, [submitWord, cfg]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Real-time validation
  const typedDiffs      = typed.length === cfg.wordLen ? diffPos(currentWord, typed) : [];
  const tooMany         = typedDiffs.length > 1;
  const noChange        = typedDiffs.length === 0 && typed.length === cfg.wordLen;
  const persistentError = tooMany
    ? `Changed ${typedDiffs.length} letters — change just 1`
    : noChange ? 'Same as current word' : '';
  const displayMsg = persistentError ? { text: persistentError, type: 'error' } : msg;

  const urgent      = !isLadder && timeLeft <= 10 && !debug.foreverMode;
  const pct         = (debug.foreverMode || isLadder) ? 100 : (timeLeft / cfg.duration) * 100;
  const wordsPlayed = chain.length - 1;

  return (
    <div className="stagger">
      <div
        className="hdr"
        onClick={onHome}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onHome(); } }}
        role="button"
        tabIndex={0}
        aria-label="Back to home"
      >
        <MascotIcon size={72} modeId={cfg.id} />
        <div className="wordmark">{cfg.name.split(' ')[0]} <span className="accent">{cfg.name.split(' ')[1]}</span></div>
        {debug.foreverMode && !isLadder && <span className="forever-badge">∞</span>}
      </div>

      {/* Goal banner for ladder mode */}
      {isLadder && targetWord && (
        <div className="ladder-goal">
          <span className="ladder-goal-label">Get to</span>
          <div className="ladder-goal-tiles">
            {targetWord.split('').map((l, i) => (
              <div key={i} className="tile ladder-target-tile">{l}</div>
            ))}
          </div>
          {hintOn && par != null && (
            <div className="ladder-goal-par">Best path: {par} move{par !== 1 ? 's' : ''}</div>
          )}
        </div>
      )}

      {!debug.foreverMode && !isLadder && (
        <div className="timer-wrap">
          <div className="timer-row">
            <span className="timer-label">
              {phase === 'countdown' ? 'Starting in' : 'Time left'}
            </span>
            <span className={`timer-secs${urgent ? ' urgent' : ''}`}>
              {phase === 'countdown' ? countdown : timeLeft}s
            </span>
          </div>
          <div className={`timer-track${urgent ? ' urgent' : ''}`}>
            <div className={`timer-fill${urgent ? ' urgent' : ''}${phase === 'countdown' ? ' paused' : ''}`}
              style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="score-row">
        <div className="score-display">
          <div className="score-badge">{isLadder ? wordsPlayed : score}</div>
          <div className="score-sub">
            {isLadder
              ? `move${wordsPlayed !== 1 ? 's' : ''}`
              : `word${wordsPlayed !== 1 ? 's' : ''} played`}
          </div>
        </div>
        <div className="score-meta">
          <button
            type="button"
            className="btn-newword"
            onClick={onNewPuzzle}
          >
            New word
          </button>
          <button
            type="button"
            className={`hint-btn${hintOn ? ' active' : ''}`}
            onClick={() => setHintOn(h => !h)}
            aria-label={hintOn ? 'Hide hint' : 'Show hint'}
            aria-pressed={hintOn}
          >
            {hintOn ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a19.78 19.78 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a19.46 19.46 0 0 1-2.16 3.19"/>
                <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            )}
            <span className="hint-tooltip">{hintOn ? 'Hide hint' : 'Show hint'}</span>
          </button>
          <button
            type="button"
            className="restart-btn"
            onClick={onRestart}
            aria-label="Restart same puzzle"
            title="Restart same puzzle"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="section-label">Current word</div>
        <div className="tile-row">
          {currentWord.split('').map((l, i) => {
            const isWiggle = wiggleIdx === i && typed.length === 0;
            return (
              <div
                key={`${acceptKey}-${i}`}
                className={`tile accept${isWiggle ? ' wiggle' : ''}`}
                style={{ animationDelay: `${i * 40}ms` }}
              >{l}</div>
            );
          })}
        </div>
      </div>

      {deadEnd && (
        <div className="dead-end-banner">
          <span style={{ fontSize: 20 }}>{cfg.shareEmoji}</span>
          <div>
            <div className="dead-end-title" style={{ fontSize: 13, fontWeight: 800 }}>Dead end!</div>
            <div className="dead-end-sub" style={{ fontSize: 12, marginTop: 2 }}>
              No valid moves left from <strong>{currentWord}</strong>.
              {debug.foreverMode ? ' Ending game…' : ' Wait for the timer.'}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, opacity: deadEnd ? 0.4 : 1, pointerEvents: deadEnd ? 'none' : 'auto' }}>
        <div className="section-label">Next word</div>
        <div className={`tile-row${shaking ? ' shake' : ''}`}>
          {Array.from({ length: cfg.wordLen }, (_, i) => {
            const letter   = typed[i] || '';
            const isCursor = i === typed.length && typed.length < cfg.wordLen;
            const isWrong  = (tooMany || noChange) && typedDiffs.includes(i);
            return (
              <div key={i} className={`tile${isCursor ? ' cursor' : ''}${isWrong ? ' wrong' : ''}`}>{letter}</div>
            );
          })}
        </div>
        <div className={`input-hint ${displayMsg.type}`}>{displayMsg.text || ' '}</div>
        {!isTouchDevice && (
          <div className="kbd-hint">type · <kbd>⌫</kbd> delete · <kbd>↵</kbd> submit</div>
        )}
      </div>

      {chain.length > 1 && (
        <div style={{ marginTop: 20 }}>
          <div className="section-label">Ladder</div>
          <ChainRows chain={chain} modeId={modeId} />
        </div>
      )}

      <Keyboard onKey={k => handleKeyDown({ key: k })} visible={!deadEnd} />
    </div>
  );
}
