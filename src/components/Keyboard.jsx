import { isTouchDevice } from '../platform/dom';

const KB_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

export function Keyboard({ onKey, visible = true }) {
  if (!isTouchDevice || !visible) return null;
  const dispatch = (k) => {
    if (k === 'ENTER')      onKey('Enter');
    else if (k === '⌫')      onKey('Backspace');
    else                     onKey(k);
  };
  return (
    <div className="kb" role="group" aria-label="On-screen keyboard">
      {KB_ROWS.map((row, ri) => (
        <div key={ri} className="kb-row">
          {row.map(k => (
            <button
              key={k}
              type="button"
              className={`kb-key${k === 'ENTER' || k === '⌫' ? ' wide' : ''}`}
              onPointerDown={e => { e.preventDefault(); dispatch(k); }}
              aria-label={k === '⌫' ? 'Backspace' : k === 'ENTER' ? 'Enter' : k}
            >{k}</button>
          ))}
        </div>
      ))}
    </div>
  );
}
