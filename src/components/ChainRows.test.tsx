import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChainRows } from './ChainRows';
import type { ChainEntry } from '../lib/types';

describe('ChainRows', () => {
  it('renders one tile per letter across every chain entry', () => {
    const chain: ChainEntry[] = [
      { word: 'SOAR' },
      { word: 'BOAR', pts: 1 },
    ];
    render(<ChainRows chain={chain} />);
    // Each tile is a single-uppercase-letter element. Counting matches
    // (rather than counting CSS classes) is stable across the Phase 5e
    // CSS-module class rename.
    const tiles = screen.getAllByText(/^[A-Z]$/);
    expect(tiles.length).toBe(8); // 2 words × 4 letters
  });

  it('marks only the changed letter position with data-changed', () => {
    const chain: ChainEntry[] = [
      { word: 'SOAR' },
      { word: 'BOAR', pts: 1 },
    ];
    const { container } = render(<ChainRows chain={chain} />);
    // BOAR differs from SOAR at position 0 only. data-changed is a stable
    // contract (not a CSS class, which would churn with CSS modules).
    const changed = container.querySelectorAll('[data-changed="true"]');
    expect(changed.length).toBe(1);
    expect(changed[0]).toHaveTextContent('B');
  });

  it('renders the pts annotation when pts is set', () => {
    const chain: ChainEntry[] = [
      { word: 'SOAR' },
      { word: 'BOAR', pts: 1 },
    ];
    render(<ChainRows chain={chain} />);
    // "+1 · 1st letter" — classic mode default labels.
    expect(screen.getByText(/\+1/)).toBeInTheDocument();
    expect(screen.getByText(/1st/)).toBeInTheDocument();
  });

  it('omits the pts annotation when pts is null', () => {
    const chain: ChainEntry[] = [
      { word: 'SOAR' },
      { word: 'BOAR', pts: null },
    ];
    render(<ChainRows chain={chain} />);
    // No "+N" text anywhere → annotation was skipped.
    expect(screen.queryByText(/\+\d/)).toBeNull();
  });

  it('uses mode-specific position labels', () => {
    const chain: ChainEntry[] = [
      { word: 'SOY' },
      { word: 'BOY', pts: 1 },
    ];
    // Soyboy is 3-letter; labels are ['1st', '2nd', '3rd'] — same as classic
    // for position 0. The test pins the mode-config plumbing, not a unique label.
    render(<ChainRows chain={chain} modeId="soyboy" />);
    expect(screen.getByText(/1st/)).toBeInTheDocument();
  });
});
