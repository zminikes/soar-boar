import { MODE_CONFIGS, type ModeId } from '../lib/modes';
import { diffPos } from '../lib/moves';
import type { ChainEntry } from '../lib/types';

interface ChainRowsProps {
  // readonly: the component only calls chain.slice().reverse() which copies
  // before iterating, so we never mutate. Documents the contract.
  chain: readonly ChainEntry[];
  maxHeight?: number;
  modeId?: ModeId;
}

export function ChainRows({ chain, maxHeight = 200, modeId = 'classic' }: ChainRowsProps) {
  const cfg = MODE_CONFIGS[modeId];
  return (
    <div className="chain-scroll" style={{ maxHeight }}>
      {chain.slice().reverse().map((entry, i) => {
        const idx   = chain.length - 1 - i;
        const prev  = idx > 0 ? chain[idx - 1].word : null;
        const diffs = prev ? diffPos(prev, entry.word) : [];
        return (
          <div key={idx} className="chain-row">
            {entry.word.split('').map((l, j) => (
              <div key={j} className={`chain-tile${diffs.includes(j) ? ' changed' : ''}`}>{l}</div>
            ))}
            {entry.pts != null && (
              <span className="chain-pts">+{entry.pts} · {prev && diffs.length === 1 && cfg.posLabels[diffs[0]]} letter</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
