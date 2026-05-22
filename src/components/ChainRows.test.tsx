import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChainRows } from './ChainRows';
import type { ChainEntry } from '../lib/types';

describe('ChainRows', () => {
  it('renders each chain entry as a row of tiles', () => {
    const chain: ChainEntry[] = [
      { word: 'SOAR' },
      { word: 'BOAR', pts: 1 },
    ];
    const { container } = render(<ChainRows chain={chain} />);
    // Two rows, four tiles each (4-letter words).
    expect(container.querySelectorAll('.chain-row').length).toBe(2);
    expect(container.querySelectorAll('.chain-tile').length).toBe(8);
  });

  it('marks the changed letter position with the "changed" class', () => {
    const chain: ChainEntry[] = [
      { word: 'SOAR' },
      { word: 'BOAR', pts: 1 },
    ];
    const { container } = render(<ChainRows chain={chain} />);
    // Rows are rendered in reverse order; BOAR is first in the DOM.
    // Only position 0 differs (S→B).
    const firstRowTiles = container.querySelectorAll('.chain-row')[0].querySelectorAll('.chain-tile');
    expect(firstRowTiles[0]).toHaveClass('changed');
    expect(firstRowTiles[1]).not.toHaveClass('changed');
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
    const { container } = render(<ChainRows chain={chain} />);
    expect(container.querySelector('.chain-pts')).toBeNull();
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
