import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Onboarding's confetti uses Math.random + DOM measurement — keep it
// out of the way so the tutorial-flow tests aren't checking confetti.
vi.mock('./Confetti', () => ({ Confetti: () => null }));
// Keyboard renders only on touch devices in jsdom — Onboarding still
// works without it because the test fires real `keydown` events on
// window (the component's listener), but the mock keeps the render
// tree simple and avoids depending on the isTouchDevice escape hatch.
vi.mock('./Keyboard', () => ({ Keyboard: () => null }));

import { OnboardingScreen } from './OnboardingScreen';

function renderOnboarding(overrides: Partial<React.ComponentProps<typeof OnboardingScreen>> = {}) {
  const props: React.ComponentProps<typeof OnboardingScreen> = {
    onDone: vi.fn(),
    onDoneForever: vi.fn(),
    onBack: vi.fn(),
    modeId: 'classic',
    ...overrides,
  };
  return { props, ...render(<OnboardingScreen {...props} />) };
}

// Helper to dispatch a real keyboard event the way OnboardingScreen's
// window-level listener consumes it. user-event's keyboard helper
// targets the focused element by default; this component listens on
// the window directly, so we bypass via dispatchEvent inside act().
function pressKey(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  });
}

describe('OnboardingScreen', () => {
  it('renders the mode tutorial label and starting word', () => {
    renderOnboarding({ modeId: 'classic' });
    expect(screen.getByText(/Tutorial · Soar Boar/)).toBeInTheDocument();
    // Starting word for classic is SOAR — each letter rendered as a tile.
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('O')).toBeInTheDocument();
    // First hint shows the next instruction.
    expect(screen.getByText('Type BOAR')).toBeInTheDocument();
  });

  it('renders the ladder target banner in thisthat mode', () => {
    renderOnboarding({ modeId: 'thisthat' });
    expect(screen.getByText('Get to')).toBeInTheDocument();
    // THAT target letters appear as tiles.
    expect(screen.getByText(/Reach the target/)).toBeInTheDocument();
  });

  it('calls onBack when the back button is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderOnboarding();
    await user.click(screen.getByRole('button', { name: /Back/ }));
    expect(props.onBack).toHaveBeenCalledTimes(1);
  });

  it('completes the classic tutorial via keypresses and surfaces onDone', async () => {
    const user = userEvent.setup();
    const { props } = renderOnboarding({ modeId: 'classic' });
    // Type BOAR (auto-submits on the 4th letter).
    pressKey('B'); pressKey('O'); pressKey('A'); pressKey('R');
    // Then BEAR — last word of the tutorial, sets done=true.
    pressKey('B'); pressKey('E'); pressKey('A'); pressKey('R');
    // Done screen shows the "Let's play!" button.
    const playBtn = await screen.findByRole('button', { name: /Let.?s play/ });
    await user.click(playBtn);
    expect(props.onDone).toHaveBeenCalledTimes(1);
  });

  it('rejects non-word inputs without advancing', () => {
    renderOnboarding({ modeId: 'classic' });
    // From SOAR, type XOAR — a one-letter change that isn't a real word.
    // (4-letter inputs with multiple diffs trigger a different message:
    // "Changed N letters — change just 1". XOAR keeps the diff at 1 so
    // we exercise the wordlist-rejection branch specifically.)
    pressKey('X'); pressKey('O'); pressKey('A'); pressKey('R');
    expect(screen.getByText(/Not a word/)).toBeInTheDocument();
    // Still on step 0 — first hint is still showing.
    expect(screen.getByText('Type BOAR')).toBeInTheDocument();
  });

  it('ignores keypresses with modifier keys (so Cmd+R etc. pass through)', () => {
    renderOnboarding({ modeId: 'classic' });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', metaKey: true }));
    });
    // No tile should show 'B' — modifier-key events are ignored.
    expect(screen.queryByText('B')).toBeNull();
  });
});
