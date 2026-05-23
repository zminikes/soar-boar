import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  hexToHsv,
  hexToRgb,
  hsvToHex,
  hsvToRgb,
  relLuminance,
  rgbToHex,
  rgbToHsv,
  wcagLevel,
} from './colorMath';

describe('hexToRgb', () => {
  it('parses a 6-digit hex string', () => {
    expect(hexToRgb('#D46247')).toEqual({ r: 0xd4, g: 0x62, b: 0x47 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('returns {0,0,0} for non-6-digit input (3-digit, empty)', () => {
    expect(hexToRgb('#ABC')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('')).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('rgbToHex', () => {
  it('formats with leading # and zero-padded channels', () => {
    expect(rgbToHex({ r: 0xd4, g: 0x62, b: 0x47 })).toBe('#d46247');
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff');
  });

  it('clamps out-of-range channel values to 0..255', () => {
    expect(rgbToHex({ r: -10, g: 300, b: 128 })).toBe('#00ff80');
  });

  it('rounds fractional channels (used by hsvToRgb pipeline)', () => {
    expect(rgbToHex({ r: 127.5, g: 127.4, b: 127.6 })).toBe('#807f80');
  });
});

describe('hex -> hsv -> hex round-trip', () => {
  // Round-trip identity is the load-bearing property for the color
  // picker: if the user types a hex, the pad moves to a position
  // whose backing HSV converts back to the same hex.
  const cases = [
    '#D46247', // classic accent (peach)
    '#247D57', // soyboy accent (sage)
    '#2E83C5', // thisthat accent (blue)
    '#FF0000',
    '#00FF00',
    '#0000FF',
    '#808080', // midpoint gray
  ];
  for (const hex of cases) {
    it(`preserves ${hex} through hexToHsv -> hsvToHex`, () => {
      // rgbToHex emits lowercase, so normalize before comparing.
      expect(hsvToHex(hexToHsv(hex))).toBe(hex.toLowerCase());
    });
  }
});

describe('rgbToHsv', () => {
  it('returns h=0, s=0 for pure black', () => {
    expect(rgbToHsv({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, v: 0 });
  });

  it('returns h=0, s=0, v=100 for pure white', () => {
    expect(rgbToHsv({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, v: 100 });
  });

  it('returns hue 0 for pure red', () => {
    const hsv = rgbToHsv({ r: 255, g: 0, b: 0 });
    expect(hsv.h).toBe(0);
    expect(hsv.s).toBe(100);
    expect(hsv.v).toBe(100);
  });

  it('returns hue 120 for pure green and 240 for pure blue', () => {
    expect(rgbToHsv({ r: 0, g: 255, b: 0 }).h).toBe(120);
    expect(rgbToHsv({ r: 0, g: 0, b: 255 }).h).toBe(240);
  });
});

describe('hsvToRgb', () => {
  it('renders pure red at hue 0', () => {
    expect(hsvToRgb({ h: 0, s: 100, v: 100 })).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('handles all six hue sextants (0/60/120/180/240/300)', () => {
    // Each branch of the if-else chain in hsvToRgb. If a sextant is
    // miscomputed, the rendered colour shifts noticeably.
    expect(rgbToHex(hsvToRgb({ h: 0, s: 100, v: 100 }))).toBe('#ff0000');
    expect(rgbToHex(hsvToRgb({ h: 60, s: 100, v: 100 }))).toBe('#ffff00');
    expect(rgbToHex(hsvToRgb({ h: 120, s: 100, v: 100 }))).toBe('#00ff00');
    expect(rgbToHex(hsvToRgb({ h: 180, s: 100, v: 100 }))).toBe('#00ffff');
    expect(rgbToHex(hsvToRgb({ h: 240, s: 100, v: 100 }))).toBe('#0000ff');
    expect(rgbToHex(hsvToRgb({ h: 300, s: 100, v: 100 }))).toBe('#ff00ff');
  });
});

describe('relLuminance / contrastRatio / wcagLevel', () => {
  it('pure white luminance is 1 and pure black is 0', () => {
    expect(relLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(relLuminance('#000000')).toBe(0);
  });

  it('contrast ratio is symmetric (order of args does not matter)', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBe(contrastRatio('#000000', '#FFFFFF'));
  });

  it('white-on-black hits the spec ceiling of 21:1', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
  });

  it('wcagLevel buckets follow the WCAG 2.1 thresholds', () => {
    expect(wcagLevel(8.0)).toBe('AAA');
    expect(wcagLevel(7.0)).toBe('AAA');
    expect(wcagLevel(5.0)).toBe('AA');
    expect(wcagLevel(4.5)).toBe('AA');
    expect(wcagLevel(3.5)).toBe('AA Large');
    expect(wcagLevel(2.9)).toBe('Fail');
  });

  it('classic brand peach on cream clears AA against body text', () => {
    // Brand text token (--dark) on classic colored bg should be well above AA.
    expect(contrastRatio('#0A0A0A', '#FFE2C7')).toBeGreaterThan(4.5);
  });
});
