import { SVG_URLS, type MascotName } from '../data/svgData';
import { useIsDark } from '../game/appContext';
import type { ModeId } from '../lib/modes';

interface MascotIconProps {
  size?: number;
  modeId?: ModeId;
  className?: string;
}

// Per-mode mascot URL for the small icon (header / demo). Explicit
// literal returns so TypeScript verifies every branch against MascotName
// — no `as` casts needed at the SVG_URLS lookup.
function iconPath(modeId: ModeId, isDark: boolean): MascotName {
  if (modeId === 'soyboy') return isDark ? 'bean-open-dark.svg' : 'bean-open.svg';
  if (modeId === 'thisthat') return 'pig-tt-open.svg';
  return isDark ? 'pig-open-dark.svg' : 'pig-open.svg';
}

export function MascotIcon({ size = 48, modeId = 'classic', className = '' }: MascotIconProps) {
  const isDark = useIsDark();
  const src = iconPath(modeId, isDark);
  return <img src={SVG_URLS[src]} width={size} height={size} alt="" className={className} style={{ display: 'block' }} />;
}
