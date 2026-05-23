import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { DEFAULT_COLORS } from '../game/constants';
import type { ColorOverrides } from '../game/appContext';
import { MODE_CONFIGS, type ModeId } from '../lib/modes';
import { contrastRatio, wcagLevel, type WcagLevel } from '../lib/colorMath';
import { HsvPicker } from './HsvPicker';

type SwatchKind = 'bg' | 'accent';
// Either a "<mode>.<kind>" key (per-mode start-screen swatches) or the
// shared sentinel 'gameplay.bg' for the play/end-screen background.
type SwatchKey = `${ModeId}.${SwatchKind}` | 'gameplay.bg';

interface Swatch {
  key: SwatchKey;
  label: string;
}

const SWATCHES: Swatch[] = [
  { key: 'classic.bg', label: 'Soar Boar BG' },
  { key: 'classic.accent', label: 'Soar Boar Accent' },
  { key: 'soyboy.bg', label: 'Soy Boy BG' },
  { key: 'soyboy.accent', label: 'Soy Boy Accent' },
  { key: 'thisthat.bg', label: 'This That BG' },
  { key: 'thisthat.accent', label: 'This That Accent' },
  { key: 'gameplay.bg', label: 'Gameplay BG' },
];

// Default cream used on game/end screens — matches the --cream token
// in global.css. Picker shows this until the user overrides.
const GAMEPLAY_BG_DEFAULT = '#F8F1E5';

function isModeKey(key: SwatchKey): key is `${ModeId}.${SwatchKind}` {
  return key !== 'gameplay.bg';
}

function parseModeKey(key: `${ModeId}.${SwatchKind}`): [ModeId, SwatchKind] {
  return key.split('.') as [ModeId, SwatchKind];
}

type Screen = 'start' | 'tutorial' | 'playing' | 'end';

interface FloatingColorPickerProps {
  colorOverrides: ColorOverrides;
  setColorOverrides: Dispatch<SetStateAction<ColorOverrides>>;
  modeId: ModeId;
  screen: Screen;
}

