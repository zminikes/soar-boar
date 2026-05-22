import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PosLegend } from './PosLegend';

describe('PosLegend', () => {
  it('renders one item per position for the classic mode (4 letters)', () => {
    const { container } = render(<PosLegend modeId="classic" />);
    expect(container.querySelectorAll('.pos-item').length).toBe(4);
    expect(screen.getByText(/1st letter — 1 pt/)).toBeInTheDocument();
    expect(screen.getByText(/2nd letter — 4 pts/)).toBeInTheDocument();
  });

  it('renders three items for soyboy (3-letter words)', () => {
    const { container } = render(<PosLegend modeId="soyboy" />);
    expect(container.querySelectorAll('.pos-item').length).toBe(3);
    expect(screen.getByText(/2nd letter — 3 pts/)).toBeInTheDocument();
  });

  it('singularizes "pt" when value is 1', () => {
    render(<PosLegend modeId="classic" />);
    expect(screen.getByText(/1st letter — 1 pt$/)).toBeInTheDocument();
  });
});
