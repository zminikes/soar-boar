import { useEffect, useMemo, useState } from 'react';
import { SVG_URLS, type MascotName } from '../data/svgData';
import { useIsDark } from '../game/appContext';
import { BAKED_ACCENTS, MASCOT_ACCENTS } from '../game/constants';
import { scopeSvgStyles } from '../game/svgUtils';
import type { ModeId } from '../lib/modes';

interface MascotIconProps {
  size?: number;
  modeId?: ModeId;
  className?: string;
}

// Per-mode mascot URL for the small icon (header / demo). Explicit
// literal returns so TypeScript verifies every branch against MascotName
// — no `as` casts needed at the SVG_URLS lookup.
function iconPath(modeId: ModeId, isDark: boolean): MascotName {
  if (modeId === 'soyboy') return isDark ? 'bean-open-dark.svg' : 'bean-open.svg';
  if (modeId === 'thisthat') return 'pig-tt-open.svg';
  return isDark ? 'pig-open-dark.svg' : 'pig-open.svg';
}

/* Header / in-game mascot icon — lazily fetches the SVG and rewrites
   the baked accent fill to the current MASCOT_ACCENTS value so the
   little pig / bean / head in the play screen header matches the
   homescreen brand (soft pink / lime / yellow). Falls back to an empty
   placeholder during the fetch — same dimensions so layout doesn't
   jump. */
export function MascotIcon({ size = 48, modeId = 'classic', className = '' }: MascotIconProps) {
  const isDark = useIsDark();
  const src = iconPath(modeId, isDark);
  const [rawSvg, setRawSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(SVG_URLS[src])
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) setRawSvg(text);
      })
      .catch(() => {
        /* network blip on a decorative icon — silent fail is fine */
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const targetAccent = MASCOT_ACCENTS[modeId];
  const bakedColor = BAKED_ACCENTS[modeId];
  const markup = useMemo(() => {
    if (!rawSvg) return '';
    let result = rawSvg;
    if (targetAccent.toLowerCase() !== bakedColor.toLowerCase()) {
      result = result.replace(
        new RegExp(`fill\\s*:\\s*${bakedColor}`, 'gi'),
        `fill: ${targetAccent}`,
      );
    }
    if (isDark) {
      result = result.replace(/fill:\s*#2e2b26/gi, 'fill: #1A1918');
    }
    return scopeSvgStyles(result, 'mascot-icon');
  }, [rawSvg, targetAccent, bakedColor, isDark]);

  return (
    <span
      className={`mascot-icon ${className}`}
      style={{ display: 'block', width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
