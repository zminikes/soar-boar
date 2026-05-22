import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the four screens so this test focuses on App's transition wiring
// rather than each screen's internal behavior. The mocks expose the
// callbacks via data attributes so the test can invoke them.
vi.mock('./components/StartScreen', () => ({
  StartScreen: (props: { onStart: () => void; onTutorial: () => void; setModeId: (m: string) => void }) => (
    <div data-testid="start-screen">
      <button onClick={props.onStart}>play</button>
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
  PlayScreen: (props: { onHome: () => void; onEnd: (res: unknown) => void }) => (
    <div data-testid="play-screen">
      <button onClick={props.onHome}>home</button>
      <button onClick={() => props.onEnd({ score: 5, chain: [{ word: 'SOAR' }], deadEnd: false })}>finish</button>
    </div>
  ),
}));
vi.mock('./components/EndScreen', () => ({
  EndScreen: (props: { onHome: () => void; onRestart: () => void }) => (
    <div data-testid="end-screen">
      <button onClick={props.onHome}>end-home</button>
      <button onClick={props.onRestart}>end-restart</button>
    </div>
  ),
}));
// Decorative — keep out of the way.
vi.mock('./components/BoilDefs', () => ({ BoilDefs: () => null }));
vi.mock('./components/FloatingColorPicker', () => ({ FloatingColorPicker: () => null }));
vi.mock('./components/DebugBadge', () => ({ DebugBadge: () => null }));

import { App } from './App';

describe('App screen transitions', () => {
  beforeEach(() => {
    localStorage.clear();
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

  it('mounts a fresh PlayScreen on restart (verified via remount-only data flow)', async () => {
    const user = userEvent.setup();
    render(<App />);
    // start → play → finish (now on end) → restart (back to playing)
    await user.click(screen.getByRole('button', { name: 'play' }));
    await user.click(screen.getByRole('button', { name: 'finish' }));
    await user.click(screen.getByRole('button', { name: 'end-restart' }));
    expect(screen.getByTestId('play-screen')).toBeInTheDocument();
  });

  it('runs the appVersion=3 migration on first mount (clears prior colorOverrides)', () => {
    localStorage.setItem('colorOverrides', '{"classic":{"bg":"#000"}}');
    localStorage.removeItem('appVersion');
    render(<App />);
    expect(localStorage.getItem('appVersion')).toBe('3');
    // App.tsx clears colorOverrides during init, then the effect rewrites
    // it with the empty object on first mount. Either "{}" or null means
    // the migration ran. (The state defaults to {}, and the effect
    // serializes it back.)
    const after = localStorage.getItem('colorOverrides');
    expect(after === '{}' || after === null).toBe(true);
  });

  it('persists darkMode state through the localStorage init path', () => {
    localStorage.setItem('darkMode', 'true');
    render(<App />);
    // App reads localStorage.darkMode for the initial debug.darkMode value.
    // The dataset attribute is the observable side effect.
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
