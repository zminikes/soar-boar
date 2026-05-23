import type { ModeId } from '../lib/modes';
import { diffPos } from '../lib/moves';
import type { ChainEntry } from '../lib/types';

interface ChainRowsProps {
  // readonly: the component only calls chain.slice().reverse() which copies
  // before iterating, so we never mutate. Documents the contract.
  chain: readonly ChainEntry[];
  maxHeight?: number;
  // modeId is currently unused (main simplified the chain-pts label to
  // just '+N pts' — no per-position label) but kept on the prop type
  // so callers don't have to change. Drop on the next breaking pass.
  modeId?: ModeId;
}

export function ChainRows({ chain, maxHeight = 200 }: ChainRowsProps) {
  return (
    <div className="chain-scroll" style={{ maxHeight }}>
      {chain
        .slice()
        .reverse()
        .map((entry, i) => {
          const idx = chain.length - 1 - i;
          const prev = idx > 0 ? chain[idx - 1].word : null;
          const diffs = prev ? diffPos(prev, entry.word) : [];
          return (
            <div key={idx} className="chain-row">
              {entry.word.split('').map((l, j) => {
                const changed = diffs.includes(j);
                return (
                  <div
                    key={j}
                    className={`chain-tile${changed ? ' changed' : ''}`}
                    data-changed={changed ? 'true' : undefined}
                  >
                    {l}
                  </div>
                );
              })}
              {entry.pts != null && <span className="chain-pts">+{entry.pts}</span>}
            </div>
          );
        })}
    </div>
  );
}
