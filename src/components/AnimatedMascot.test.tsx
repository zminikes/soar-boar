import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';

// Controlled SVG payload so the recolor assertions don't depend on the real
// asset bytes. The classic default accent is #D46247 (DEFAULT_COLORS), so the
// fixture carries that fill — the recolor regex targets the mode default and
// swaps it for the picker override.
const OPEN_SVG =
  '<svg id="open"><style>.cls-3 { fill: #D46247; } .cls-2 { fill: #2e2b26; }</style><path class="cls-3"/></svg>';
const CLOSED_SVG =
  '<svg id="closed"><style>.cls-3 { fill: #D46247; }</style><path class="cls-3"/></svg>';
const CLASSIC_SVGS = { open: OPEN_SVG, closed: CLOSED_SVG };

type Svgs = { open: string; closed: string };
// vi.hoisted so the mock factories (which vitest lifts above the imports)
// can reference these without a "used before initialization" trap.
const { loadMascotSvgs, getMascotSvgsSync, prefetchOtherModeSvgs, playMascotSound } = vi.hoisted(
  () => ({
    loadMascotSvgs: vi.fn<() => Promise<Svgs>>(),
    getMascotSvgsSync: vi.fn<() => Svgs | null>(),
    prefetchOtherModeSvgs: vi.fn<() => void>(),
    playMascotSound: vi.fn<(modeId: string) => void>(),
  }),
);
vi.mock('../data/svgData', () => ({ loadMascotSvgs, getMascotSvgsSync, prefetchOtherModeSvgs }));
vi.mock('../game/sounds', () => ({ playMascotSound }));

import { AnimatedMascot } from './AnimatedMascot';
import {
  ThemeContext,
  ColoredBgContext,
  ColorOverrideContext,
  type ColorOverrides,
} from '../game/appContext';

function renderMascot(
  opts: {
    modeId?: 'classic' | 'soyboy' | 'thisthat';
    isDark?: boolean;
    coloredBgActive?: boolean;
    overrides?: ColorOverrides;
  } = {},
) {
  const { modeId = 'classic', isDark = false, coloredBgActive = false, overrides = {} } = opts;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeContext.Provider value={isDark}>
      <ColoredBgContext.Provider value={coloredBgActive}>
        <ColorOverrideContext.Provider value={overrides}>{children}</ColorOverrideContext.Provider>
      </ColoredBgContext.Provider>
    </ThemeContext.Provider>
  );
  return render(<AnimatedMascot modeId={modeId} />, { wrapper });
}

describe('AnimatedMascot', () => {
  beforeEach(() => {
    loadMascotSvgs.mockClear();
    loadMascotSvgs.mockReturnValue(Promise.resolve(CLASSIC_SVGS));
    getMascotSvgsSync.mockReturnValue(CLASSIC_SVGS);
    playMascotSound.mockClear();
  });

  it('renders the open + closed frames from the loaded SVGs', () => {
    const { container } = renderMascot();
    const frames = container.querySelectorAll('.frame');
    expect(frames.length).toBe(2);
    // dangerouslySetInnerHTML injects the (scoped) SVG markup.
    expect(container.innerHTML).toContain('id="open"');
    expect(container.innerHTML).toContain('id="closed"');
  });

  // Regression net for the class of bug PR #26 fixed: the accent picker
  // must actually recolor the mascot. If the recolor regex stops matching
  // the mode default (e.g. a future SVG/config drift), the override color
  // won't appear in the output and this fails.
  it('applies the picker accent override to the SVG fill', () => {
    const { container } = renderMascot({
      coloredBgActive: true,
      overrides: { classic: { accent: '#abcdef' } },
    });
    expect(container.innerHTML).toContain('#abcdef');
    expect(container.innerHTML).not.toContain('#D46247');
  });

  it('leaves the default fill untouched when no override is active', () => {
    // coloredBgActive=false → recolor skips the accent swap entirely.
    const { container } = renderMascot({
      coloredBgActive: false,
      overrides: { classic: { accent: '#abcdef' } },
    });
    expect(container.innerHTML).toContain('#D46247');
    expect(container.innerHTML).not.toContain('#abcdef');
  });

  it('swaps the dark stroke color in dark mode', () => {
    const { container } = renderMascot({ isDark: true });
    // .cls-2 #2e2b26 → #1A1918 for dark-mode readability.
    expect(container.innerHTML).toContain('#1A1918');
    expect(container.innerHTML).not.toContain('#2e2b26');
  });

  it('plays the mode mascot sound on click', () => {
    const { container } = renderMascot({ modeId: 'classic' });
    const root = container.querySelector('.animated-mascot')!;
    fireEvent.click(root);
    expect(playMascotSound).toHaveBeenCalledWith('classic');
  });

  it('renders a same-size placeholder while the SVGs are still loading', () => {
    // Force a cold cache: sync getter misses, async load stays pending.
    getMascotSvgsSync.mockReturnValue(null);
    loadMascotSvgs.mockReturnValue(new Promise(() => {}));
    const { container } = renderMascot();
    const root = container.querySelector('.animated-mascot') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.style.width).toBe('120px');
    // Frames render but with empty markup until the load resolves.
    expect(container.innerHTML).not.toContain('id="open"');
  });
});
