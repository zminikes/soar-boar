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

import type { ModeId } from '../lib/modes';

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

// Vite-resolved URLs (content-hashed) for <img src=...> consumption.
// All 18 mascot URLs stay eagerly imported here because MascotIcon (the
// small per-mode icon on the start screen) and FlyingPig (the hero on
// the end screen) consume them via URL — the browser fetches the actual
// SVG bytes only when the <img> mounts, so the initial JS cost is just
// the URL strings.
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

// Per-mode raw-SVG payload returned by loadMascotSvgs. Only `thisthat`
// carries the hair-frame array — the other modes don't animate hair.
export interface MascotSvgs {
  open: string;
  closed: string;
  openDark?: string;
  closedDark?: string;
  hair?: readonly string[];
}

// Module-level cache so AnimatedMascot can render synchronously on
// remount when the user switches back to a mode it has already loaded.
// Vite's module cache dedupes the network fetch, but without a
// synchronous getter the consumer still flashes through a null state
// for one frame while useEffect re-runs.
const mascotSvgsCache = new Map<ModeId, MascotSvgs>();

export function getMascotSvgsSync(modeId: ModeId): MascotSvgs | null {
  return mascotSvgsCache.get(modeId) ?? null;
}

// Lazy-loads the raw SVG strings AnimatedMascot needs for in-place
// recoloring + dangerouslySetInnerHTML render. Each mode's strings
// live in a separate chunk (src/data/svgSets/*.ts), so a classic-mode
// session never downloads the bean or hair SVGs. Vite emits one chunk
// per mode; the module cache + our own map dedupe re-requests.
export async function loadMascotSvgs(modeId: ModeId): Promise<MascotSvgs> {
  const cached = mascotSvgsCache.get(modeId);
  if (cached) return cached;
  const svgs = await loadModeChunk(modeId);
  mascotSvgsCache.set(modeId, svgs);
  return svgs;
}

async function loadModeChunk(modeId: ModeId): Promise<MascotSvgs> {
  if (modeId === 'soyboy') {
    const { soyboySvgs } = await import('./svgSets/soyboy');
    return soyboySvgs;
  }
  if (modeId === 'thisthat') {
    const { thisthatSvgs } = await import('./svgSets/thisthat');
    return thisthatSvgs;
  }
  const { classicSvgs } = await import('./svgSets/classic');
  return classicSvgs;
}

// Best-effort prefetch of the non-active mode chunks so a user who
// switches modes after the start screen has already mounted doesn't
// see a loading frame. Fire-and-forget — failures don't matter here.
export function prefetchOtherModeSvgs(activeModeId: ModeId): void {
  if (activeModeId !== 'classic') void loadMascotSvgs('classic');
  if (activeModeId !== 'soyboy') void loadMascotSvgs('soyboy');
  if (activeModeId !== 'thisthat') void loadMascotSvgs('thisthat');
}
