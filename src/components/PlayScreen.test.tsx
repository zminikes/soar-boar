import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

// Mock the heavy children — keep PlayScreen's own logic in scope.
vi.mock('./MascotIcon', () => ({
  MascotIcon: () => <div data-testid="mock-mascot-icon" />,
}));
vi.mock('./Keyboard', () => ({
  Keyboard: () => <div data-testid="mock-keyboard" />,
}));
vi.mock('./ChainRows', () => ({
  ChainRows: () => <div data-testid="mock-chain-rows" />,
}));

import { PlayScreen } from './PlayScreen';
import type { DebugState } from '../lib/types';

const DEFAULT_DEBUG: DebugState = {
  streakRule: true,
  foreverMode: false,
  darkMode: false,
};

function renderPlayScreen(overrides: Partial<React.ComponentProps<typeof PlayScreen>> = {}) {
  const props: React.ComponentProps<typeof PlayScreen> = {
    puzzleSeed: 1,
    onEnd: vi.fn(),
    onHome: vi.fn(),
    onRestart: vi.fn(),
    onNewPuzzle: vi.fn(),
    debug: DEFAULT_DEBUG,
    modeId: 'classic',
    ...overrides,
  };
  return { props, ...render(<PlayScreen {...props} />) };
}

// Reads the typed-input cells. The screen has two `.tile-row` blocks —
// the current word (read-only) and the typed input. The "Next word"
// section-label sits immediately before the typed row.
function typedLetters(): string {
  const nextLabel = Array.from(document.querySelectorAll('.section-label')).find(
    (el) => el.textContent === 'Next word',
  );
  const row = nextLabel?.nextElementSibling;
  return Array.from(row?.querySelectorAll('.tile') ?? [])
    .map((el) => el.textContent ?? '')
    .join('');
}

describe('PlayScreen — first keystroke during countdown', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Regression test for the "first letter is swallowed" bug:
  // handleKeyDown read stateRef.current.phase right after dispatching
  // START_PLAYING and saw a stale 'countdown' phase, so it returned
  // before dispatching TYPE_LETTER. Players had to press the first
  // letter twice. With the fix, a single letter press during countdown
  // both starts the game and lands as the first typed letter.
  it('first letter press during countdown both starts the game and types the letter', () => {
    renderPlayScreen({ modeId: 'classic' });
    expect(screen.getByText('Starting in')).toBeInTheDocument();
    expect(typedLetters()).toBe('');

    fireEvent.keyDown(window, { key: 'b' });

    expect(screen.queryByText('Starting in')).toBeNull();
    expect(screen.getByText('Time left')).toBeInTheDocument();
    expect(typedLetters()).toBe('B');
  });

  it('non-letter keys during countdown do not start the game', () => {
    renderPlayScreen({ modeId: 'classic' });
    expect(screen.getByText('Starting in')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Backspace' });

    expect(screen.getByText('Starting in')).toBeInTheDocument();
    expect(typedLetters()).toBe('');
  });
});
