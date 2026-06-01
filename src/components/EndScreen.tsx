import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { MODE_CONFIGS, type ModeId } from '../lib/modes';
import { generateShareText } from '../lib/share';
import { SHARE_URL } from '../game/constants';
import { playCelebrationSound } from '../game/sounds';
import type { ChainEntry, DebugState } from '../lib/types';
import { getBestScore, setBestScore } from '../platform/dom';
import { MascotIcon } from './MascotIcon';
import { ChainRows } from './ChainRows';

// Feature support is stable per page load — evaluate once at module
// load and read everywhere. Modern lib.dom types `share` as required
// on Navigator, so `typeof === 'function'` is the honest runtime
// check (older browsers may not have it).
const HAS_NATIVE_SHARE = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

interface BurstParticle {
  /** Index into BURST_SHAPES — vector shapes colored with the mode accent. */
  shapeIdx: number;
  dx: number;
  dy: number;
  rot: number;
  dur: number;
}

interface Burst {
  id: number;
  particles: BurstParticle[];
}

// Four small vector shapes used as confetti particles. The SVG paths
// use `currentColor` so each shape picks up the active mode's accent
// when rendered (the burst-emoji span inherits color from --accent).
const BURST_SHAPES: readonly string[] = [
  // four-point sparkle / star
  'M12 1 C12 8 16 12 23 12 C16 12 12 16 12 23 C12 16 8 12 1 12 C8 12 12 8 12 1 Z',
  // diamond
  'M12 2 L22 12 L12 22 L2 12 Z',
  // circle (full disc — drawn as a closed path for consistency)
  'M12 2 C17.523 2 22 6.477 22 12 C22 17.523 17.523 22 12 22 C6.477 22 2 17.523 2 12 C2 6.477 6.477 2 12 2 Z',
  // five-petal flower (echoes the homescreen flower row)
  'M12 1 C14.5 6 19 5 20 9 C24 11 22 16 18 16 C18 21 12 22 12 17 C12 22 6 21 6 16 C2 16 0 11 4 9 C5 5 9.5 6 12 1 Z',
];

interface EndScreenProps {
  score: number;
  chain: readonly ChainEntry[];
  deadEnd: boolean;
  onRestart: () => void;
  onHome: () => void;
  debug: DebugState;
  modeId?: ModeId;
  win?: boolean;
  target?: string;
  par?: number | null;
}

