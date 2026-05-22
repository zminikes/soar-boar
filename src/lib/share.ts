// Builds the share-text payload for a completed game. Pure: all config
// + chain + URL are passed in by the caller.

import type { ChainEntry } from './types';
import type { ModeConfig } from './modes';
import { diffPos } from './moves';

// Per-position emoji used to colour the share grid. Indices match the
// 1st/2nd/3rd/4th letter positions in posPts. Only consumed here.
const POS_EMOJI = ['🟧', '🟪', '🟦', '🟩'];

export function generateShareText(
  chain: readonly ChainEntry[],
  score: number,
  mode: ModeConfig,
  shareUrl: string,
): string {
  const neutral = '⬜';
  const rows = [neutral.repeat(mode.wordLen)];
  for (let i = 1; i < chain.length; i++) {
    const diffs = diffPos(chain[i - 1].word, chain[i].word);
    const pos = diffs[0];
    const row = Array.from({ length: mode.wordLen }, (_, j) =>
      j === pos ? POS_EMOJI[pos] : neutral,
    ).join('');
    rows.push(row);
  }
  return [
    `${mode.shareEmoji} ${mode.name}`,
    `⏱ ${mode.duration} sec · ${score} pts · ${chain.length - 1} word${chain.length !== 2 ? 's' : ''}`,
    '',
    ...rows,
    '',
    `▶ Beat my score → ${shareUrl}`,
  ].join('\n');
}
