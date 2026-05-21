import { useMemo } from 'react';
import { SVG_DATA, SVG_URLS, type MascotName } from '../data/svgData';

// Scopes an SVG's internal <style> rules to a wrapper class so multiple
// inlined SVGs on the same page don't fight each other for the same
// class names (e.g. pig's .cls-3 vs big-pig's .cls-3).
export function scopeSvgStyles(svgString: string, scopeClass: string): string {
  if (!svgString) return '';
  return svgString.replace(/<style[^>]*>([\s\S]*?)<\/style>/i, (_, body: string) => {
    const scoped = body.replace(/(\.cls-[a-zA-Z0-9-]+)/g, `.${scopeClass} $1`);
    return `<style>${scoped}</style>`;
  });
}

// Synchronously returns a URL for an <img>: either the resolved asset URL,
// or a data: URI with the body fill recolored in-place. Takes a mascot
// filename (the same key shape that consumers were passing in the legacy
// build) and resolves to the Vite-hashed URL via SVG_URLS.
export function useColoredSvg(
  path: MascotName,
  defaultColor: string,
  accent: string | undefined,
): string {
  return useMemo(() => {
    const url = SVG_URLS[path];
    if (!accent || accent.toLowerCase() === defaultColor.toLowerCase()) {
      return url;
    }
    const source = SVG_DATA[path];
    if (!source) return url; // safety fallback
    const recolored = source.replace(
      new RegExp(`fill\\s*:\\s*${defaultColor}`, 'gi'),
      `fill: ${accent}`,
    );
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(recolored);
  }, [path, defaultColor, accent]);
}
