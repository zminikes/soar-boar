import { SVG_URLS } from '../data/svgData';
import { useIsDark } from '../game/appContext';

export function MascotIcon({ size = 48, modeId = 'classic', className = '' }) {
  const isDark = useIsDark();
  const dm  = isDark ? '-dark' : '';
  const src =
    modeId === 'soyboy'   ? `bean-open${dm}.svg` :
    modeId === 'thisthat' ? `pig-tt-open.svg` :
    `pig-open${dm}.svg`;
  return <img src={SVG_URLS[src]} width={size} height={size} alt="" className={className} style={{ display: 'block' }} />;
}
