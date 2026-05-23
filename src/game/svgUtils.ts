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
