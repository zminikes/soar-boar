import pigOpen from '../assets/pig-open.svg?raw';
import pigClosed from '../assets/pig-closed.svg?raw';
import pigOpenDark from '../assets/pig-open-dark.svg?raw';
import pigClosedDark from '../assets/pig-closed-dark.svg?raw';
import beanOpen from '../assets/bean-open.svg?raw';
import beanClosed from '../assets/bean-closed.svg?raw';
import beanOpenDark from '../assets/bean-open-dark.svg?raw';
import beanClosedDark from '../assets/bean-closed-dark.svg?raw';
import bigSoarBoar from '../assets/big-soar-boar.svg?raw';
import bigPig1 from '../assets/big-pig-1.svg?raw';
import bigPig2 from '../assets/big-pig-2.svg?raw';
import pigTtOpen from '../assets/pig-tt-open.svg?raw';
import pigTtClosed from '../assets/pig-tt-closed.svg?raw';
import hair1 from '../assets/hair-1.svg?raw';
import hair2 from '../assets/hair-2.svg?raw';
import hair3 from '../assets/hair-3.svg?raw';
import hair4 from '../assets/hair-4.svg?raw';
import hair5 from '../assets/hair-5.svg?raw';
import hair6 from '../assets/hair-6.svg?raw';
import hair7 from '../assets/hair-7.svg?raw';
import hair8 from '../assets/hair-8.svg?raw';

export type MascotName =
  | 'pig-open.svg'
  | 'pig-closed.svg'
  | 'pig-open-dark.svg'
  | 'pig-closed-dark.svg'
  | 'bean-open.svg'
  | 'bean-closed.svg'
  | 'bean-open-dark.svg'
  | 'bean-closed-dark.svg'
  | 'big-soar-boar.svg'
  | 'big-pig-1.svg'
  | 'big-pig-2.svg'
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

export const SVG_DATA: Readonly<Record<MascotName, string>> = {
  'pig-open.svg': pigOpen,
  'pig-closed.svg': pigClosed,
  'pig-open-dark.svg': pigOpenDark,
  'pig-closed-dark.svg': pigClosedDark,
  'bean-open.svg': beanOpen,
  'bean-closed.svg': beanClosed,
  'bean-open-dark.svg': beanOpenDark,
  'bean-closed-dark.svg': beanClosedDark,
  'big-soar-boar.svg': bigSoarBoar,
  'big-pig-1.svg': bigPig1,
  'big-pig-2.svg': bigPig2,
  'pig-tt-open.svg': pigTtOpen,
  'pig-tt-closed.svg': pigTtClosed,
  'hair-1.svg': hair1,
  'hair-2.svg': hair2,
  'hair-3.svg': hair3,
  'hair-4.svg': hair4,
  'hair-5.svg': hair5,
  'hair-6.svg': hair6,
  'hair-7.svg': hair7,
  'hair-8.svg': hair8,
};
