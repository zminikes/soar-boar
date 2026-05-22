import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Stub the heavy children — they fetch SVGs, animate, or render
// large unrelated UI. StartScreen's own logic is what we're testing.
vi.mock('./AnimatedMascot', () => ({
  AnimatedMascot: () => <div data-testid="mock-mascot" />,
}));
vi.mock('./FlyingPig', () => ({
  FlyingPig: () => <div data-testid="mock-flying-pig" />,
}));
vi.mock('./EmailSignup', () => ({
  EmailSignup: () => <div data-testid="mock-email-signup" />,
}));
vi.mock('./DemoSection', () => ({
  DemoSection: () => <div data-testid="mock-demo" />,
}));

import { StartScreen } from './StartScreen';
import type { DebugState } from '../lib/types';

const DEFAULT_DEBUG: DebugState = {
  streakRule: true,
  foreverMode: false,
  darkMode: false,
};

function renderStartScreen(overrides: Partial<React.ComponentProps<typeof StartScreen>> = {}) {
  const props: React.ComponentProps<typeof StartScreen> = {
    onStart: vi.fn(),
    onStartForever: vi.fn(),
    onTutorial: vi.fn(),
    debug: DEFAULT_DEBUG,
    setDebug: vi.fn(),
    modeId: 'classic',
    setModeId: vi.fn(),
    debugMode: false,
    ...overrides,
  };
  return { props, ...render(<StartScreen {...props} />) };
}

describe('StartScreen', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the three mode tabs', () => {
    renderStartScreen();
    expect(screen.getByRole('tab', { name: 'Soar Boar' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Soy Boy' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'This That' })).toBeInTheDocument();
  });

  it('marks only the active mode tab as selected', () => {
    renderStartScreen({ modeId: 'soyboy' });
    expect(screen.getByRole('tab', { name: 'Soy Boy' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Soar Boar' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'This That' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls setModeId when a mode tab is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderStartScreen();
    await user.click(screen.getByRole('tab', { name: 'This That' }));
    expect(props.setModeId).toHaveBeenCalledWith('thisthat');
  });

  it('calls onStart when the Play button is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderStartScreen();
    await user.click(screen.getByRole('button', { name: 'Play' }));
    expect(props.onStart).toHaveBeenCalledTimes(1);
  });

  it('calls onTutorial when "Show me how" is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderStartScreen();
    await user.click(screen.getByRole('button', { name: 'Show me how' }));
    expect(props.onTutorial).toHaveBeenCalledTimes(1);
  });

  it('preferences panel starts collapsed and expands on toggle', async () => {
    const user = userEvent.setup();
    renderStartScreen();
    const prefsBtn = screen.getByRole('button', { name: 'Preferences' });
    expect(prefsBtn).toHaveAttribute('aria-expanded', 'false');
    await user.click(prefsBtn);
    expect(prefsBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggling a preference calls setDebug with an updater function', async () => {
    const user = userEvent.setup();
    const { props } = renderStartScreen();
    // Open the panel so the toggles are interactable.
    await user.click(screen.getByRole('button', { name: 'Preferences' }));
    await user.click(screen.getByRole('checkbox', { name: 'Dark mode' }));
    expect(props.setDebug).toHaveBeenCalledTimes(1);
    // setDebug is called with a functional updater — invoke it to verify
    // it produces the expected next-state shape rather than asserting on
    // the function reference directly.
    const updater = vi.mocked(props.setDebug).mock.calls[0][0];
    expect(typeof updater).toBe('function');
    if (typeof updater === 'function') {
      const next = updater(DEFAULT_DEBUG);
      expect(next).toEqual({ ...DEFAULT_DEBUG, darkMode: true });
    }
  });

  it('hides the forever-mode toggle in thisthat (ladder mode)', async () => {
    const user = userEvent.setup();
    renderStartScreen({ modeId: 'thisthat' });
    await user.click(screen.getByRole('button', { name: 'Preferences' }));
    expect(screen.queryByRole('checkbox', { name: 'Forever mode' })).toBeNull();
    // The other two prefs are still there.
    expect(screen.getByRole('checkbox', { name: 'Dark mode' })).toBeInTheDocument();
  });

  it('shows the personal best chip when there is a non-zero best score', () => {
    localStorage.setItem('bestScore:classic', '42');
    renderStartScreen();
    expect(screen.getByText(/Personal best/)).toBeInTheDocument();
    expect(screen.getByText(/42 pts/)).toBeInTheDocument();
  });

  it('omits the personal best chip when there is no best score', () => {
    renderStartScreen();
    expect(screen.queryByText(/Personal best/)).toBeNull();
  });
});
