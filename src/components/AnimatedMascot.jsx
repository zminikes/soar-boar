import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SVG_DATA } from '../data/svgData';
import { ColorOverrideContext, scopeSvgStyles } from '../game/svgUtils';

/* AnimatedMascot — two SVG frames cross-faded between "open" and "closed"
   when eyes are "closed" (random ambient blink OR hover). Hover also
   plays a single subtle bounce animation. All styles are scoped via
   scopeSvgStyles so multiple inline SVGs don't fight over class names. */
export function AnimatedMascot({ size = 120, modeId = 'classic' }) {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.dataset.theme === 'dark'
  );
  const [coloredBgActive, setColoredBgActive] = useState(
    () => document.documentElement.dataset.expColoredBg === '1'
  );
  const [ambientBlink, setAmbientBlink] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const overrides = useContext(ColorOverrideContext);

  useEffect(() => {
    const check = () => {
      setIsDark(document.documentElement.dataset.theme === 'dark');
      setColoredBgActive(document.documentElement.dataset.expColoredBg === '1');
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-exp-colored-bg'],
    });
    return () => obs.disconnect();
  }, []);

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

  const isSoyboy   = modeId === 'soyboy';
  const isThisThat = modeId === 'thisthat';
  const isClassic  = !isSoyboy && !isThisThat;
  const dm = isDark ? '-dark' : '';
  const openPath =
    isSoyboy   ? `bean-open${dm}.svg` :
    isThisThat ? `pig-tt-open.svg`    :
    `pig-open${dm}.svg`;
  const closedPath =
    isSoyboy   ? `bean-closed${dm}.svg` :
    isThisThat ? `pig-tt-closed.svg`    :
    `pig-closed${dm}.svg`;
  const defaultColor =
    isSoyboy   ? '#27885E' :
    isThisThat ? '#59a1d8' :
    '#F88065';
  const modeKey = isSoyboy ? 'soyboy' : (isThisThat ? 'thisthat' : 'classic');
  const accent = coloredBgActive ? (overrides[modeKey] || {}).accent : null;

  const recolor = (raw) => {
    if (!raw) return '';
    let result = raw;
    // Accent color from picker
    if (accent && accent.toLowerCase() !== defaultColor.toLowerCase()) {
      result = result.replace(
        new RegExp(`fill\\s*:\\s*${defaultColor}`, 'gi'),
        `fill: ${accent}`
      );
    }
    // Dark mode: all dark strokes (.cls-2 = #2e2b26) — outlines + facial
    // features — flip to "almost black" so they stay readable but feel
    // dark. Applies to both pig and bean.
    if (isDark) {
      result = result.replace(/fill:\s*#2e2b26/gi, 'fill: #1A1918');
    }
    return result;
  };
  const openSvg = useMemo(
    () => scopeSvgStyles(recolor(SVG_DATA[openPath]), 'animated-mascot'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openPath, defaultColor, accent, isDark]
  );
  const closedSvg = useMemo(
    () => scopeSvgStyles(recolor(SVG_DATA[closedPath]), 'animated-mascot'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [closedPath, defaultColor, accent, isDark]
  );

  // This That: build 8 hair frames + cycle them 1→8→1 (ping-pong).
  // Use a distinct scope class so the hair's .cls-1 rules (dark fill) don't
  // override the pig body's .cls-1 (blue fill) via DOM-order cascade.
  // In dark mode, force hair to white for contrast against the dark bg.
  const hairFrames = useMemo(() => {
    if (!isThisThat) return [];
    return Array.from({ length: 8 }, (_, i) => {
      let raw = SVG_DATA[`hair-${i + 1}.svg`] || '';
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
    const seq = [0,1,2,3,4,5,6,7,6,5,4,3,2,1];
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
      <div className="frame frame-open"  dangerouslySetInnerHTML={{ __html: openSvg }} />
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
