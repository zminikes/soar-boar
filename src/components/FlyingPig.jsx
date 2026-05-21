import { useMemo } from 'react';
import { SVG_DATA } from '../data/svgData';
import { scopeSvgStyles } from '../game/svgUtils';
import { useIsDark } from '../game/appContext';

export function FlyingPig() {
  const isDark = useIsDark();

  const svgMarkup = useMemo(() => {
    let raw = SVG_DATA['big-pig-1.svg'] || SVG_DATA['big-soar-boar.svg'] || '';
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
      raw = raw.replace(/<g id="air">([\s\S]*?)<\/g>/, (_, inner) => {
        const updated = inner.replace(
          /<path class="cls-3"/g,
          '<path class="cls-3" fill="#8C8884"'
        );
        return `<g id="air">${updated}</g>`;
      });
      // Ear fills (cls-2 = #fff) stay white — no substitution.
    }
    return scopeSvgStyles(raw, 'flying-pig');
  }, [isDark]);

  return (
    <div className="flying-section" aria-hidden="true">
      <div className="flying-pig" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
    </div>
  );
}
