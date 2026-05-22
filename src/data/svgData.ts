import pigOpenUrl from '../assets/pig-open.svg';
import pigClosedUrl from '../assets/pig-closed.svg';
import pigOpenDarkUrl from '../assets/pig-open-dark.svg';
import pigClosedDarkUrl from '../assets/pig-closed-dark.svg';
import beanOpenUrl from '../assets/bean-open.svg';
import beanClosedUrl from '../assets/bean-closed.svg';
import beanOpenDarkUrl from '../assets/bean-open-dark.svg';
import beanClosedDarkUrl from '../assets/bean-closed-dark.svg';
import bigPig1Url from '../assets/big-pig-1.svg';
import pigTtOpenUrl from '../assets/pig-tt-open.svg';
import pigTtClosedUrl from '../assets/pig-tt-closed.svg';
import hair1Url from '../assets/hair-1.svg';
import hair2Url from '../assets/hair-2.svg';
import hair3Url from '../assets/hair-3.svg';
import hair4Url from '../assets/hair-4.svg';
import hair5Url from '../assets/hair-5.svg';
import hair6Url from '../assets/hair-6.svg';
import hair7Url from '../assets/hair-7.svg';
import hair8Url from '../assets/hair-8.svg';

import pigOpenRaw from '../assets/pig-open.svg?raw';
import pigClosedRaw from '../assets/pig-closed.svg?raw';
import pigOpenDarkRaw from '../assets/pig-open-dark.svg?raw';
import pigClosedDarkRaw from '../assets/pig-closed-dark.svg?raw';
import beanOpenRaw from '../assets/bean-open.svg?raw';
import beanClosedRaw from '../assets/bean-closed.svg?raw';
import beanOpenDarkRaw from '../assets/bean-open-dark.svg?raw';
import beanClosedDarkRaw from '../assets/bean-closed-dark.svg?raw';
import pigTtOpenRaw from '../assets/pig-tt-open.svg?raw';
import pigTtClosedRaw from '../assets/pig-tt-closed.svg?raw';
import hair1Raw from '../assets/hair-1.svg?raw';
import hair2Raw from '../assets/hair-2.svg?raw';
import hair3Raw from '../assets/hair-3.svg?raw';
import hair4Raw from '../assets/hair-4.svg?raw';
import hair5Raw from '../assets/hair-5.svg?raw';
import hair6Raw from '../assets/hair-6.svg?raw';
import hair7Raw from '../assets/hair-7.svg?raw';
import hair8Raw from '../assets/hair-8.svg?raw';

// big-pig-1.svg ships as an asset URL only (no `?raw` import). FlyingPig
// fetches the raw text at runtime — keeps the 80 KB out of the JS bundle.
// Browser HTTP cache handles re-mounts. See FlyingPig.tsx.

export type MascotName =
  | 'pig-open.svg'
  | 'pig-closed.svg'
  | 'pig-open-dark.svg'
  | 'pig-closed-dark.svg'
  | 'bean-open.svg'
  | 'bean-closed.svg'
  | 'bean-open-dark.svg'
  | 'bean-closed-dark.svg'
  | 'big-pig-1.svg'
  | 'pig-tt-open.svg'
  | 'pig-tt-closed.svg'
  | 'hair-1.svg'
  | 'hair-2.svg'
  | 'hair-3.svg'
  | 'hair-4.svg'
  | 'hair-5.svg'
  | 'hair-6.svg'
  | 'hair-7.svg'
  | 'hair-8.svg';

// Subset of MascotName that has an inline raw-string available in
// SVG_DATA. big-pig-1.svg is excluded — FlyingPig fetches it at runtime
// to keep ~80 KB out of the JS bundle. TypeScript catches any consumer
// that tries to look it up via SVG_DATA[name].
export type InlinedMascotName = Exclude<MascotName, 'big-pig-1.svg'>;

// Vite-resolved URLs (content-hashed) for <img src=...> consumption.
export const SVG_URLS: Readonly<Record<MascotName, string>> = {
  'pig-open.svg': pigOpenUrl,
  'pig-closed.svg': pigClosedUrl,
  'pig-open-dark.svg': pigOpenDarkUrl,
  'pig-closed-dark.svg': pigClosedDarkUrl,
  'bean-open.svg': beanOpenUrl,
  'bean-closed.svg': beanClosedUrl,
  'bean-open-dark.svg': beanOpenDarkUrl,
  'bean-closed-dark.svg': beanClosedDarkUrl,
  'big-pig-1.svg': bigPig1Url,
  'pig-tt-open.svg': pigTtOpenUrl,
  'pig-tt-closed.svg': pigTtClosedUrl,
  'hair-1.svg': hair1Url,
  'hair-2.svg': hair2Url,
  'hair-3.svg': hair3Url,
  'hair-4.svg': hair4Url,
  'hair-5.svg': hair5Url,
  'hair-6.svg': hair6Url,
  'hair-7.svg': hair7Url,
  'hair-8.svg': hair8Url,
};

// Raw SVG strings for in-place recoloring (useColoredSvg) and direct
// dangerouslySetInnerHTML render (AnimatedMascot body). Excludes
// big-pig-1.svg which FlyingPig fetches at runtime.
export const SVG_DATA: Readonly<Record<InlinedMascotName, string>> = {
  'pig-open.svg': pigOpenRaw,
  'pig-closed.svg': pigClosedRaw,
  'pig-open-dark.svg': pigOpenDarkRaw,
  'pig-closed-dark.svg': pigClosedDarkRaw,
  'bean-open.svg': beanOpenRaw,
  'bean-closed.svg': beanClosedRaw,
  'bean-open-dark.svg': beanOpenDarkRaw,
  'bean-closed-dark.svg': beanClosedDarkRaw,
  'pig-tt-open.svg': pigTtOpenRaw,
  'pig-tt-closed.svg': pigTtClosedRaw,
  'hair-1.svg': hair1Raw,
  'hair-2.svg': hair2Raw,
  'hair-3.svg': hair3Raw,
  'hair-4.svg': hair4Raw,
  'hair-5.svg': hair5Raw,
  'hair-6.svg': hair6Raw,
  'hair-7.svg': hair7Raw,
  'hair-8.svg': hair8Raw,
};
