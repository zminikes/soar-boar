interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="toggle" aria-label={label}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
      <span className="toggle-track" />
    </label>
  );
}
