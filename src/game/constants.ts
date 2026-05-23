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
  classic: { bg: '#FFE2C7', accent: '#D46247' },
  soyboy: { bg: '#B7D197', accent: '#247D57' },
  thisthat: { bg: '#CCE1F2', accent: '#2e83c5' },
} as const;
