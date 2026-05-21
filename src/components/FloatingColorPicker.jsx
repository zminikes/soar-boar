import { useEffect, useState } from 'react';
import { DEFAULT_COLORS } from '../game/constants';
import { HsvPicker } from './HsvPicker';

export function FloatingColorPicker({ colorOverrides, setColorOverrides, modeId }) {
  const [open, setOpen] = useState(true);
  const [activeKey, setActiveKey] = useState(() => `${modeId}.bg`);
  const [copied, setCopied] = useState(false);

  // When mode changes, focus the active swatch on the new mode if helpful
  useEffect(() => {
    setActiveKey(prev => {
      const [mm, kk] = prev.split('.');
      return mm === modeId ? prev : `${modeId}.${kk}`;
    });
  }, [modeId]);

  const get = (m, k) =>
    (colorOverrides[m] && colorOverrides[m][k]) || DEFAULT_COLORS[m][k];
  const isOverride = (m, k) =>
    !!(colorOverrides[m] && colorOverrides[m][k]);

  const updateActive = (hex) => {
    const [m, k] = activeKey.split('.');
    setColorOverrides(prev => ({
      ...prev,
      [m]: { ...(prev[m] || {}), [k]: hex },
    }));
  };

  const reset = () => setColorOverrides({});
  const copy = () => {
    const text =
`Classic   — bg: ${get('classic','bg')}   accent: ${get('classic','accent')}
Soyboy    — bg: ${get('soyboy','bg')}    accent: ${get('soyboy','accent')}
This That — bg: ${get('thisthat','bg')} accent: ${get('thisthat','accent')}`;
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

  const swatches = [
    { key: 'classic.bg',      label: 'Soar Boar BG' },
    { key: 'classic.accent',  label: 'Soar Boar Accent' },
    { key: 'soyboy.bg',       label: 'Soy Boy BG' },
    { key: 'soyboy.accent',   label: 'Soy Boy Accent' },
    { key: 'thisthat.bg',     label: 'This That BG' },
    { key: 'thisthat.accent', label: 'This That Accent' },
  ];
  const [activeMode, activeKind] = activeKey.split('.');
  const currentValue = get(activeMode, activeKind);

  return (
    <div className="cp-floating" role="dialog" aria-label="Color tool">
      <div className="cp-header">
        <span className="cp-title">Color tool</span>
        <button className="cp-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
      </div>

      <div className="cp-swatches">
        {swatches.map(s => {
          const [m, k] = s.key.split('.');
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
                  color: isOverride(m, k) ? v : 'inherit',
                  fontWeight: isOverride(m, k) ? 700 : 600,
                }}>{v.toUpperCase()}</span>
              </span>
            </button>
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
