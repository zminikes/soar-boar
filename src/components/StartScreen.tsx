import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { MODE_CONFIGS, type ModeId } from '../lib/modes';
import type { DebugState } from '../lib/types';
import { getBestScore } from '../platform/dom';
import { prefetchOtherModeSvgs } from '../data/svgData';
import { START_MASCOT_ACCENTS } from '../game/constants';
import { playFlowerSound } from '../game/sounds';
import { AnimatedMascot } from './AnimatedMascot';
import { Toggle } from './Toggle';
import { ExperimentsPanel } from './ExperimentsPanel';
import { DemoSection } from './DemoSection';
import { FlyingPig } from './FlyingPig';
import { EmailSignup } from './EmailSignup';

interface PrefRow {
  key: keyof DebugState;
  label: string;
  sub: string;
}

const PREF_ROWS: PrefRow[] = [
  {
    key: 'streakRule',
    label: 'Position streak rule',
    sub: 'Forces variety — no changing the same position 3 turns in a row',
  },
  { key: 'foreverMode', label: 'Forever mode', sub: 'No timer — play at your own pace' },
  { key: 'darkMode', label: 'Dark mode', sub: 'Easy on the eyes' },
];

interface StartScreenProps {
  onStart: () => void;
  onStartForever: () => void;
  onTutorial: () => void;
  debug: DebugState;
  setDebug: Dispatch<SetStateAction<DebugState>>;
  modeId: ModeId;
  setModeId: Dispatch<SetStateAction<ModeId>>;
  debugMode: boolean;
}

/* Tiles-style minimal landing.
   Mode switcher is a pill-shaped segmented control with both mascots
   visible at once — you "peek" into each mode just by seeing the tabs. */
export function StartScreen({
  onStart,
  onStartForever,
  onTutorial,
  debug,
  setDebug,
  modeId,
  setModeId,
  debugMode,
}: StartScreenProps) {
  const cfg = MODE_CONFIGS[modeId];
  const [showPrefs, setShowPrefs] = useState(false);
  const bestScore = getBestScore(modeId);

  // Background-fetch the other modes' SVG chunks while the user is on
  // the start screen so a mode tile click feels instant. Idempotent —
  // Vite's module cache dedupes repeat imports.
  useEffect(() => {
    prefetchOtherModeSvgs(modeId);
  }, [modeId]);

  // Hero crossfade key — re-keys on mode change so the mascot+wordmark
  // gently fade rather than swap abruptly.
  // Ambient flower-rotation — every ~2.6s pick a random flower index
  // and toggle its rotated state. The CSS handles the 90deg snap.
  const [rotatedFlowerIdx, setRotatedFlowerIdx] = useState<number | null>(null);
  const prevFlowerIdxRef = useRef<number | null>(null);
  useEffect(() => {
    const tick = (): void => {
      // Avoid picking the same flower twice in a row.
      let next = Math.floor(Math.random() * 4);
      if (next === prevFlowerIdxRef.current) next = (next + 1) % 4;
      prevFlowerIdxRef.current = next;
      setRotatedFlowerIdx(next);
    };
    tick(); // kick off immediately so the page feels alive
    const id = setInterval(tick, 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`stagger simple-start simple-start-${modeId}`}>
      {/* Segmented pill — both modes always visible, text-only */}
      <div className="simple-segmented-wrap">
        <div className="mode-segmented" role="tablist" aria-label="Choose mode">
          {Object.values(MODE_CONFIGS).map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={modeId === m.id}
              className={`seg-tab${modeId === m.id ? ' active' : ''}`}
              onClick={() => setModeId(m.id)}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Hero — lowercase wordmark with the mascot rendered INLINE between
          the two words (e.g. "soar 🐷 boar"). Tagline sits directly below.
          Keyed on mode so the whole block cross-fades on switch.

          Each letter gets a continuous index across both words so the
          hover wiggle cascades smoothly through the wordmark (CSS
          :nth-child resets per .word, so we set animation-delay inline
          here from the global letter index). */}
      <div className="simple-hero" key={modeId}>
        <div className={`simple-wordmark wordmark-${modeId}`}>
          {(() => {
            const [first, second] = cfg.name.split(' ').map((w) => w.toLowerCase());
            return (
              <>
                <span className="word">
                  {first.split('').map((ch, i) => (
                    <span
                      key={`a${i}`}
                      className="letter"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      {ch}
                    </span>
                  ))}
                </span>
                <span className="wordmark-mascot" aria-hidden="true">
                  <AnimatedMascot
                    size={120}
                    modeId={modeId}
                    colorOverride={START_MASCOT_ACCENTS[modeId]}
                  />
                </span>
                <span className="word">
                  {second.split('').map((ch, i) => (
                    <span
                      key={`b${i}`}
                      className="letter"
                      style={{ animationDelay: `${(first.length + 1 + i) * 50}ms` }}
                    >
                      {ch}
                    </span>
                  ))}
                </span>
              </>
            );
          })()}
        </div>
        <p className="simple-tagline">{cfg.tagline}</p>
      </div>

      <div className="simple-actions">
        <button className="btn btn-dark btn-full" onClick={onStart}>
          Play
        </button>
        <div className="simple-footer">
          <button className="simple-link" onClick={onTutorial}>
            Show me how
          </button>
          <span className="simple-footer-sep" aria-hidden="true">
            •
          </span>
          <button
            className="simple-link"
            onClick={() => setShowPrefs((p) => !p)}
            aria-expanded={showPrefs}
          >
            Preferences
          </button>
        </div>
        {bestScore > 0 && (
          <div className="simple-best">
            <span className="simple-best-label">Personal best</span>
            <span className="simple-best-sep" aria-hidden="true">
              •
            </span>
            <span className="simple-best-value">{bestScore}</span>
          </div>
        )}
      </div>

      <div className={`prefs-collapse${showPrefs ? ' open' : ''}`} aria-hidden={!showPrefs}>
        <div>
          <div className="info-card" style={{ marginTop: 16 }}>
            <div className="info-card-title">Preferences</div>
            {PREF_ROWS.filter((p) => !(modeId === 'thisthat' && p.key === 'foreverMode')).map(
              ({ key, label, sub }) => (
                <div key={key} className="prefs-row">
                  <div>
                    <div className="prefs-label">{label}</div>
                    <div className="prefs-sub">{sub}</div>
                  </div>
                  <Toggle
                    checked={debug[key]}
                    onChange={(v) => setDebug((d) => ({ ...d, [key]: v }))}
                    label={label}
                  />
                </div>
              ),
            )}
            {debugMode && <ExperimentsPanel debug={debug} setDebug={setDebug} />}
          </div>
        </div>
      </div>

      <DemoSection modeId={modeId} onStart={onStart} onStartForever={onStartForever} />
      {/* Big flying pig only on Soar Boar — Soy Boy + This That hide
          it per the pilot design (their own modes don't have a pig). */}
      {modeId === 'classic' && <FlyingPig />}
      <EmailSignup />

      {/* Decorative flower row anchored to the very bottom of the page.
          Each flower clicks for a cute tone (playFlowerSound) and the
          ambient interval above rotates ONE of them 90° at a time, in a
          random order, so the row feels gently alive. Shapes defined as
          SVG mask-images in global.css so they tint by background-color
          (currently solid black per the design). */}
      <div className="simple-flowers" role="group" aria-label="Decorative flowers">
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            type="button"
            className={`simple-flower simple-flower-${i + 1}${
              rotatedFlowerIdx === i ? ' rotated' : ''
            }`}
            onClick={() => playFlowerSound(i)}
            aria-label={`Flower ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
