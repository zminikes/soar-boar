// Shared pure types used across src/lib/ and consumed by src/data/
// and components. No runtime values, no React, no DOM.

export interface ThisThatPair {
  start: string;
  end: string;
  par: number;
  path: string[];
}

export interface ChainEntry {
  word: string;
  pts?: number | null;
  pos?: number | null;
}
