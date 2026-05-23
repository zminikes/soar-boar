export const isTouchDevice =
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export const BEST_KEY = (modeId: string): string => `bestScore:${modeId}`;

export function getBestScore(modeId: string): number {
  const n = parseInt(localStorage.getItem(BEST_KEY(modeId)) || '0', 10);
  return Number.isFinite(n) ? n : 0;
}

export function setBestScore(modeId: string, score: number): void {
  localStorage.setItem(BEST_KEY(modeId), String(score));
}
