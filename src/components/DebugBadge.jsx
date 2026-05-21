export function DebugBadge({ onToggle }) {
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
