import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMascotSvgsSync, loadMascotSvgs, type MascotSvgs } from '../data/svgData';
import { useColorOverrides, useColoredBgActive, useIsDark } from '../game/appContext';
import { DEFAULT_COLORS } from '../game/constants';
import { scopeSvgStyles } from '../game/svgUtils';
import type { ModeId } from '../lib/modes';

interface AnimatedMascotProps {
  size?: number;
  modeId?: ModeId;
}

// Picks the right open/closed pair from the loaded svgs for the
// active mode + theme. Falls back to the light variants when dark
// versions aren't shipped (thisthat reuses one SVG across themes;
// classic + soyboy always carry all four).
function pickFrames(
  svgs: MascotSvgs,
  isDark: boolean,
): { open: string; closed: string } {
  if (isDark && svgs.openDark && svgs.closedDark) {
    return { open: svgs.openDark, closed: svgs.closedDark };
  }
  return { open: svgs.open, closed: svgs.closed };
}

/* AnimatedMascot — two SVG frames cross-faded between "open" and "closed"
   when eyes are "closed" (random ambient blink OR hover). Hover also
   plays a single subtle bounce animation. All styles are scoped via
   scopeSvgStyles so multiple inline SVGs don't fight over class names.

   SVG payload is lazy-loaded per mode (src/data/svgSets/*) so a session
   in classic mode never downloads the bean or hair SVGs. Renders an
   empty same-size placeholder during the load to avoid a layout shift. */
export function AnimatedMascot({ size = 120, modeId = 'classic' }: AnimatedMascotProps) {
  const isDark = useIsDark();
  const coloredBgActive = useColoredBgActive();
  const overrides = useColorOverrides();
  const [ambientBlink, setAmbientBlink] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  // Initial state hits the module cache synchronously when the user
  // has previously visited this mode (or the prefetch already ran),
  // so a return-trip to a known mode renders the mascot on the first
  // frame instead of flashing through a null placeholder.
  const [svgs, setSvgs] = useState<MascotSvgs | null>(() => getMascotSvgsSync(modeId));

  // Async load fills the cache when the lazy initial state was a miss.
  // Cancellation guard prevents a late-resolving promise from clobbering
  // newer state if the user rapid-switches modes.
  useEffect(() => {
    if (getMascotSvgsSync(modeId)) {
      setSvgs(getMascotSvgsSync(modeId));
      return;
    }
    let cancelled = false;
    setSvgs(null);
    loadMascotSvgs(modeId).then((loaded) => {
      if (!cancelled) setSvgs(loaded);
    }).catch(() => { /* chunk load failure leaves placeholder visible */ });
    return () => { cancelled = true; };
  }, [modeId]);

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

  const frames = svgs ? pickFrames(svgs, isDark) : null;
  const openSvg = useMemo(
    () => (frames ? scopeSvgStyles(recolor(frames.open), 'animated-mascot') : ''),
    [frames, recolor],
  );
  const closedSvg = useMemo(
    () => (frames ? scopeSvgStyles(recolor(frames.closed), 'animated-mascot') : ''),
    [frames, recolor],
  );

  // This That: 8 hair frames cycled 1→8→1 (ping-pong). Use a distinct
  // scope class so the hair's .cls-1 rules (dark fill) don't override
  // the pig body's .cls-1 (blue fill) via DOM-order cascade. In dark
  // mode, force hair to white for contrast against the dark bg.
  const hairFrames = useMemo(() => {
    if (!isThisThat || !svgs?.hair) return [];
    return svgs.hair.map((raw) => {
      let r = raw;
      if (isDark) {
        r = r.replace(/fill:\s*#2e2b26/gi, 'fill: #F5F3F0');
      }
      return scopeSvgStyles(r, 'hair-anim');
    });
  }, [isThisThat, isDark, svgs]);
  const [hairIdx, setHairIdx] = useState(0);
  useEffect(() => {
    if (!isThisThat || hairFrames.length === 0) return;
    // 14-step ping-pong: 0,1,2,3,4,5,6,7,6,5,4,3,2,1 → repeat
    const seq = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1];
    let step = 0;
    const id = setInterval(() => {
      step = (step + 1) % seq.length;
      setHairIdx(seq[step]);
    }, 130); // ~1.8s for full forward+back cycle
    return () => clearInterval(id);
  }, [isThisThat, hairFrames.length]);

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
