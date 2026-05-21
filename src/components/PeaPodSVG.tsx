interface PeaPodSVGProps {
  size?: number;
}

export function PeaPodSVG({ size = 180 }: PeaPodSVGProps) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 240 168" fill="none">
      {/* Pod body — fat curved banana shape */}
      <path d="M 44 100 Q 40 56 88 38 Q 148 18 190 52 Q 210 68 202 90 Q 196 108 172 114 Q 120 130 72 118 Q 46 112 44 100 Z"
        fill="#8DC87A" stroke="#1A1514" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Pod highlight ridge along top */}
      <path d="M 60 80 Q 100 58 156 62 Q 184 66 196 80"
        fill="none" stroke="#A8D896" strokeWidth="4" strokeLinecap="round" opacity="0.7"/>
      {/* Pea 1 */}
      <circle cx="90" cy="82" r="18" fill="#5BA548" stroke="#1A1514" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="85" cy="77" r="5" fill="#7DD06A" opacity="0.55"/>
      {/* Pea 2 */}
      <circle cx="132" cy="76" r="18" fill="#5BA548" stroke="#1A1514" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="127" cy="71" r="5" fill="#7DD06A" opacity="0.55"/>
      {/* Pea 3 */}
      <circle cx="170" cy="82" r="16" fill="#5BA548" stroke="#1A1514" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="165" cy="77" r="4.5" fill="#7DD06A" opacity="0.55"/>
      {/* Stem */}
      <path d="M 50 98 Q 42 90 38 76 Q 36 64 44 58"
        fill="none" stroke="#1A1514" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Leaf */}
      <path d="M 44 72 Q 22 58 24 36 Q 46 42 48 66"
        fill="#8DC87A" stroke="#1A1514" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Leaf vein */}
      <path d="M 44 72 Q 34 54 26 40"
        fill="none" stroke="#5BA548" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
      {/* Curly vine tip */}
      <path d="M 44 58 Q 50 44 62 46 Q 70 48 66 56 Q 62 62 56 58 Q 54 54 58 52"
        fill="none" stroke="#1A1514" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
