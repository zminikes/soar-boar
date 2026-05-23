import { useCallback, useEffect, useRef } from 'react';
import { isTouchDevice } from '../platform/dom';

const KB_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
];

interface KeyboardProps {
  // Receives KeyboardEvent.key-shaped strings: 'Enter', 'Backspace',
  // or a single letter (A-Z, already uppercase).
  onKey: (key: string) => void;
  visible?: boolean;
}

const BACKSPACE_HOLD_DELAY = 350;
const BACKSPACE_REPEAT_INTERVAL = 70;

export function Keyboard({ onKey, visible = true }: KeyboardProps) {
  // Long-press backspace to repeat-delete. After the initial 350ms hold
  // we fire every 70ms until release — matches the iOS keyboard cadence.
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startBackspaceRepeat = useCallback(() => {
    holdTimerRef.current = setTimeout(() => {
      repeatIntervalRef.current = setInterval(() => onKey('Backspace'), BACKSPACE_REPEAT_INTERVAL);
    }, BACKSPACE_HOLD_DELAY);
  }, [onKey]);
  const stopBackspaceRepeat = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
  }, []);
  // Cleanup on unmount — keyboard hides when the player dead-ends or
  // navigates home mid-repeat; we don't want the interval running after.
  useEffect(() => stopBackspaceRepeat, [stopBackspaceRepeat]);

  if (!isTouchDevice || !visible) return null;
  const dispatch = (k: string): void => {
    if (k === 'ENTER') onKey('Enter');
    else if (k === '⌫') onKey('Backspace');
    else onKey(k);
  };
  const classFor = (k: string): string => {
    if (k === 'ENTER') return 'kb-key wide';
    if (k === '⌫') return 'kb-key wide backspace';
    return 'kb-key';
  };
  return (
    <div className="kb" role="group" aria-label="On-screen keyboard">
      {KB_ROWS.map((row, ri) => (
        <div key={ri} className="kb-row">
          {row.map((k) => {
            const isBackspace = k === '⌫';
            return (
              <button
                key={k}
                type="button"
                className={classFor(k)}
                onPointerDown={(e) => {
                  e.preventDefault();
                  dispatch(k);
                  if (isBackspace) startBackspaceRepeat();
                }}
                onPointerUp={isBackspace ? stopBackspaceRepeat : undefined}
                onPointerCancel={isBackspace ? stopBackspaceRepeat : undefined}
                onPointerLeave={isBackspace ? stopBackspaceRepeat : undefined}
                aria-label={k === '⌫' ? 'Backspace' : k === 'ENTER' ? 'Enter' : k}
              >
                {k}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
