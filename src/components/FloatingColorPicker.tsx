import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { DEFAULT_COLORS } from '../game/constants';
import type { ColorOverrides } from '../game/appContext';
import { MODE_CONFIGS, type ModeId } from '../lib/modes';
import { contrastRatio, wcagLevel, type WcagLevel } from '../lib/colorMath';
import { HsvPicker } from './HsvPicker';

type SwatchKind = 'bg' | 'accent';
// Dotted "<mode>.<kind>" key used for swatch identity in the picker UI.
type SwatchKey = `${ModeId}.${SwatchKind}`;

interface Swatch {
  key: SwatchKey;
  label: string;
}

const SWATCHES: Swatch[] = [
  { key: 'classic.bg',      label: 'Soar Boar BG' },
  { key: 'classic.accent',  label: 'Soar Boar Accent' },
  { key: 'soyboy.bg',       label: 'Soy Boy BG' },
  { key: 'soyboy.accent',   label: 'Soy Boy Accent' },
  { key: 'thisthat.bg',     label: 'This That BG' },
  { key: 'thisthat.accent', label: 'This That Accent' },
];

function parseKey(key: SwatchKey): [ModeId, SwatchKind] {
  // SwatchKey is the template-literal `${ModeId}.${SwatchKind}` so the
  // split always yields exactly the right pair — the cast is honest.
  return key.split('.') as [ModeId, SwatchKind];
}

interface FloatingColorPickerProps {
  colorOverrides: ColorOverrides;
  setColorOverrides: Dispatch<SetStateAction<ColorOverrides>>;
  modeId: ModeId;
}

export function FloatingColorPicker({ colorOverrides, setColorOverrides, modeId }: FloatingColorPickerProps) {
  const [open, setOpen] = useState(true);
  const [activeKey, setActiveKey] = useState<SwatchKey>(() => `${modeId}.bg`);
  const [copied, setCopied] = useState(false);

  // When mode changes, focus the active swatch on the new mode if helpful
  useEffect(() => {
    setActiveKey(prev => {
      const [mm, kk] = parseKey(prev);
      return mm === modeId ? prev : `${modeId}.${kk}`;
    });
  }, [modeId]);

  const get = (m: ModeId, k: SwatchKind): string =>
    colorOverrides[m]?.[k] ?? DEFAULT_COLORS[m][k];
  const isOverride = (m: ModeId, k: SwatchKind): boolean =>
    !!colorOverrides[m]?.[k];

  const updateActive = (hex: string): void => {
    const [m, k] = parseKey(activeKey);
    setColorOverrides(prev => ({
      ...prev,
      [m]: { ...(prev[m] ?? {}), [k]: hex },
    }));
  };

  const reset = (): void => setColorOverrides({});
  const copy = (): void => {
    const text =
`Classic   — bg: ${get('classic', 'bg')}   accent: ${get('classic', 'accent')}
Soyboy    — bg: ${get('soyboy', 'bg')}    accent: ${get('soyboy', 'accent')}
This That — bg: ${get('thisthat', 'bg')} accent: ${get('thisthat', 'accent')}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
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

  const [activeMode, activeKind] = parseKey(activeKey);
  const currentValue = get(activeMode, activeKind);

  // WCAG contrast for the currently active mode — shows accent + text
  // ratios against the bg so a designer tweaking the brand can see
  // whether the pair clears AA without leaving the picker.
  const cBg = get(activeMode, 'bg');
  const cAccent = get(activeMode, 'accent');
  const cText = '#0A0A0A'; // --dark text token
  const contrastPairs: ReadonlyArray<{ label: string; fg: string; bg: string; glyph: string }> = [
    { label: 'Accent on BG', fg: cAccent, bg: cBg, glyph: 'Aa' },
    { label: 'Text on BG', fg: cText, bg: cBg, glyph: 'Aa' },
  ];
  const modeLabel = MODE_CONFIGS[activeMode].name;
  const badgeClass = (level: WcagLevel): string =>
    level === 'AAA' ? 'aaa' : level === 'AA' ? 'aa' : level === 'AA Large' ? 'large' : 'fail';

  return (
    <div className="cp-floating" role="dialog" aria-label="Color tool">
      <div className="cp-header">
        <span className="cp-title">Color tool</span>
        <button className="cp-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
      </div>

      <div className="cp-swatches">
        {SWATCHES.map(s => {
          const [m, k] = parseKey(s.key);
          const v = get(m, k);
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
                <span className="cp-swatch-hex" style={{
                  fontWeight: isOverride(m, k) ? 700 : 600,
                }}>{v.toUpperCase()}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="cp-contrast" aria-label={`Contrast ratios for ${modeLabel}`}>
        <div className="cp-contrast-title">{modeLabel} contrast</div>
        {contrastPairs.map(p => {
          const ratio = contrastRatio(p.fg, p.bg);
          const level = wcagLevel(ratio);
          return (
            <div key={p.label} className="cp-contrast-row">
              <span
                className="cp-contrast-preview"
                style={{ background: p.bg, color: p.fg }}
                aria-hidden="true"
              >{p.glyph}</span>
              <span className="cp-contrast-label">{p.label}</span>
              <span className="cp-contrast-ratio">{ratio.toFixed(2)}:1</span>
              <span className={`cp-contrast-badge ${badgeClass(level)}`}>{level}</span>
            </div>
          );
        })}
      </div>

      <HsvPicker value={currentValue} onChange={updateActive} />

      <div className="cp-actions">
        <button type="button" className="cp-btn" onClick={reset}>Reset</button>
        <button type="button" className="cp-btn primary" onClick={copy}>
          {copied ? 'Copied ✓' : 'Copy values'}
        </button>
      </div>
    </div>
  );
}
