import { useEffect, useMemo, useState } from 'react';
import { SVG_URLS } from '../data/svgData';
import { scopeSvgStyles } from '../game/svgUtils';
import { useIsDark } from '../game/appContext';

/* Lazy-fetches big-pig-1.svg at mount instead of inlining the ~80 KB
   raw string in the JS bundle. The pig is purely decorative (aria-
   hidden, sits at the bottom of the start screen) so the brief flash
   of nothing during the initial fetch is invisible. Browser HTTP
   cache makes subsequent mounts effectively free. */
export function FlyingPig() {
  const isDark = useIsDark();
  const [rawSvg, setRawSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(SVG_URLS['big-pig-1.svg'])
      .then((r) => r.text())
      .then((text) => { if (!cancelled) setRawSvg(text); })
      .catch(() => { /* decorative — silent fail is acceptable */ });
    return () => { cancelled = true; };
  }, []);

  const svgMarkup = useMemo(() => {
    if (!rawSvg) return '';
    let raw = rawSvg;
    if (isDark) {
      /* Illustrator's dark palette for the big pig:
         - Body: peach (unchanged — the hero)
         - All linework: a warm cocoa brown (#5B453B) — reads as
           "dark brown ink" against the near-black page. Not too dark
           to disappear, not so light that it competes with the body.
         - Wind lines: a slightly cooler medium gray (#8C8884) so the
           wind feels atmospheric, not solid.
         - Ear fills: white (kept). */
      raw = raw.replace(/fill:\s*#2e2b26/gi, 'fill: #5B453B');
      raw = raw.replace(/<g id="air">([\s\S]*?)<\/g>/, (_, inner: string) => {
        const updated = inner.replace(
          /<path class="cls-3"/g,
          '<path class="cls-3" fill="#8C8884"',
        );
        return `<g id="air">${updated}</g>`;
      });
      // Ear fills (cls-2 = #fff) stay white — no substitution.
    }
    return scopeSvgStyles(raw, 'flying-pig');
  }, [rawSvg, isDark]);

  if (!svgMarkup) return null;

  return (
    <div className="flying-section" aria-hidden="true">
      <div className="flying-pig" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
    </div>
  );
}
