import { MODE_CONFIGS, type ModeId } from '../lib/modes';
import { POS_COLORS } from '../game/constants';

interface PosLegendProps {
  modeId?: ModeId;
}

export function PosLegend({ modeId = 'classic' }: PosLegendProps) {
  const cfg = MODE_CONFIGS[modeId];
  const labels = cfg.posPts.map(
    (pts, i) => `${cfg.posLabels[i]} letter — ${pts} pt${pts !== 1 ? 's' : ''}`,
  );
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
