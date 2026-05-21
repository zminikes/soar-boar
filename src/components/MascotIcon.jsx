import { useEffect, useState } from 'react';
import { SVG_URLS } from '../data/svgData';

export function MascotIcon({ size = 48, modeId = 'classic', className = '' }) {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.dataset.theme === 'dark'
  );
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.dataset.theme === 'dark');
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  const dm  = isDark ? '-dark' : '';
  const src =
    modeId === 'soyboy'   ? `bean-open${dm}.svg` :
    modeId === 'thisthat' ? `pig-tt-open.svg` :
    `pig-open${dm}.svg`;
  return <img src={SVG_URLS[src]} width={size} height={size} alt="" className={className} style={{ display: 'block' }} />;
}
