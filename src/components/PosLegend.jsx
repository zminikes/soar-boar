import { MODES } from '../game/modes';
import { POS_COLORS } from '../game/constants';

export function PosLegend({ modeId = 'classic' }) {
  const cfg = MODES[modeId];
  const labels = cfg.posPts.map((pts, i) => `${cfg.posLabels[i]} letter — ${pts} pt${pts !== 1 ? 's' : ''}`);
  return (
    <div className="pos-legend">
      {labels.map((label, i) => (
        <div key={i} className="pos-item">
          <div className="pos-dot" style={{ background: POS_COLORS[i] }} />
          {label}
        </div>
      ))}
    </div>
  );
}
