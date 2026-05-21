import { MODES, type ModeId } from './modes';
import { POS_EMOJI, SHARE_URL } from './constants';
import type { ThisThatPair } from '../data/pairs';

export function diffPos(a: string, b: string): number[] {
  const d: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d.push(i);
  return d;
}

export function getStarterPool(modeId: ModeId = 'classic'): string[] {
  const cfg = MODES[modeId];
  const words = cfg.getWords();
  return cfg
    .getStarters()
    .map((w) => w.toUpperCase())
    .filter((w) => words.has(w));
}

export function pickStarter(modeId: ModeId, seed?: number): string {
  const cfg = MODES[modeId];
  const pool = getStarterPool(modeId);
  if (!pool.length) return cfg.tutorialStart;
  const s = typeof seed === 'number' ? seed : Math.random();
  return pool[Math.floor(s * pool.length) % pool.length];
}

export function pickLadderPair(modeId: ModeId, seed?: number): ThisThatPair {
  const cfg = MODES[modeId];
  const pairs = cfg.getPairs ? cfg.getPairs() : [];
  if (!pairs.length) {
    return {
      start: cfg.tutorialStart,
      end: cfg.tutorialTarget,
      par: cfg.tutorialWords.length - 1,
      path: cfg.tutorialWords,
    };
  }
  const s = typeof seed === 'number' ? seed : Math.random();
  return pairs[Math.floor(s * pairs.length) % pairs.length];
}

// BFS shortest path from `start` to `target` (for hint wiggle).
export function bfsPath(
  start: string,
  target: string,
  words: ReadonlySet<string>,
): string[] | null {
  if (start === target) return [start];
  const queue: string[][] = [[start]];
  const seen = new Set<string>([start]);
  while (queue.length) {
    const path = queue.shift()!;
    const w = path[path.length - 1];
    for (let i = 0; i < w.length; i++) {
      for (let c = 0; c < 26; c++) {
        const letter = String.fromCharCode(65 + c);
        if (letter === w[i]) continue;
        const cand = w.slice(0, i) + letter + w.slice(i + 1);
        if (!words.has(cand) || seen.has(cand)) continue;
        const next = [...path, cand];
        if (cand === target) return next;
        seen.add(cand);
        queue.push(next);
      }
    }
    if (path.length > 8) return null; // safety cap
  }
  return null;
}

export function getValidMoves(
  word: string,
  used: Set<string>,
  streakPos: number | null,
  streakCount: number,
  streakRule: boolean,
  words: ReadonlySet<string>,
): string[] {
  const moves: string[] = [];
  for (let i = 0; i < word.length; i++) {
    if (streakRule && streakPos === i && streakCount >= 2) continue;
    for (let c = 0; c < 26; c++) {
      const letter = String.fromCharCode(65 + c);
      if (letter === word[i]) continue;
      const cand = word.slice(0, i) + letter + word.slice(i + 1);
      if (words.has(cand) && !used.has(cand)) moves.push(cand);
    }
  }
  return moves;
}

export interface ChainEntry {
  word: string;
  pos?: number | null;
}

export function generateShareText(
  chain: ChainEntry[],
  score: number,
  modeId: ModeId = 'classic',
): string {
  const cfg = MODES[modeId];
  const neutral = '⬜';
  const rows = [neutral.repeat(cfg.wordLen)];
  for (let i = 1; i < chain.length; i++) {
    const diffs = diffPos(chain[i - 1].word, chain[i].word);
    const pos = diffs[0];
    const row = Array.from({ length: cfg.wordLen }, (_, j) =>
      j === pos ? POS_EMOJI[pos] : neutral,
    ).join('');
    rows.push(row);
  }
  return [
    `${modeId === 'soyboy' ? '🫛' : '🐷'} ${cfg.name}`,
    `⏱ ${cfg.duration} sec · ${score} pts · ${chain.length - 1} word${chain.length !== 2 ? 's' : ''}`,
    '',
    ...rows,
    '',
    `▶ Beat my score → ${SHARE_URL}`,
  ].join('\n');
}
