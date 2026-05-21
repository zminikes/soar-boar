interface DebugBadgeProps {
  onToggle: () => void;
}

export function DebugBadge({ onToggle }: DebugBadgeProps) {
  return (
    <button
      type="button"
      className="debug-badge"
      onClick={onToggle}
      title="Click to disable debug (or press ⌘⇧D / Ctrl+Shift+D)"
    >
      ● Debug
    </button>
  );
}
