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

// Minimal KeyboardEvent shape used by tutorial / play handlers. Lets
// components dispatch synthetic events (e.g. from the on-screen Keyboard
// component) through the same code path as real `keydown` listeners.
// Derived from the DOM type so future field needs surface naturally.
export type KeyEvent = Pick<KeyboardEvent, 'key'> &
  Partial<Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'altKey'>>;

// Inline-message state used by the tutorial and play screens (the
// transient "Not a word" / "Solved!" etc. line above the input).
export type MsgKind = '' | 'error' | 'ok';
export interface Msg {
  text: string;
  type: MsgKind;
}

// Result payload PlayScreen passes to App's onEnd callback. App stores
// it as `result` state and forwards into EndScreen's props.
// `chain` is readonly because EndScreen / ChainRows / generateShareText
// all consume it read-only — mutable arrays satisfy via covariance so
// PlayScreen's builder code doesn't change.
export interface EndResult {
  score: number;
  chain: readonly ChainEntry[];
  deadEnd: boolean;
  win?: boolean;
  target?: string;
  par?: number | null;
}
