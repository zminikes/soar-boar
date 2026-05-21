import { describe, expect, it } from 'vitest';
import { generateShareText } from './share';
import { MODE_CONFIGS } from './modes';
import type { ChainEntry } from './types';

describe('generateShareText', () => {
  it('formats a classic 2-move chain with the expected layout', () => {
    const chain: ChainEntry[] = [
      { word: 'SOAR' },
      { word: 'BOAR', pts: 1 },
      { word: 'BEAR', pts: 4 },
    ];
    const out = generateShareText(chain, 5, MODE_CONFIGS.classic, 'soarboar.com');
    expect(out).toBe(
      [
        '🐷 Soar Boar',
        '⏱ 60 sec · 5 pts · 2 words',
        '',
        '⬜⬜⬜⬜',
        '🟧⬜⬜⬜', // BOAR — position 0 changed (orange)
        '⬜🟪⬜⬜', // BEAR — position 1 changed (purple)
        '',
        '▶ Beat my score → soarboar.com',
      ].join('\n'),
    );
  });

  it('uses the bean emoji and 3-cell rows for the soyboy mode', () => {
    const chain: ChainEntry[] = [
      { word: 'SOY' },
      { word: 'BOY', pts: 1 },
      { word: 'BAY', pts: 3 },
    ];
    const out = generateShareText(chain, 4, MODE_CONFIGS.soyboy, 'soarboar.com');
    expect(out).toContain('🫛 Soy Boy');
    expect(out).toContain('⏱ 45 sec · 4 pts · 2 words');
    expect(out).toContain('⬜⬜⬜'); // 3-cell neutral row
    expect(out).toContain('🟧⬜⬜'); // BOY — position 0 changed
    expect(out).toContain('⬜🟪⬜'); // BAY — position 1 changed
  });

  it('uses singular "word" when the chain has exactly one move', () => {
    const chain: ChainEntry[] = [{ word: 'SOAR' }, { word: 'BOAR', pts: 1 }];
    const out = generateShareText(chain, 1, MODE_CONFIGS.classic, 'soarboar.com');
    expect(out).toContain('· 1 word');
    expect(out).not.toContain('· 1 words');
  });

  it('uses plural "words" for 0-move and 2+-move chains', () => {
    const zeroMove: ChainEntry[] = [{ word: 'SOAR' }];
    expect(generateShareText(zeroMove, 0, MODE_CONFIGS.classic, 'soarboar.com')).toContain('· 0 words');

    const twoMove: ChainEntry[] = [{ word: 'SOAR' }, { word: 'BOAR', pts: 1 }, { word: 'BEAR', pts: 4 }];
    expect(generateShareText(twoMove, 5, MODE_CONFIGS.classic, 'soarboar.com')).toContain('· 2 words');
  });

  it('inlines the share URL the caller passes (not a hard-coded value)', () => {
    const chain: ChainEntry[] = [{ word: 'SOAR' }];
    const out = generateShareText(chain, 0, MODE_CONFIGS.classic, 'example.test/play');
    expect(out).toContain('▶ Beat my score → example.test/play');
    expect(out).not.toContain('soarboar.com');
  });

  it('renders the pig emoji for thisthat mode (not bean)', () => {
    const chain: ChainEntry[] = [{ word: 'THIS' }, { word: 'THIN', pts: 4 }];
    const out = generateShareText(chain, 1, MODE_CONFIGS.thisthat, 'soarboar.com');
    expect(out.startsWith('🐷 This That')).toBe(true);
  });
});
