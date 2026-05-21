import { WORDS } from './data/wordlist';
import { WORDS3 } from './data/wordlist3';
import { STARTER_WORDS } from './data/starters';
import { STARTER_WORDS3 } from './data/starters3';
import { THIS_THAT_PAIRS } from './data/pairs';
import { SVG_DATA } from './data/svgData';
import { isTouchDevice } from './platform/dom';

export function App() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
      <h1>Soar Boar — Phase 1a scaffold</h1>
      <p>
        Mechanical port wired up. Game components land in Phase 1b. The playable build is still in{' '}
        <code>game/index.html</code>.
      </p>
      <h2>Sanity checks</h2>
      <ul>
        <li>4-letter words: {WORDS.size.toLocaleString()}</li>
        <li>3-letter words: {WORDS3.size.toLocaleString()}</li>
        <li>4-letter starters: {STARTER_WORDS.length.toLocaleString()}</li>
        <li>3-letter starters: {STARTER_WORDS3.length.toLocaleString()}</li>
        <li>This That pairs: {THIS_THAT_PAIRS.length.toLocaleString()}</li>
        <li>SVGs loaded: {Object.keys(SVG_DATA).length}</li>
        <li>Touch device: {String(isTouchDevice)}</li>
      </ul>
      <div
        aria-label="big pig"
        style={{ width: 200, height: 200 }}
        dangerouslySetInnerHTML={{ __html: SVG_DATA['big-pig-1.svg'] }}
      />
    </main>
  );
}
