import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Self-hosted fonts (replaces the Google Fonts <link> in index.html).
// Weights match what the old CDN URL was requesting; Outfit was loaded
// from the CDN but never referenced in any CSS so it's dropped here.
// Using the `latin-*` variants rather than the default combined entry
// points — the soar-boar wordlists are pure ASCII A-Z, so the
// latin-ext subsets (U+0100-02BA: Eastern European diacritics,
// Vietnamese, Welsh, etc.) would never be requested. Switching to
// latin-only drops ~140 KB of woff/woff2 from dist/ and ~12
// @font-face declarations from the parsed CSS. Add the combined
// entry point back if a future feature ships non-ASCII content.
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/dm-sans/latin-400-italic.css';
import '@fontsource/instrument-sans/latin-400.css';
import '@fontsource/instrument-sans/latin-500.css';
import '@fontsource/instrument-sans/latin-600.css';
import '@fontsource/instrument-sans/latin-700.css';
import '@fontsource/instrument-sans/latin-400-italic.css';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';

import './styles/global.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
