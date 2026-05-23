import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PosLegend } from './PosLegend';

describe('PosLegend', () => {
  it('renders one labeled item per position for the classic mode (4 letters)', () => {
    render(<PosLegend modeId="classic" />);
    // Every item contains the word "letter". Counting matches survives
    // CSS-class churn from the Phase 5e module split.
    expect(screen.getAllByText(/letter/).length).toBe(4);
    expect(screen.getByText(/1st letter — 1 pt/)).toBeInTheDocument();
    expect(screen.getByText(/2nd letter — 4 pts/)).toBeInTheDocument();
  });

  it('renders three items for soyboy (3-letter words)', () => {
    render(<PosLegend modeId="soyboy" />);
    expect(screen.getAllByText(/letter/).length).toBe(3);
    expect(screen.getByText(/2nd letter — 3 pts/)).toBeInTheDocument();
  });

  it('singularizes "pt" when value is 1', () => {
    render(<PosLegend modeId="classic" />);
    expect(screen.getByText(/1st letter — 1 pt$/)).toBeInTheDocument();
  });
});
