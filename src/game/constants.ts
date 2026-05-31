export const TOTAL_TIME = 60;
export const HEAD_START = 4;
export const MSG_DURATION = 2000;
export const POS_COLORS = ['#E8632B', '#9B59B6', '#2E86C1', '#27AE60'];

export const SHARE_URL = 'soarboar.com';

// Default colors used by the floating color picker.
// Brand peach / sage / blue darkened in the A11y pass on main so the
// accents clear WCAG AA contrast against the white tile + cream bg.
// Classic-mode bg shifted from neutral cream to warm peach so the
// colored-bg mode has more identity. Kept in sync with global.css
// --deep-* tokens, the pig/bean SVG .cls-3 fills, and the picker's
// contrast checker.
export const DEFAULT_COLORS = {
  // UI accents — what tile borders, +pts pills, toggle thumbs etc.
  // are tinted with. Each pairs with a MASCOT_ACCENT below.
  classic: { bg: '#FFE2C7', accent: '#D3437C' },
  soyboy: { bg: '#B7D197', accent: '#247D57' },
  thisthat: { bg: '#CCE1F2', accent: '#330BAB' },
} as const;

// Mascot fill colors used in-game (header icon, big flying pig).
// Default sage for Soy Boy so it visually unifies with the UI accent
// on cream backgrounds.
export const MASCOT_ACCENTS = {
  classic: '#F5A8C8',
  soyboy: '#247D57',
  thisthat: '#F5D63A',
} as const;

// Start-screen mascot fill colors — used on the homescreen hero
// where the mascot sits on the saturated mode bg. Soy Boy bumps to a
// bright lime that pops against the blue bg (the deeper sage looks
// muddy there). All other modes keep their MASCOT_ACCENTS color.
export const START_MASCOT_ACCENTS = {
  classic: '#F5A8C8',
  soyboy: '#C3FE84',
  thisthat: '#F5D63A',
} as const;

// The accent colors literally baked into the mascot SVG assets at
// build time. AnimatedMascot.tsx swaps these for MASCOT_ACCENTS so
// we can retune the brand without re-exporting the SVGs. Keep in sync
// with the `.cls-3 { fill: … }` rules in src/assets/*.svg.
export const BAKED_ACCENTS = {
  classic: '#D46247',
  soyboy: '#247D57',
  thisthat: '#2e83c5',
} as const;
