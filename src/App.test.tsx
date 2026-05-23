import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEffect } from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Module-level counter so the PlayScreen mock can prove it actually
// remounted (incremented `playKey`) rather than just re-rendered.
let playMountCount = 0;

// Mock the four screens so this test focuses on App's transition wiring
// rather than each screen's internal behavior. The mocks expose the
// callbacks via buttons and surface select prop values via data
// attributes so the test can verify propagation.
vi.mock('./components/StartScreen', () => ({
  StartScreen: (props: {
    onStart: () => void;
    onStartForever: () => void;
    onTutorial: () => void;
    modeId: string;
    setModeId: (m: string) => void;
  }) => (
    <div data-testid="start-screen" data-mode-id={props.modeId}>
      <button onClick={props.onStart}>play</button>
      <button onClick={props.onStartForever}>play-forever</button>
      <button onClick={props.onTutorial}>tutorial</button>
      <button onClick={() => props.setModeId('soyboy')}>set-mode-soyboy</button>
    </div>
  ),
}));
vi.mock('./components/OnboardingScreen', () => ({
  OnboardingScreen: (props: { onBack: () => void; onDone: () => void }) => (
    <div data-testid="tutorial-screen">
      <button onClick={props.onBack}>back</button>
      <button onClick={props.onDone}>done</button>
    </div>
  ),
}));
vi.mock('./components/PlayScreen', () => ({
  PlayScreen: (props: {
    onHome: () => void;
    onEnd: (res: unknown) => void;
    debug: { foreverMode: boolean };
    modeId: string;
  }) => {
    // Module-level counter increments on every mount — re-renders don't
    // hit the effect, which lets the test prove a real remount happened
    // (i.e. App passed a fresh `key`).
    useEffect(() => {
      playMountCount++;
    }, []);
    return (
      <div
        data-testid="play-screen"
        data-mode-id={props.modeId}
        data-forever={String(props.debug.foreverMode)}
      >
        <button onClick={props.onHome}>home</button>
        <button
          onClick={() => props.onEnd({ score: 5, chain: [{ word: 'SOAR' }], deadEnd: false })}
        >
          finish
        </button>
      </div>
    );
  },
}));
vi.mock('./components/EndScreen', () => ({
  EndScreen: (props: { onHome: () => void; onRestart: () => void; modeId: string }) => (
    <div data-testid="end-screen" data-mode-id={props.modeId}>
      <button onClick={props.onHome}>end-home</button>
      <button onClick={props.onRestart}>end-restart</button>
    </div>
  ),
}));
// Decorative — keep out of the way.
vi.mock('./components/BoilDefs', () => ({ BoilDefs: () => null }));
vi.mock('./components/FloatingColorPicker', () => ({ FloatingColorPicker: () => null }));
// DebugBadge is NOT mocked — the keyboard-shortcut test needs to
// observe it appearing.

import { App } from './App';

describe('App screen transitions', () => {
  beforeEach(() => {
    localStorage.clear();
    playMountCount = 0;
    // Reset URL between tests so URL-driven debug-mode init is hermetic.
    window.history.replaceState({}, '', '/');
  });

  it('renders the start screen by default', () => {
    render(<App />);
    expect(screen.getByTestId('start-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('play-screen')).toBeNull();
  });

  it('transitions start → playing when Play is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'play' }));
    expect(screen.getByTestId('play-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('start-screen')).toBeNull();
  });

  it('transitions playing → end when PlayScreen calls onEnd', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'play' }));
    await user.click(screen.getByRole('button', { name: 'finish' }));
    expect(screen.getByTestId('end-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('play-screen')).toBeNull();
  });

  it('transitions playing → start when PlayScreen calls onHome', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'play' }));
    await user.click(screen.getByRole('button', { name: 'home' }));
    expect(screen.getByTestId('start-screen')).toBeInTheDocument();
  });

  it('transitions end → start when EndScreen calls onHome', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'play' }));
    await user.click(screen.getByRole('button', { name: 'finish' }));
    await user.click(screen.getByRole('button', { name: 'end-home' }));
    expect(screen.getByTestId('start-screen')).toBeInTheDocument();
  });

  it('transitions start → tutorial when Show me how is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'tutorial' }));
    expect(screen.getByTestId('tutorial-screen')).toBeInTheDocument();
  });

  it('transitions tutorial → start when OnboardingScreen calls onBack', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'tutorial' }));
    await user.click(screen.getByRole('button', { name: 'back' }));
    expect(screen.getByTestId('start-screen')).toBeInTheDocument();
  });

  it('remounts PlayScreen on restart (fresh key, not just re-render)', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'play' }));
    expect(playMountCount).toBe(1);
    await user.click(screen.getByRole('button', { name: 'finish' }));
    await user.click(screen.getByRole('button', { name: 'end-restart' }));
    // A fresh key forces a real remount — the effect fires again.
    expect(playMountCount).toBe(2);
  });

  it('preserves modeId across start → playing → end → start', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'set-mode-soyboy' }));
    expect(screen.getByTestId('start-screen')).toHaveAttribute('data-mode-id', 'soyboy');
    await user.click(screen.getByRole('button', { name: 'play' }));
    expect(screen.getByTestId('play-screen')).toHaveAttribute('data-mode-id', 'soyboy');
    await user.click(screen.getByRole('button', { name: 'finish' }));
    expect(screen.getByTestId('end-screen')).toHaveAttribute('data-mode-id', 'soyboy');
    await user.click(screen.getByRole('button', { name: 'end-home' }));
    expect(screen.getByTestId('start-screen')).toHaveAttribute('data-mode-id', 'soyboy');
  });

  it('start-forever sets debug.foreverMode=true on the resulting PlayScreen', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'play-forever' }));
    expect(screen.getByTestId('play-screen')).toHaveAttribute('data-forever', 'true');
  });

  it('Cmd+Shift+D toggles debug mode (DebugBadge appears)', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: /Debug/ })).toBeNull();
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'd',
          metaKey: true,
          shiftKey: true,
        }),
      );
    });
    expect(screen.getByRole('button', { name: /Debug/ })).toBeInTheDocument();
  });

  it('initializes debugMode from the ?debug=1 URL parameter', () => {
    window.history.replaceState({}, '', '/?debug=1');
    render(<App />);
    expect(screen.getByRole('button', { name: /Debug/ })).toBeInTheDocument();
    expect(localStorage.getItem('debugMode')).toBe('true');
  });

  it('runs the appVersion=3 migration on first mount (clears prior colorOverrides)', () => {
    localStorage.setItem('colorOverrides', '{"classic":{"bg":"#000"}}');
    localStorage.removeItem('appVersion');
    render(<App />);
    expect(localStorage.getItem('appVersion')).toBe('3');
    // App.tsx clears colorOverrides during init, then the effect rewrites
    // it as the JSON of the empty {} state.
    expect(localStorage.getItem('colorOverrides')).toBe('{}');
  });

  it('persists darkMode state through the localStorage init path', () => {
    localStorage.setItem('darkMode', 'true');
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
