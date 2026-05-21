// Pure move-related primitives. Takes wordlists as parameters; no
// data imports. Used by both the active game loop (PlayScreen) and
// the tutorial flow (OnboardingScreen).

export function diffPos(a: string, b: string): number[] {
  const d: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d.push(i);
  return d;
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
