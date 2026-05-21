import { useEffect, useRef, useState, type RefObject } from 'react';

// Toggles `visible` to true once the element scrolls past a threshold.
// Used by the playful demo section so each scene reveals on entrance.
export function useInView(threshold = 0.35): [RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}
