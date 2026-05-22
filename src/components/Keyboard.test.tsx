import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// isTouchDevice is evaluated once at module load (src/platform/dom.ts).
// Mock the module so Keyboard renders in jsdom — the real check uses
// `'ontouchstart' in window` which is false in jsdom.
vi.mock('../platform/dom', () => ({
  isTouchDevice: true,
  BEST_KEY: (m: string) => `bestScore:${m}`,
  getBestScore: () => 0,
  setBestScore: () => {},
}));

import { Keyboard } from './Keyboard';

describe('Keyboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all three QWERTY rows', () => {
    render(<Keyboard onKey={() => {}} />);
    // Q-row, A-row, Z-row leftmost letter — sanity check.
    expect(screen.getByRole('button', { name: 'Q' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Z' })).toBeInTheDocument();
  });

  it('dispatches "Enter" for the ENTER key', async () => {
    const user = userEvent.setup();
    const onKey = vi.fn();
    render(<Keyboard onKey={onKey} />);
    await user.pointer({ keys: '[MouseLeft]', target: screen.getByRole('button', { name: 'Enter' }) });
    expect(onKey).toHaveBeenCalledWith('Enter');
  });

  it('dispatches "Backspace" for the ⌫ key', async () => {
    const user = userEvent.setup();
    const onKey = vi.fn();
    render(<Keyboard onKey={onKey} />);
    await user.pointer({ keys: '[MouseLeft]', target: screen.getByRole('button', { name: 'Backspace' }) });
    expect(onKey).toHaveBeenCalledWith('Backspace');
  });

  it('dispatches the letter for letter keys', async () => {
    const user = userEvent.setup();
    const onKey = vi.fn();
    render(<Keyboard onKey={onKey} />);
    await user.pointer({ keys: '[MouseLeft]', target: screen.getByRole('button', { name: 'M' }) });
    expect(onKey).toHaveBeenCalledWith('M');
  });

  it('renders nothing when visible=false', () => {
    const { container } = render(<Keyboard onKey={() => {}} visible={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
