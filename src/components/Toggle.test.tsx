import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('renders with the supplied aria-label', () => {
    render(<Toggle checked={false} onChange={() => {}} label="Dark mode" />);
    // Both the label wrapper and the checkbox carry the aria-label, so
    // getAllByLabelText covers either. Asserting on the checkbox role
    // pins the behavior most consumers care about.
    expect(screen.getByRole('checkbox', { name: 'Dark mode' })).toBeInTheDocument();
  });

  it('reflects the checked prop', () => {
    const { rerender } = render(<Toggle checked={false} onChange={() => {}} label="x" />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    rerender(<Toggle checked={true} onChange={() => {}} label="x" />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('calls onChange with the new boolean when toggled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="x" />);
    await user.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
