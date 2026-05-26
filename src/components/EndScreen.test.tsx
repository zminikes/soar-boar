import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EndScreen } from './EndScreen';
import type { ChainEntry, DebugState } from '../lib/types';
import { BEST_KEY } from '../platform/dom';

const DEFAULT_DEBUG: DebugState = {
  streakRule: true,
  foreverMode: false,
  darkMode: false,
};

// 5-word classic-mode chain ending at 4 points. The chain itself doesn't
// drive scoring here (the parent computes score and passes it in); we
// just need a valid shape for ChainRows and share-text generation.
const SAMPLE_CHAIN: ChainEntry[] = [
  { word: 'SOAR' },
  { word: 'BOAR', pts: 1 },
  { word: 'BEAR', pts: 1 },
  { word: 'BEAT', pts: 1 },
  { word: 'BEST', pts: 1 },
];

function renderEndScreen(overrides: Partial<React.ComponentProps<typeof EndScreen>> = {}) {
  const props: React.ComponentProps<typeof EndScreen> = {
    score: 4,
    chain: SAMPLE_CHAIN,
    deadEnd: false,
    onRestart: vi.fn(),
    onHome: vi.fn(),
    debug: DEFAULT_DEBUG,
    modeId: 'classic',
    ...overrides,
  };
  return { props, ...render(<EndScreen {...props} />) };
}

describe('EndScreen', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('shows the score for a timed-mode run', () => {
    renderEndScreen({ score: 4 });
    // chain.length - 1 = 4 transitions = "4 words · 4 points". This is
    // more specific than the bare "4" and survives layout adjacency
    // (e.g. a "4-letter words" subtitle wouldn't match).
    expect(screen.getByText(/4 words · 4 points/)).toBeInTheDocument();
  });

  it('shows the dead-end indicator when deadEnd is true', () => {
    renderEndScreen({ deadEnd: true });
    expect(screen.getByText(/Hit a dead end/)).toBeInTheDocument();
  });

  it('omits the dead-end indicator on clean end', () => {
    renderEndScreen({ deadEnd: false });
    expect(screen.queryByText(/Hit a dead end/)).toBeNull();
  });

  it('shows the new-best banner and persists the new best score', () => {
    // Prior best is 0 by default (cleared in beforeEach); score 4 should
    // qualify as a new best.
    renderEndScreen({ score: 4 });
    expect(
      screen.getByRole('button', { name: /Celebrate new personal best/i }),
    ).toBeInTheDocument();
    expect(localStorage.getItem(BEST_KEY('classic'))).toBe('4');
  });

  it('shows the existing personal-best chip when score does not beat it', () => {
    localStorage.setItem(BEST_KEY('classic'), '99');
    renderEndScreen({ score: 4 });
    // No new-best banner.
    expect(screen.queryByRole('button', { name: /Celebrate/i })).toBeNull();
    // Existing best chip is shown.
    expect(screen.getByText(/Personal best/)).toBeInTheDocument();
    expect(screen.getByText(/99 pts/)).toBeInTheDocument();
  });

  it('does not write to best-score storage in forever mode', () => {
    renderEndScreen({
      score: 99,
      debug: { ...DEFAULT_DEBUG, foreverMode: true },
    });
    expect(localStorage.getItem(BEST_KEY('classic'))).toBeNull();
  });

  it('calls onRestart when the restart button is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderEndScreen();
    await user.click(screen.getByRole('button', { name: 'Play again' }));
    expect(props.onRestart).toHaveBeenCalledTimes(1);
  });

  it('calls onHome when the header is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderEndScreen();
    await user.click(screen.getByRole('button', { name: 'Back to home' }));
    expect(props.onHome).toHaveBeenCalledTimes(1);
  });

  it('falls back to clipboard.writeText when navigator.share rejects', async () => {
    // setup.ts installed a resolving mock for navigator.share, so
    // HAS_NATIVE_SHARE captured at module load is true. We spyOn both
    // navigator.share and navigator.clipboard.writeText so afterEach's
    // vi.restoreAllMocks() restores them — direct assignment would
    // leak state to other test files that depend on the setup.ts mocks.
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    vi.spyOn(navigator, 'share').mockRejectedValue(new Error('user cancelled'));

    const user = userEvent.setup();
    renderEndScreen();
    const shareBtn = screen.getByRole('button', { name: /(Share|Copy) ladder/ });
    await user.click(shareBtn);

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toMatch(/soarboar\.com/);
    expect(await screen.findByText(/Copied to clipboard/)).toBeInTheDocument();
  });

  it('renders ladder-mode win text with par comparison', () => {
    renderEndScreen({
      modeId: 'thisthat',
      score: 3,
      win: true,
      target: 'THAT',
      par: 3,
      chain: [{ word: 'THIS' }, { word: 'THIN' }, { word: 'THAN' }, { word: 'THAT' }],
    });
    expect(screen.getByText(/3 moves/)).toBeInTheDocument();
    // Matched/beat par is celebrated by the .new-best-banner button rather
    // than the end-score-label, so the label stays neutral.
    expect(screen.getByRole('button', { name: /matched the best path/i })).toBeInTheDocument();
  });

  it('renders ladder-mode "Gave up" text on non-win end', () => {
    renderEndScreen({
      modeId: 'thisthat',
      score: 2,
      win: false,
      target: 'THAT',
      par: 3,
      chain: [{ word: 'THIS' }, { word: 'THIN' }, { word: 'THAN' }],
    });
    expect(screen.getByText('Gave up')).toBeInTheDocument();
    expect(screen.getByText(/Was heading to THAT/)).toBeInTheDocument();
  });

  it('renders the chain ladder with every entry', () => {
    renderEndScreen();
    expect(screen.getByText('Ladder')).toBeInTheDocument();
    // Chain tiles are single-uppercase-letter elements. Total count
    // pins all entries got rendered — stable across the Phase 5e
    // CSS-module class rename.
    const tiles = screen.getAllByText(/^[A-Z]$/);
    const expectedTiles = SAMPLE_CHAIN.reduce((sum, e) => sum + e.word.length, 0);
    expect(tiles.length).toBe(expectedTiles);
  });
});
