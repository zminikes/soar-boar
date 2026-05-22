import { useEffect, useState } from 'react';
import { ColoredBgContext, ColorOverrideContext, ThemeContext, type ColorOverrides } from './game/appContext';
import type { ModeId } from './lib/modes';
import type { DebugState, EndResult } from './lib/types';
import { StartScreen } from './components/StartScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { PlayScreen } from './components/PlayScreen';
import { EndScreen } from './components/EndScreen';
import { FloatingColorPicker } from './components/FloatingColorPicker';
import { DebugBadge } from './components/DebugBadge';
import { BoilDefs } from './components/BoilDefs';

type Screen = 'start' | 'tutorial' | 'playing' | 'end';

export function App() {
  const [screen,  setScreen]  = useState<Screen>('start');
  const [result,  setResult]  = useState<EndResult | null>(null);
  const [playKey, setPlayKey] = useState(0);
  const [puzzleSeed, setPuzzleSeed] = useState<number>(() => Math.random());
  // Restart the *same* puzzle (keep seed, just remount PlayScreen)
  const restartSame = (): void => { setPlayKey(k => k + 1); setScreen('playing'); };
  // Fresh puzzle (new seed → different starter/pair)
  const newPuzzle   = (): void => { setPuzzleSeed(Math.random()); setPlayKey(k => k + 1); setScreen('playing'); };
  // Default entry point from landing/tutorial = fresh puzzle
  const restart = newPuzzle;
  const [debug, setDebug] = useState<DebugState>(() => ({
    streakRule:  true,
    foreverMode: false,
    darkMode:    localStorage.getItem('darkMode') === 'true',
  }));
  const [modeId, setModeId] = useState<ModeId>('classic');

  /* Debug mode — gates the design-experiments panel and the floating
     color picker. Toggle on/off via:
     - URL parameter:  ?debug=1  /  ?debug=0
     - Keyboard:       Cmd/Ctrl + Shift + D
     Persists in localStorage so once enabled it stays enabled. */
  const [debugMode, setDebugMode] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('debug')) {
        const val = params.get('debug') === '1';
        localStorage.setItem('debugMode', String(val));
        return val;
      }
    } catch { /* URL parsing failed */ }
    return localStorage.getItem('debugMode') === 'true';
  });
  useEffect(() => {
    localStorage.setItem('debugMode', String(debugMode));
  }, [debugMode]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setDebugMode(d => !d);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Color picker overrides — live tweak bg + accent per mode, write to a
  // dynamic <style> tag so changes apply without reload.
  const [colorOverrides, setColorOverrides] = useState<ColorOverrides>(() => {
    // One-time migration: prior versions baked picked values into
    // localStorage. Clear once so the new brand defaults can take effect.
    if (localStorage.getItem('appVersion') !== '3') {
      localStorage.removeItem('colorOverrides');
      localStorage.setItem('appVersion', '3');
      return {};
    }
    try {
      // getItem returns string | null; default to '{}' so JSON.parse never
      // sees null and the migration above already handled the "no key"
      // case for first-run users.
      const raw = localStorage.getItem('colorOverrides') ?? '{}';
      // Trusted cast: single user per browser, no adversarial input
      // path. If we ever sync overrides server-side, replace with a
      // schema validator (zod / hand-written guard).
      return (JSON.parse(raw) as ColorOverrides) || {};
    } catch { return {}; }
  });
  useEffect(() => {
    let styleEl = document.getElementById('color-overrides');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'color-overrides';
      document.head.appendChild(styleEl);
    }
    const cls = colorOverrides.classic  ?? {};
    const soy = colorOverrides.soyboy   ?? {};
    const tt  = colorOverrides.thisthat ?? {};
    styleEl.textContent = [
      cls.bg     && `:root[data-exp-colored-bg="1"][data-exp-mode="classic"]  { --cream: ${cls.bg}; }`,
      cls.accent && `:root[data-exp-colored-bg="1"][data-exp-mode="classic"]  { --deep-peach: ${cls.accent}; --accent: ${cls.accent}; }`,
      soy.bg     && `:root[data-exp-colored-bg="1"][data-exp-mode="soyboy"]   { --cream: ${soy.bg}; }`,
      soy.accent && `:root[data-exp-colored-bg="1"][data-exp-mode="soyboy"]   { --deep-sage: ${soy.accent}; --accent: ${soy.accent}; }`,
      tt.bg      && `:root[data-exp-colored-bg="1"][data-exp-mode="thisthat"] { --cream: ${tt.bg}; }`,
      tt.accent  && `:root[data-exp-colored-bg="1"][data-exp-mode="thisthat"] { --deep-blue: ${tt.accent}; --accent: ${tt.accent}; }`,
    ].filter(Boolean).join('\n');
    localStorage.setItem('colorOverrides', JSON.stringify(colorOverrides));
  }, [colorOverrides]);

  // Derived theme state — also threaded into React Context so the mascot
  // components don't have to set up their own MutationObservers on
  // documentElement[data-theme] / [data-exp-colored-bg].
  const isDark = debug.darkMode;
  const coloredBgActive = !isDark && (screen === 'start' || screen === 'tutorial');

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : '';
    localStorage.setItem('darkMode', String(isDark));
    // Keep browser chrome (status bar / address bar) in sync with app background.
    // Adjusted further below when coloredBg is on.
    const tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', isDark ? '#141413' : '#F8F1E5');
  }, [isDark]);

  // Persist experiments + apply body-level classes that drive CSS variables.
  // Colored bg is intentionally scoped to the start screen only — game/end keep cream.
  useEffect(() => {
    document.documentElement.dataset.expColoredBg = coloredBgActive ? '1' : '';
    document.documentElement.dataset.expMode = modeId;
    // Keep iOS status-bar color in sync with whatever bg is showing
    const tc = document.querySelector('meta[name="theme-color"]');
    if (tc) {
      // Dark mode always uses the neutral cream — colored bg is light-only.
      if (isDark) {
        tc.setAttribute('content', '#141413');
      } else if (coloredBgActive) {
        tc.setAttribute('content',
          modeId === 'soyboy'   ? '#B7D197' :
          modeId === 'thisthat' ? '#CCE1F2' :
          '#FAD8B8',
        );
      } else {
        tc.setAttribute('content', '#F8F1E5');
      }
    }
  }, [isDark, coloredBgActive, modeId]);

  return (
    <ThemeContext.Provider value={isDark}>
    <ColoredBgContext.Provider value={coloredBgActive}>
    <ColorOverrideContext.Provider value={colorOverrides}>
    <div className={modeId === 'soyboy' ? 'soyboy' : (modeId === 'thisthat' ? 'thisthat' : '')}>
      {screen === 'start' && (
        <StartScreen
          onStart={restart}
          onStartForever={() => {
            setDebug(d => ({ ...d, foreverMode: true }));
            restart();
          }}
          onTutorial={() => setScreen('tutorial')}
          debug={debug}
          setDebug={setDebug}
          modeId={modeId}
          setModeId={setModeId}
          debugMode={debugMode}
        />
      )}
      {screen === 'tutorial' && (
        <OnboardingScreen
          modeId={modeId}
          onDone={restart}
          onDoneForever={() => {
            setDebug(d => ({ ...d, foreverMode: true }));
            restart();
          }}
          onBack={() => setScreen('start')}
        />
      )}
      {screen === 'playing' && (
        <PlayScreen
          key={playKey}
          puzzleSeed={puzzleSeed}
          onEnd={res => { setResult(res); setScreen('end'); }}
          onHome={() => setScreen('start')}
          onRestart={restartSame}
          onNewPuzzle={newPuzzle}
          debug={debug}
          modeId={modeId}
        />
      )}
      {screen === 'end' && result && (
        <EndScreen
          score={result.score}
          chain={result.chain}
          deadEnd={result.deadEnd}
          win={result.win}
          target={result.target}
          par={result.par}
          debug={debug}
          modeId={modeId}
          onRestart={newPuzzle}
          onHome={() => setScreen('start')}
        />
      )}
      {debugMode && !debug.darkMode && (screen === 'start' || screen === 'tutorial') && (
        <FloatingColorPicker
          colorOverrides={colorOverrides}
          setColorOverrides={setColorOverrides}
          modeId={modeId}
        />
      )}
      {debugMode && (
        <DebugBadge onToggle={() => setDebugMode(false)} />
      )}
      <BoilDefs />
    </div>
    </ColorOverrideContext.Provider>
    </ColoredBgContext.Provider>
    </ThemeContext.Provider>
  );
}
