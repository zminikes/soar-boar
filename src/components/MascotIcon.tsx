import { SVG_URLS } from '../data/svgData';
import { useIsDark } from '../game/appContext';
import type { ModeId } from '../lib/modes';

interface MascotIconProps {
  size?: number;
  modeId?: ModeId;
  className?: string;
}

export function MascotIcon({ size = 48, modeId = 'classic', className = '' }: MascotIconProps) {
  const isDark = useIsDark();
  const dm = isDark ? '-dark' : '';
  const src =
    modeId === 'soyboy' ? `bean-open${dm}.svg` :
    modeId === 'thisthat' ? `pig-tt-open.svg` :
    `pig-open${dm}.svg`;
  return <img src={SVG_URLS[src as keyof typeof SVG_URLS]} width={size} height={size} alt="" className={className} style={{ display: 'block' }} />;
}
