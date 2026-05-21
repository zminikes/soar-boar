import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { MODE_CONFIGS } from '../lib/modes';
import { getWords } from '../data/modeData';
import { MSG_DURATION } from '../game/constants';
import { diffPos } from '../lib/moves';
import { isTouchDevice } from '../platform/dom';
import { Confetti } from './Confetti';
import { Keyboard } from './Keyboard';

export function OnboardingScreen({ onDone, onDoneForever, onBack, modeId = 'classic' }) {
  const cfg      = MODE_CONFIGS[modeId];
  const isLadder = !!cfg.isLadder;
  const words = cfg.tutorialWords;   // e.g. ['SOAR','BOAR','BEAR']
  const hints = cfg.tutorialHints;   // typed words auto-submit, no enter prompt

  const [step,           setStep]           = useState(0);
  const [typed,          setTyped]          = useState('');
  const [msg,            setMsg]            = useState({ text: '', type: '' });
  const [shaking,        setShaking]        = useState(false);
  const [completedSteps, setCompletedSteps] = useState([]); // [{word, pts, changedIdx}]
  const [done,           setDone]           = useState(false);
  const typedRef  = useRef('');
  const msgTimer  = useRef(null);

  const fromWord = words[step];

  const showMsg = useCallback((text, type) => {
    clearTimeout(msgTimer.current);
    setMsg({ text, type });
    msgTimer.current = setTimeout(() => setMsg({ text:'', type:'' }), MSG_DURATION);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (done) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tryShake = () => { setShaking(true); setTimeout(() => setShaking(false), 280); };
    const attemptSubmit = (word) => {
      if (word.length !== cfg.wordLen) return;
      if (!getWords(modeId).has(word)) { showMsg('Not a word', 'error'); tryShake(); return; }
      const diffs = diffPos(fromWord, word);
      if (diffs.length === 0) { showMsg('Same word — change one letter!', 'error'); tryShake(); return; }
      if (diffs.length > 1)  { showMsg('Change exactly one letter', 'error'); tryShake(); return; }
      const changedIdx = diffs[0];
      const pts = cfg.posPts[changedIdx];
      const newCompleted = [...completedSteps, { word, pts, changedIdx }];
      setCompletedSteps(newCompleted);
      const nextStep = step + 1;
      if (nextStep >= words.length - 1) {
        setDone(true);
      } else {
        setStep(nextStep);
        typedRef.current = ''; setTyped('');
        setMsg({ text: '', type: '' });
      }
    };
    if (e.key === 'Enter') {
      attemptSubmit(typedRef.current);
    } else if (e.key === 'Backspace') {
      const next = typedRef.current.slice(0, -1);
      typedRef.current = next; setTyped(next);
      setMsg({ text:'', type:'' });
    } else if (/^[a-zA-Z]$/.test(e.key) && typedRef.current.length < cfg.wordLen) {
      const next = typedRef.current + e.key.toUpperCase();
      typedRef.current = next; setTyped(next);
      if (next.length === cfg.wordLen) attemptSubmit(next);
    }
  }, [done, step, fromWord, completedSteps, showMsg, cfg, modeId, words.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const typedDiffs      = typed.length === cfg.wordLen ? diffPos(fromWord, typed) : [];
  const tooMany         = typedDiffs.length > 1;
  const persistentError = tooMany ? `Changed ${typedDiffs.length} letters — change just 1` : '';
  const displayMsg      = persistentError ? { text: persistentError, type: 'error' } : msg;
  const totalPts        = completedSteps.reduce((s, x) => s + x.pts, 0);

  return (
    <div className="stagger">

      {/* Back nav */}
      <div style={{ paddingTop: 20, paddingBottom: 4 }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--ff-sans)', fontSize: 14, fontWeight: 500,
            color: 'var(--muted)', padding: '12px 0', /* 44px tap height */
            touchAction: 'manipulation',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
      </div>

      {/* Hero */}
      <div className="start-hero" style={{ paddingTop: 12 }}>
        <div style={{
          fontFamily: 'var(--ff-sans)', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)',
        }}>Tutorial · {cfg.name}</div>
        <div className="hero-wordmark" style={{ fontSize: 36, marginTop: 6, letterSpacing: '0.03em' }}>
          {isLadder ? 'Reach the target' : 'Change one letter'}
        </div>

      </div>

      {/* Goal banner — ladder mode only */}
      {isLadder && (
        <div className="ladder-goal" style={{ marginTop: 16 }}>
          <span className="ladder-goal-label">Get to</span>
          <div className="ladder-goal-tiles">
            {cfg.tutorialTarget.split('').map((l, i) => (
              <div key={i} className="tile ladder-target-tile">{l}</div>
            ))}
          </div>
        </div>
      )}

      {/* Game board */}
      <div className="info-card" style={{ marginTop: 20 }}>

        {/* Starting word — always visible */}
        <div className="section-label" style={{ marginBottom: 12 }}>Starting word</div>
        <div className="tile-row">
          {words[0].split('').map((l, i) => (
            <div key={i} className="tile">{l}</div>
          ))}
        </div>

        {/* Completed steps — chain builds up */}
        {completedSteps.map((s, i) => (
          <Fragment key={i}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '8px 0' }}>
              <span style={{ fontSize: 22, color: 'var(--tutorial-accent)' }}>↓</span>
              {!isLadder && (
                <span style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--tutorial-accent)',
                  fontFamily: 'var(--ff-sans)', animation: 'fadeIn 300ms ease',
                  background: 'var(--tutorial-accent-bg)', borderRadius: 999,
                  padding: '2px 10px', letterSpacing: '0.02em',
                }}>+{s.pts} pt{s.pts !== 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="tile-row" style={{ animation: 'fadeIn 240ms ease' }}>
              {s.word.split('').map((l, j) => (
                <div key={j} className={`tile${j === s.changedIdx ? ' changed-ok' : ''}`}
                  style={{ animationDelay: `${j * 40}ms` }}>
                  {l}
                </div>
              ))}
            </div>
          </Fragment>
        ))}

        {/* Active input row */}
        {!done && (
          <>
            <div className="onboard-arrow">↓</div>
            <div style={{
              fontFamily: 'var(--ff-sans)', fontSize: 14, fontWeight: 600,
              color: 'var(--dark)', textAlign: 'center', marginBottom: 12,
              animation: 'fadeIn 200ms ease',
            }}>{hints[step]}</div>
            <div className={`tile-row${shaking ? ' shake' : ''}`}>
              {Array.from({ length: cfg.wordLen }, (_, i) => {
                const letter   = typed[i] || '';
                const isCursor = i === typed.length && typed.length < cfg.wordLen;
                const isWrong  = tooMany && typedDiffs.includes(i);
                return (
                  <div key={i} className={`tile${isCursor ? ' cursor' : ''}${isWrong ? ' wrong' : ''}`}>
                    {letter}
                  </div>
                );
              })}
            </div>
            <div className={`input-hint ${displayMsg.type}`}>{displayMsg.text || ' '}</div>
            {!isTouchDevice && (
              <div className="kbd-hint">type a word · <kbd>↵</kbd> to submit</div>
            )}
          </>
        )}

        {/* All done — confetti + summary */}
        {done && (
          <>
            <Confetti />
            <div className="onboard-success">
              <div className="onboard-success-emoji">🎉</div>
              <div className="onboard-success-title">You’ve got it!</div>
              <div className="onboard-success-sub">
                {isLadder
                  ? <>You reached <strong>{cfg.tutorialTarget}</strong> in {completedSteps.length} move{completedSteps.length !== 1 ? 's' : ''}. The real puzzles are tougher — try to find the shortest path.</>
                  : <>{totalPts} point{totalPts !== 1 ? 's' : ''} in {completedSteps.length} moves. Now do that as fast as you can — {cfg.duration} seconds on the clock.</>}
              </div>
            </div>
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-primary btn-full" onClick={onDone}>
                Let’s play!
              </button>
              {!isLadder && (
                <button className="btn btn-ghost btn-full" onClick={onDoneForever}>
                  Try forever mode (no timer)
                </button>
              )}
            </div>
          </>
        )}

      </div>

      <Keyboard onKey={k => handleKeyDown({ key: k })} visible={!done} />
    </div>
  );
}
