import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChainRows } from './ChainRows';
import type { ChainEntry } from '../lib/types';

describe('ChainRows', () => {
  it('renders one tile per letter across every chain entry', () => {
    const chain: ChainEntry[] = [{ word: 'SOAR' }, { word: 'BOAR', pts: 1 }];
    render(<ChainRows chain={chain} />);
    // Each tile is a single-uppercase-letter element. Counting matches
    // (rather than counting CSS classes) is stable across the Phase 5e
    // CSS-module class rename.
    const tiles = screen.getAllByText(/^[A-Z]$/);
    expect(tiles.length).toBe(8); // 2 words × 4 letters
  });

  it('marks only the changed letter position with data-changed', () => {
    const chain: ChainEntry[] = [{ word: 'SOAR' }, { word: 'BOAR', pts: 1 }];
    const { container } = render(<ChainRows chain={chain} />);
    // BOAR differs from SOAR at position 0 only. data-changed is a stable
    // contract (not a CSS class, which would churn with CSS modules).
    const changed = container.querySelectorAll('[data-changed="true"]');
    expect(changed.length).toBe(1);
    expect(changed[0]).toHaveTextContent('B');
  });

  it('renders the pts annotation when pts is set', () => {
    const chain: ChainEntry[] = [{ word: 'SOAR' }, { word: 'BOAR', pts: 1 }];
    render(<ChainRows chain={chain} />);
    // Annotation simplified on main to just '+N' — no per-position label.
    expect(screen.getByText(/^1$/)).toBeInTheDocument();
  });

  it('omits the pts annotation when pts is null', () => {
    const chain: ChainEntry[] = [{ word: 'SOAR' }, { word: 'BOAR', pts: null }];
    render(<ChainRows chain={chain} />);
    // No "+N" text anywhere → annotation was skipped.
    expect(screen.queryByText(/\+\d/)).toBeNull();
  });
});
