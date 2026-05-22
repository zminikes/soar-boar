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
}

// User-facing toggles owned by App and threaded through to StartScreen,
// PlayScreen, EndScreen, ExperimentsPanel. Persisted via localStorage.
export interface DebugState {
  streakRule: boolean;
  foreverMode: boolean;
  darkMode: boolean;
}
