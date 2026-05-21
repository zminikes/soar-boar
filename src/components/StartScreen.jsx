import { useState } from 'react';
import { MODES } from '../game/modes';
import { getBestScore } from '../platform/dom';
import { AnimatedMascot } from './AnimatedMascot';
import { Toggle } from './Toggle';
import { ExperimentsPanel } from './ExperimentsPanel';
import { DemoSection } from './DemoSection';
import { FlyingPig } from './FlyingPig';
import { EmailSignup } from './EmailSignup';

/* Tiles-style minimal landing.
   Mode switcher is a pill-shaped segmented control with both mascots
   visible at once — you "peek" into each mode just by seeing the tabs. */
export function StartScreen({ onStart, onStartForever, onTutorial, debug, setDebug, modeId, setModeId, debugMode }) {
  const cfg = MODES[modeId];
  const [showPrefs, setShowPrefs] = useState(false);
  const bestScore = getBestScore(modeId);

  // Hero crossfade key — re-keys on mode change so the mascot+wordmark
  // gently fade rather than swap abruptly.
  return (
    <div className="stagger simple-start">

      {/* Segmented pill — both modes always visible, text-only */}
      <div className="simple-segmented-wrap">
        <div className="mode-segmented" role="tablist" aria-label="Choose mode">
          {Object.values(MODES).map(m => (
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

      {/* Hero — inner div is re-keyed to crossfade on mode change,
          outer participates in the stagger entrance */}
      <div className="simple-hero">
        <div key={modeId} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          animation: 'fadeIn 280ms var(--ease-out)',
        }}>
          <AnimatedMascot size={120} modeId={modeId} />
          <div className="simple-wordmark">
            {cfg.name.split(' ')[0].split('').map((ch, i) => (
              <span key={`a${i}`} className="letter">{ch}</span>
            ))}
            {' '}
            <span className="accent">
              {cfg.name.split(' ')[1].split('').map((ch, i) => (
                <span key={`b${i}`} className="letter">{ch}</span>
              ))}
            </span>
          </div>
          <div className="simple-tag">
            {cfg.isLadder ? <>Reach the target word.</> : <>Change one letter.</>}<br />
            <span className="simple-tag-meta">
              {cfg.isLadder
                ? `${cfg.wordLen}-letter words · word ladder`
                : `${cfg.wordLen}-letter words · ${cfg.duration} seconds`}
            </span>
          </div>
        </div>
      </div>

      <div className="simple-actions">
        <button className="btn btn-dark btn-full" onClick={onStart}>
          Play
        </button>
      </div>

      <div className="simple-footer">
        <button className="simple-link" onClick={onTutorial}>Show me how</button>
        <button className="simple-link" onClick={() => setShowPrefs(p => !p)} aria-expanded={showPrefs}>
          Preferences
        </button>
      </div>

      <div className={`prefs-collapse${showPrefs ? ' open' : ''}`} aria-hidden={!showPrefs}>
        <div>
          <div className="info-card" style={{ marginTop: 16 }}>
            <div className="info-card-title">Preferences</div>
            {[
              { key: 'streakRule',  label: 'Position streak rule', sub: 'Forces variety — no changing the same position 3 turns in a row' },
              { key: 'foreverMode', label: 'Forever mode',         sub: 'No timer — play at your own pace' },
              { key: 'darkMode',    label: 'Dark mode',            sub: 'Easy on the eyes' },
            ].filter(p => !(modeId === 'thisthat' && p.key === 'foreverMode')).map(({ key, label, sub }) => (
              <div key={key} className="prefs-row">
                <div><div className="prefs-label">{label}</div><div className="prefs-sub">{sub}</div></div>
                <Toggle checked={debug[key]} onChange={v => setDebug(d => ({ ...d, [key]: v }))} label={label} />
              </div>
            ))}
            {debugMode && <ExperimentsPanel debug={debug} setDebug={setDebug} />}
          </div>
        </div>
      </div>

      {bestScore > 0 && (
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <span className="best-chip">Personal best · <strong>{bestScore} pts</strong></span>
        </div>
      )}

      <DemoSection modeId={modeId} onStart={onStart} onStartForever={onStartForever} />
      <FlyingPig />
      <EmailSignup />
    </div>
  );
}
