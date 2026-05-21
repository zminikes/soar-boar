import { Toggle } from './Toggle';

/* Design experiments — A/B compare directions.
   The colored-bg color picker lives in a floating panel rendered at the
   App root (not here) so it stays visible while scrolling. */
export function ExperimentsPanel({ debug, setDebug }) {
  const experiments = [
    // No experiments currently — colored bg is now canonical.
  ];
  if (!experiments.length) return null;
  return (
    <>
      <div style={{
        marginTop: 16, paddingTop: 14,
        borderTop: '1px solid var(--border)',
        fontFamily: 'var(--ff-sans)', fontSize: 12, fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--muted)',
      }}>
        Design experiments
      </div>
      {experiments.map(({ key, label, sub }) => (
        <div key={key} className="prefs-row" style={{ marginTop: 12 }}>
          <div><div className="prefs-label">{label}</div><div className="prefs-sub">{sub}</div></div>
          <Toggle checked={debug[key]} onChange={v => setDebug(d => ({ ...d, [key]: v }))} label={label} />
        </div>
      ))}
    </>
  );
}
