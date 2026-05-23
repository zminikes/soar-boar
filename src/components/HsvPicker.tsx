import { useCallback, useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from 'react';
import { hexToHsv, hsvToHex, type Hsv } from '../lib/colorMath';

interface HsvPickerProps {
  value: string;
  onChange: (hex: string) => void;
}

type DragTarget = 'pad' | 'hue' | null;

/* Inline drag-to-pick color picker. 2D SL pad on top, hue slider below,
   hex input at the bottom. Pointer events with window-level capture
   so dragging stays live even when the pointer leaves the element. */
export function HsvPicker({ value, onChange }: HsvPickerProps) {
  const safe = (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) ? value : '#000000';
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(safe));
  const [hexDraft, setHexDraft] = useState(safe.toUpperCase());
  const padRef = useRef<HTMLDivElement | null>(null);
  const hueRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragTarget>(null);
  const internalHexRef = useRef(safe.toUpperCase());

  // Latest-value refs so handlePad / handleHue can be stable useCallbacks
  // without re-attaching window listeners on every render. (Original code
  // re-attached on every render — preserved-style perf cost we're paying
  // down now that the file is being typed.)
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Sync from external value when it changes (e.g. swatch switch).
  useEffect(() => {
    if (value && value.toUpperCase() !== internalHexRef.current) {
      const next = hexToHsv(safe);
      setHsv(next);
      setHexDraft(safe.toUpperCase());
      internalHexRef.current = safe.toUpperCase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commitHsv = useCallback((next: Hsv): void => {
    setHsv(next);
    const hex = hsvToHex(next).toUpperCase();
    setHexDraft(hex);
    internalHexRef.current = hex;
    onChangeRef.current(hex);
  }, []);

  const handlePad = useCallback((clientX: number, clientY: number): void => {
    const r = padRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, (clientY - r.top) / r.height));
    commitHsv({ ...hsvRef.current, s: x * 100, v: (1 - y) * 100 });
  }, [commitHsv]);
  const handleHue = useCallback((clientX: number): void => {
    const r = hueRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    commitHsv({ ...hsvRef.current, h: x * 360 });
  }, [commitHsv]);

  useEffect(() => {
    const onMove = (e: globalThis.PointerEvent): void => {
      if (!dragRef.current) return;
      e.preventDefault();
      if (dragRef.current === 'pad') handlePad(e.clientX, e.clientY);
      if (dragRef.current === 'hue') handleHue(e.clientX);
    };
    const onUp = (): void => { dragRef.current = null; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [handlePad, handleHue]);

  const padDown = (e: PointerEvent<HTMLDivElement>): void => {
    e.preventDefault();
    dragRef.current = 'pad';
    handlePad(e.clientX, e.clientY);
  };
  const hueDown = (e: PointerEvent<HTMLDivElement>): void => {
    e.preventDefault();
    dragRef.current = 'hue';
    handleHue(e.clientX);
  };

  const onHexChange = (e: ChangeEvent<HTMLInputElement>): void => {
    let v = e.target.value;
    if (v && v[0] !== '#') v = '#' + v;
    setHexDraft(v.toUpperCase());
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      const next = hexToHsv(v);
      setHsv(next);
      internalHexRef.current = v.toUpperCase();
      onChange(v.toUpperCase());
    }
  };

  return (
    <div>
      <div
        className="hsv-pad"
        ref={padRef}
        onPointerDown={padDown}
        style={{
          background:
            'linear-gradient(to top, #000, transparent), ' +
            'linear-gradient(to right, #fff, transparent), ' +
            `hsl(${hsv.h}, 100%, 50%)`,
        }}
      >
        <div
          className="hsv-pad-marker"
          style={{
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
            background: hsvToHex(hsv),
          }}
        />
      </div>
      <div
        className="hsv-hue"
        ref={hueRef}
        onPointerDown={hueDown}
      >
        <div className="hsv-hue-marker" style={{ left: `${(hsv.h / 360) * 100}%` }} />
      </div>
      <div className="hsv-hex-row">
        <input
          type="text"
          className="hsv-hex"
          value={hexDraft}
          onChange={onHexChange}
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
        />
      </div>
    </div>
  );
}