export function EndScreen({
  score,
  chain,
  deadEnd,
  onRestart,
  onHome,
  debug,
  modeId = 'classic',
  win,
  target,
  par,
}: EndScreenProps) {
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

  // Ladder par celebration — matched or beat the BFS-shortest path.
  // Win-only (a dead-end ladder is not a celebration). Par null falls
  // through silently — some pairs lack a precomputed par.
  const matchedPar = !!isLadder && !!win && par != null && score === par;
  const beatPar = !!isLadder && !!win && par != null && score < par;
  const isParCelebration = matchedPar || beatPar;

  // Auto-play the celebration sound once when the appropriate banner
  // mounts. PB takes precedence over par (can't really co-occur — ladder
  // doesn't track PB — but the priority is explicit anyway).
  useEffect(() => {
    if (isNewBest) playCelebrationSound('personalBest');
    else if (isParCelebration) playCelebrationSound('shortest');
  }, [isNewBest, isParCelebration]);

  // Vector-shape confetti on tapping a celebration banner. The two
  // callsites trigger their own celebration sound, but the burst itself
  // now cycles through BURST_SHAPES (colored with var(--accent)) so the
  // confetti always matches the active mode's brand color.
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstId = useRef(0);
  const makeBurst = useCallback((): void => {
    const id = ++burstId.current;
    const N = 14;
    const particles: BurstParticle[] = Array.from({ length: N }, (_, i) => {
      const angle = (i / N) * 360 + (Math.random() * 24 - 12);
      const dist = 130 + Math.random() * 110;
      const rad = (angle * Math.PI) / 180;
      return {
        shapeIdx: i % BURST_SHAPES.length,
        dx: Math.cos(rad) * dist,
        dy: Math.sin(rad) * dist,
        rot: (Math.random() - 0.5) * 720,
        dur: 900 + Math.random() * 500,
      };
    });
    setBursts((prev) => [...prev, { id, particles }]);
    setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== id)), 1500);
  }, []);
  const handleBurst = useCallback((): void => {
    playCelebrationSound('personalBest');
    makeBurst();
  }, [makeBurst]);
  const handleParBurst = useCallback((): void => {
    playCelebrationSound('shortest');
    makeBurst();
  }, [makeBurst]);

  const handleShare = useCallback(async (): Promise<void> => {
    const text = generateShareText(chain, score, cfg, SHARE_URL);
    try {
      if (HAS_NATIVE_SHARE) {
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
      } catch {
        /* clipboard unavailable */
      }
    }
  }, [chain, score, cfg]);

  return (
    <div className="stagger">
      <div
        className="hdr"
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
        <MascotIcon size={72} modeId={cfg.id} />
        <div className="wordmark">
          {cfg.name.split(' ')[0]} <span className="accent">{cfg.name.split(' ')[1]}</span>
        </div>
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
                ? par != null
                  ? /* Matched/beat par → banner below carries the celebration,
                       so the label stays neutral (or empty) to avoid duplication. */
                    score === par || score < par
                    ? ''
                    : `Best path: ${par} move${par !== 1 ? 's' : ''}`
                  : 'Solved it!'
                : target
                  ? `Was heading to ${target}`
                  : ''}
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
              <div
                className="dead-end-sub"
                style={{ fontSize: 13, textAlign: 'center', marginTop: 6 }}
              >
                Hit a dead end
              </div>
            )}
          </>
        )}
        {isParCelebration && (
          <button
            type="button"
            className="new-best-banner"
            onClick={handleParBurst}
            aria-label={
              beatPar ? 'Celebrate beating the best path' : 'Celebrate matching the best path'
            }
          >
            {beatPar ? 'Beat the best path!' : 'Matched the best path!'}
            {bursts.map((burst) => (
              <Fragment key={burst.id}>
                {burst.particles.map((p, i) => (
                  <span
                    key={i}
                    className="burst-emoji"
                    aria-hidden="true"
                    style={
                      {
                        '--burst-dx': `${p.dx}px`,
                        '--burst-dy': `${p.dy}px`,
                        '--burst-rot': `${p.rot}deg`,
                        '--burst-dur': `${p.dur}ms`,
                      } as CSSProperties
                    }
                  >
                    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor">
                      <path d={BURST_SHAPES[p.shapeIdx]} />
                    </svg>
                  </span>
                ))}
              </Fragment>
            ))}
          </button>
        )}
        {!debug.foreverMode && isNewBest && (
          <button
            type="button"
            className="new-best-banner"
            onClick={handleBurst}
            aria-label="Celebrate new personal best"
          >
            New personal best!
            {bursts.map((burst) => (
              <Fragment key={burst.id}>
                {burst.particles.map((p, i) => (
                  <span
                    key={i}
                    className="burst-emoji"
                    aria-hidden="true"
                    // CSS custom properties; React.CSSProperties doesn't allow arbitrary `--*` keys.
                    style={
                      {
                        '--burst-dx': `${p.dx}px`,
                        '--burst-dy': `${p.dy}px`,
                        '--burst-rot': `${p.rot}deg`,
                        '--burst-dur': `${p.dur}ms`,
                      } as CSSProperties
                    }
                  >
                    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor">
                      <path d={BURST_SHAPES[p.shapeIdx]} />
                    </svg>
                  </span>
                ))}
              </Fragment>
            ))}
          </button>
        )}
        {!debug.foreverMode && !isNewBest && currentBest > 0 && (
          <div style={{ marginTop: 12 }}>
            <span className="best-chip">
              Personal best · <strong>{currentBest} pts</strong>
            </span>
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
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            {HAS_NATIVE_SHARE ? 'Share ladder' : 'Copy ladder'}
          </button>
        )}
        {copied && <div className="share-copied">Copied to clipboard! ✓</div>}
      </div>
    </div>
  );
}
