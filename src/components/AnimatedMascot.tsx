import { useCallback, useEffect, useMemo, useState } from 'react';
import { SVG_DATA, type InlinedMascotName } from '../data/svgData';
import { useColorOverrides, useColoredBgActive, useIsDark } from '../game/appContext';
import { DEFAULT_COLORS } from '../game/constants';
import { scopeSvgStyles } from '../game/svgUtils';
import type { ModeId } from '../lib/modes';

interface AnimatedMascotProps {
  size?: number;
  modeId?: ModeId;
}

// Per-mode mascot frames for the open + closed eye states. Explicit
// literal returns so TypeScript verifies each branch against
// InlinedMascotName (the SVG_DATA-indexable subset — excludes big-pig-1
// which FlyingPig fetches at runtime).
function mascotFrames(modeId: ModeId, isDark: boolean): { open: InlinedMascotName; closed: InlinedMascotName } {
  if (modeId === 'soyboy') {
    return isDark
      ? { open: 'bean-open-dark.svg', closed: 'bean-closed-dark.svg' }
      : { open: 'bean-open.svg', closed: 'bean-closed.svg' };
  }
  if (modeId === 'thisthat') {
    return { open: 'pig-tt-open.svg', closed: 'pig-tt-closed.svg' };
  }
  return isDark
    ? { open: 'pig-open-dark.svg', closed: 'pig-closed-dark.svg' }
    : { open: 'pig-open.svg', closed: 'pig-closed.svg' };
}

// 8 hair frames used by the thisthat ping-pong animation. Typed as
// InlinedMascotName[] so SVG_DATA[HAIR_KEYS[i]] is type-correct
// without an `as` cast.
const HAIR_KEYS: readonly InlinedMascotName[] = [
  'hair-1.svg', 'hair-2.svg', 'hair-3.svg', 'hair-4.svg',
  'hair-5.svg', 'hair-6.svg', 'hair-7.svg', 'hair-8.svg',
];

/* AnimatedMascot — two SVG frames cross-faded between "open" and "closed"
   when eyes are "closed" (random ambient blink OR hover). Hover also
   plays a single subtle bounce animation. All styles are scoped via
   scopeSvgStyles so multiple inline SVGs don't fight over class names. */
export function AnimatedMascot({ size = 120, modeId = 'classic' }: AnimatedMascotProps) {
  const isDark = useIsDark();
  const coloredBgActive = useColoredBgActive();
  const overrides = useColorOverrides();
  const [ambientBlink, setAmbientBlink] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);

  // Ambient blink — random ~35% every 2.5s
  useEffect(() => {
    const id = setInterval(() => {
      if (Math.random() < 0.35) {
        setAmbientBlink(true);
        setTimeout(() => setAmbientBlink(false), 140);
      }
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const handleEnter = useCallback(() => {
    setIsHovered(true);
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 420);
  }, []);
  const handleLeave = useCallback(() => setIsHovered(false), []);

  const isSoyboy = modeId === 'soyboy';
  const isThisThat = modeId === 'thisthat';
  const isClassic = !isSoyboy && !isThisThat;
  const { open: openPath, closed: closedPath } = mascotFrames(modeId, isDark);
  // Per-mode brand accent — single source of truth shared with the
  // FloatingColorPicker swatches (DEFAULT_COLORS) so a designer changing
  // the brand can't desync the mascot recolor from the swatch display.
  const defaultColor = DEFAULT_COLORS[modeId].accent;
  const accent = coloredBgActive ? overrides[modeId]?.accent : undefined;

  // useCallback rather than a per-render arrow so the useMemo deps below
  // can list `recolor` honestly. eslint-disable not needed — TypeScript
  // and the rule both see a stable dep set.
  const recolor = useCallback((raw: string): string => {
    if (!raw) return '';
    let result = raw;
    // Accent color from picker
    if (accent && accent.toLowerCase() !== defaultColor.toLowerCase()) {
      result = result.replace(
        new RegExp(`fill\\s*:\\s*${defaultColor}`, 'gi'),
        `fill: ${accent}`,
      );
    }
    // Dark mode: all dark strokes (.cls-2 = #2e2b26) — outlines + facial
    // features — flip to "almost black" so they stay readable but feel
    // dark. Applies to both pig and bean.
    if (isDark) {
      result = result.replace(/fill:\s*#2e2b26/gi, 'fill: #1A1918');
    }
    return result;
  }, [accent, defaultColor, isDark]);
  const openSvg = useMemo(
    () => scopeSvgStyles(recolor(SVG_DATA[openPath]), 'animated-mascot'),
    [openPath, recolor],
  );
  const closedSvg = useMemo(
    () => scopeSvgStyles(recolor(SVG_DATA[closedPath]), 'animated-mascot'),
    [closedPath, recolor],
  );

  // This That: build 8 hair frames + cycle them 1→8→1 (ping-pong).
  // Use a distinct scope class so the hair's .cls-1 rules (dark fill) don't
  // override the pig body's .cls-1 (blue fill) via DOM-order cascade.
  // In dark mode, force hair to white for contrast against the dark bg.
  const hairFrames = useMemo(() => {
    if (!isThisThat) return [];
    return HAIR_KEYS.map((key) => {
      let raw = SVG_DATA[key];
      if (isDark) {
        raw = raw.replace(/fill:\s*#2e2b26/gi, 'fill: #F5F3F0');
      }
      return scopeSvgStyles(raw, 'hair-anim');
    });
  }, [isThisThat, isDark]);
  const [hairIdx, setHairIdx] = useState(0);
  useEffect(() => {
    if (!isThisThat) return;
    // 14-step ping-pong: 0,1,2,3,4,5,6,7,6,5,4,3,2,1 → repeat
    const seq = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1];
    let step = 0;
    const id = setInterval(() => {
      step = (step + 1) % seq.length;
      setHairIdx(seq[step]);
    }, 130); // ~1.8s for full forward+back cycle
    return () => clearInterval(id);
  }, [isThisThat]);

  const eyesClosed = ambientBlink || isHovered;

  return (
    <div
      className={[
        'animated-mascot',
        eyesClosed ? 'blinking' : '',
        isBouncing ? 'bouncing' : '',
      ].filter(Boolean).join(' ')}
      data-mode={isClassic ? 'classic' : (isSoyboy ? 'soyboy' : 'thisthat')}
      style={{ width: size, height: size }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      role="img"
      aria-label={isClassic ? 'Flying pig mascot' : 'Soy bean mascot'}
    >
      <div className="frame frame-open" dangerouslySetInnerHTML={{ __html: openSvg }} />
      <div className="frame frame-closed" dangerouslySetInnerHTML={{ __html: closedSvg }} />
      {isThisThat && (
        <div className="hair-anim" aria-hidden="true">
          {hairFrames.map((svg, i) => (
            <div
              key={i}
              className={`hair-frame${i === hairIdx ? ' is-on' : ''}`}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