export function FloatingColorPicker({
  colorOverrides,
  setColorOverrides,
  modeId,
  screen,
}: FloatingColorPickerProps) {
  const [open, setOpen] = useState(true);
  // On play/end, default to the new Gameplay BG swatch — that's the one
  // the user is most likely tweaking when the picker is opened there.
  const onGameplayScreen = screen === 'playing' || screen === 'end';
  const [activeKey, setActiveKey] = useState<SwatchKey>(() =>
    onGameplayScreen ? 'gameplay.bg' : `${modeId}.bg`,
  );
  const [copied, setCopied] = useState(false);

  // When mode changes, focus the active swatch on the new mode (unless
  // the user is currently on the shared gameplay-bg swatch, which has
  // no mode binding — leave that alone).
  useEffect(() => {
    setActiveKey((prev) => {
      if (!isModeKey(prev)) return prev;
      const [mm, kk] = parseModeKey(prev);
      return mm === modeId ? prev : `${modeId}.${kk}`;
    });
  }, [modeId]);

  const get = (m: ModeId, k: SwatchKind): string => colorOverrides[m]?.[k] ?? DEFAULT_COLORS[m][k];
  const isOverride = (m: ModeId, k: SwatchKind): boolean => !!colorOverrides[m]?.[k];
  const getGameplayBg = (): string => colorOverrides.gameplayBg ?? GAMEPLAY_BG_DEFAULT;
  const isGameplayBgOverride = (): boolean => !!colorOverrides.gameplayBg;
  // Resolves any swatch (mode or gameplay) to its current hex.
  const getByKey = (key: SwatchKey): string => {
    if (!isModeKey(key)) return getGameplayBg();
    const [m, k] = parseModeKey(key);
    return get(m, k);
  };
  const isOverrideByKey = (key: SwatchKey): boolean => {
    if (!isModeKey(key)) return isGameplayBgOverride();
    const [m, k] = parseModeKey(key);
    return isOverride(m, k);
  };

  const updateActive = (hex: string): void => {
    if (!isModeKey(activeKey)) {
      setColorOverrides((prev) => ({ ...prev, gameplayBg: hex }));
      return;
    }
    const [m, k] = parseModeKey(activeKey);
    setColorOverrides((prev) => ({
      ...prev,
      [m]: { ...(prev[m] ?? {}), [k]: hex },
    }));
  };

  const reset = (): void => setColorOverrides({});
  const copy = (): void => {
    const text = `Classic   — bg: ${get('classic', 'bg')}   accent: ${get('classic', 'accent')}
Soyboy    — bg: ${get('soyboy', 'bg')}    accent: ${get('soyboy', 'accent')}
This That — bg: ${get('thisthat', 'bg')} accent: ${get('thisthat', 'accent')}
Gameplay BG — ${getGameplayBg()}`;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {});
  };

  if (!open) {
    return (
      <button
        className="cp-fab"
        onClick={() => setOpen(true)}
        aria-label="Open color tool"
        title="Color tool"
      >
        🎨
      </button>
    );
  }

  // For the gameplay-bg swatch, contrast is computed against text + the
  // active mode's accent (since those colors still appear on the play
  // screen). For mode swatches, against the mode's own bg + accent.
  const currentValue = getByKey(activeKey);
  const isGameplayActive = !isModeKey(activeKey);
  const contrastBg = isGameplayActive ? getGameplayBg() : get(parseModeKey(activeKey)[0], 'bg');
  const contrastAccent = isGameplayActive
    ? get(modeId, 'accent')
    : get(parseModeKey(activeKey)[0], 'accent');
  const cText = '#0A0A0A'; // --dark text token
  const contrastPairs: ReadonlyArray<{ label: string; fg: string; bg: string; glyph: string }> = [
    { label: 'Accent on BG', fg: contrastAccent, bg: contrastBg, glyph: 'Aa' },
    { label: 'Text on BG', fg: cText, bg: contrastBg, glyph: 'Aa' },
  ];
  const modeLabel = isGameplayActive ? 'Gameplay' : MODE_CONFIGS[parseModeKey(activeKey)[0]].name;
  const badgeClass = (level: WcagLevel): string =>
    level === 'AAA' ? 'aaa' : level === 'AA' ? 'aa' : level === 'AA Large' ? 'large' : 'fail';

  return (
    <div className="cp-floating" role="dialog" aria-label="Color tool">
      <div className="cp-header">
        <span className="cp-title">Color tool</span>
        <button className="cp-close" onClick={() => setOpen(false)} aria-label="Close">
          ×
        </button>
      </div>

      <div className="cp-swatches">
        {SWATCHES.map((s) => {
          const v = getByKey(s.key);
          const isActive = s.key === activeKey;
          return (
            <button
              key={s.key}
              type="button"
              className={`cp-swatch${isActive ? ' active' : ''}`}
              onClick={() => setActiveKey(s.key)}
            >
              <span className="cp-swatch-color" style={{ background: v }} />
              <span className="cp-swatch-text">
                <span className="cp-swatch-label">{s.label}</span>
                <span
                  className="cp-swatch-hex"
                  style={{
                    fontWeight: isOverrideByKey(s.key) ? 700 : 600,
                  }}
                >
                  {v.toUpperCase()}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="cp-contrast" aria-label={`Contrast ratios for ${modeLabel}`}>
        <div className="cp-contrast-title">{modeLabel} contrast</div>
        {contrastPairs.map((p) => {
          const ratio = contrastRatio(p.fg, p.bg);
          const level = wcagLevel(ratio);
          return (
            <div key={p.label} className="cp-contrast-row">
              <span
                className="cp-contrast-preview"
                style={{ background: p.bg, color: p.fg }}
                aria-hidden="true"
              >
                {p.glyph}
              </span>
              <span className="cp-contrast-label">{p.label}</span>
              <span className="cp-contrast-ratio">{ratio.toFixed(2)}:1</span>
              <span className={`cp-contrast-badge ${badgeClass(level)}`}>{level}</span>
            </div>
          );
        })}
      </div>

      <HsvPicker value={currentValue} onChange={updateActive} />

      <div className="cp-actions">
        <button type="button" className="cp-btn" onClick={reset}>
          Reset
        </button>
        <button type="button" className="cp-btn primary" onClick={copy}>
          {copied ? 'Copied ✓' : 'Copy values'}
        </button>
      </div>
    </div>
  );
}
