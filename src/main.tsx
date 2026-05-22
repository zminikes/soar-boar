import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Self-hosted fonts (replaces the Google Fonts <link> in index.html).
// Weights match what the old CDN URL was requesting; Outfit was loaded
// from the CDN but never referenced in any CSS so it's dropped here.
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/dm-sans/400-italic.css';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/600.css';
import '@fontsource/instrument-sans/700.css';
import '@fontsource/instrument-sans/400-italic.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';

import './styles/global.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
