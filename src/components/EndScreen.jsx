import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { MODE_CONFIGS } from '../lib/modes';
import { generateShareText } from '../game/helpers';
import { getBestScore, setBestScore } from '../platform/dom';
import { MascotIcon } from './MascotIcon';
import { ChainRows } from './ChainRows';

export function EndScreen({ score, chain, deadEnd, onRestart, onHome, debug, modeId = 'classic', win, target, par }) {
  const cfg = MODE_CONFIGS[modeId];
  const isLadder = !!cfg.isLadder;
  const [copied, setCopied] = useState(false);
  const wordsPlayed = chain.length - 1;

  // Best score: only tracked for timed runs.
  // Ladder mode + forever mode don't write to personal-best.
  const previousBest = useRef(getBestScore(modeId)).current;
  const isNewBest = !isLadder && !debug.foreverMode && score > 0 && score > previousBest;
  useEffect(() => {
    if (isNewBest) setBestScore(modeId, score);
  }, [isNewBest, modeId, score]);
  const currentBest = isNewBest ? score : previousBest;

  // Emoji burst on tapping the new-best banner
  const [bursts, setBursts] = useState([]);
  const burstId = useRef(0);
  const handleBurst = useCallback(() => {
    const emojis = modeId === 'soyboy' ? ['🫛'] : ['🐷', '🪽'];
    const id = ++burstId.current;
    const N = 14;
    const particles = Array.from({ length: N }, (_, i) => {
      const angle = (i / N) * 360 + (Math.random() * 24 - 12);
      const dist  = 130 + Math.random() * 110;
      const rad   = (angle * Math.PI) / 180;
      return {
        emoji: emojis[i % emojis.length],
        dx: Math.cos(rad) * dist,
        dy: Math.sin(rad) * dist,
        rot: (Math.random() - 0.5) * 720,
        dur: 900 + Math.random() * 500,
      };
    });
    setBursts(prev => [...prev, { id, particles }]);
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 1500);
  }, [modeId]);

  const handleShare = useCallback(async () => {
    const text = generateShareText(chain, score, modeId);
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch { /* clipboard unavailable */ }
    }
  }, [chain, score, modeId]);

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
      </div>

      {/* Score readout */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        {isLadder ? (
          <>
            <div className="end-score" style={{ color: win ? 'var(--accent)' : 'var(--dark)' }}>
              {win ? `${score} move${score !== 1 ? 's' : ''}` : 'Gave up'}
            </div>
            <div className="end-score-label">
              {win
                ? (par != null
                    ? (score === par
                        ? `🎯 You matched the best path of ${par}!`
                        : score < par
                          ? `🏆 Beat the best path of ${par}!`
                          : `Best path: ${par} move${par !== 1 ? 's' : ''}`)
                    : 'Solved it!')
                : (target ? `Was heading to ${target}` : '')}
            </div>
          </>
        ) : (
          <>
            <div className="end-score">{debug.foreverMode ? wordsPlayed : score}</div>
            <div className="end-score-label">
              {debug.foreverMode
                ? `${wordsPlayed} word${wordsPlayed !== 1 ? 's' : ''} in ladder`
                : `${wordsPlayed} word${wordsPlayed !== 1 ? 's' : ''} · ${score} point${score !== 1 ? 's' : ''}`}
            </div>
            {deadEnd && (
              <div className="dead-end-sub" style={{ fontSize: 13, textAlign: 'center', marginTop: 6 }}>
                {`Hit a dead end ${modeId === 'soyboy' ? '🫛' : '🐷'}`}
              </div>
            )}
          </>
        )}
        {!debug.foreverMode && isNewBest && (
          <button
            type="button"
            className="new-best-banner"
            onClick={handleBurst}
            aria-label="Celebrate new personal best"
          >
            🏆 New personal best!
            {bursts.map(burst => (
              <Fragment key={burst.id}>
                {burst.particles.map((p, i) => (
                  <span
                    key={i}
                    className="burst-emoji"
                    aria-hidden="true"
                    style={{
                      '--burst-dx':  `${p.dx}px`,
                      '--burst-dy':  `${p.dy}px`,
                      '--burst-rot': `${p.rot}deg`,
                      '--burst-dur': `${p.dur}ms`,
                    }}
                  >{p.emoji}</span>
                ))}
              </Fragment>
            ))}
          </button>
        )}
        {!debug.foreverMode && !isNewBest && currentBest > 0 && (
          <div style={{ marginTop: 12 }}>
            <span className="best-chip">Personal best · <strong>{currentBest} pts</strong></span>
          </div>
        )}
      </div>

      {/* Ladder */}
      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <div className="section-label">Ladder</div>
        <ChainRows chain={chain} maxHeight={260} modeId={modeId} />
      </div>

      {/* Actions */}
      <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn btn-primary btn-full" onClick={onRestart}>
          {isLadder ? 'Next puzzle' : 'Play again'}
        </button>
        {!debug.foreverMode && !isLadder && (
          <button className="btn btn-copy btn-full" onClick={handleShare}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            {navigator.share ? 'Share ladder' : 'Copy ladder'}
          </button>
        )}
        {copied && <div className="share-copied">Copied to clipboard! ✓</div>}
      </div>
    </div>
  );
}
