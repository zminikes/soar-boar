// BFS shortest path from `start` to `target` (for the hint wiggle in
// PlayScreen ladder mode). Caps at depth 8 to bound work.

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
