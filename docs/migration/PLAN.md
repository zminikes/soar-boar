# Soar Boar Modernization — TypeScript, Tests, Tooling (RN-ready)

## Context

Soar Boar is a working timed word-ladder game. It's already React 18, but everything lives in a single 4,628-line `game/index.html` loaded with CDN React + in-browser Babel JSX, with sibling data files (`wordlist.js`, `pairs.js`, `svg-data.js`, etc.) attached via classic `<script>` tags as globals. There's no `package.json`, no bundler, no TypeScript, no tests, no linter.

You want to:

1. Add TypeScript, ESLint, Prettier, CSS Modules.
2. Add tests — pure-logic first, then React Testing Library smoke tests for key components.
3. Factor the code so a future React Native port can lift the logic + data layer cleanly (web-only now, RN later).
4. Keep `game/index.html` playable throughout. Cut over only when the new build reaches parity.

The original idea "port to TS first, write tests, then React" is reframed because it's already React — what's missing is a build pipeline. The right ordering is: **tooling → restructure as JSX in the new build → extract pure logic to TS → tests on logic → incrementally TSX the UI → cleanup**.

## Recommended approach

### Phase 0 — Tooling foundation

Set up the build/test/lint pipeline at the repo root. `game/index.html` is untouched and remains playable by opening the file directly.

- Initialize `package.json` at repo root. Pin React 18 (do not drift to 19). Commit the lockfile.
- Install:
  - **Build**: `vite`, `@vitejs/plugin-react`, `react@^18`, `react-dom@^18`
  - **TS**: `typescript`, `@types/react`, `@types/react-dom`
  - **Test**: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`
  - **Lint/format**: `eslint`, `@typescript-eslint/*`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `prettier`, `eslint-config-prettier`
- Configs:
  - `tsconfig.json` (`strict: true`, `jsx: "react-jsx"`, `moduleResolution: "bundler"`)
  - `vite.config.ts` (React plugin, Vitest config inline with `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`, `build.sourcemap: true`, `build.chunkSizeWarningLimit: 500`)
  - `eslint.config.js` (flat config; **add `no-restricted-imports` to forbid `react`/`react-dom` inside `src/lib/**`** — guards the RN-portable boundary)
  - `.prettierrc`, `.editorconfig`
- npm scripts: `dev`, `build`, `preview`, `test`, `test:watch`, `typecheck`, `lint`, `format`
- New `index.html` at repo root (Vite entry) and `src/main.tsx` rendering a placeholder.
- `src/test/setup.ts` — `@testing-library/jest-dom` imports + stubs for `navigator.share` and `navigator.clipboard.writeText` (used by share flow).
- **Add CI**: `.github/workflows/ci.yml` running `typecheck`, `lint`, `test`, `build` on PR. Cheap insurance for the refactor.
- **Decide `tokens/` fate now.** The existing `tokens/tokens.css` has drifted from the game's actual palette (Inter vs DM Sans, different colors). Either delete or port the game's real values into it. Don't carry the drift forward.

**Verify**: `npm run dev` shows placeholder; `npm test` passes with one trivial test; `npm run build` produces a `dist/`; CI green on a draft PR.

### Phase 1 — Restructure (still JSX, no TS yet on components)

Goal: get the new Vite build running the actual game with the same UX as `game/index.html`, with file-split components — but no logic refactor. Split into two PRs for review-ability.

#### Phase 1a — Mechanical port (data, SVGs, CSS, platform helpers) **[DONE — PR #3]**

- **Data files** to `src/data/*.ts` with explicit `export const` (originals are bare `const` declarations that only work via `<script>` global scope):
  - `src/data/wordlist.ts` — `export const WORDS: ReadonlySet<string> = new Set([...])`
  - `src/data/wordlist3.ts`, `src/data/pairs.ts`, `src/data/starters.ts`, `src/data/starters3.ts`
  - `src/data/svgData.ts` — Vite `?raw` string imports, keyed by a `MascotName` literal union (21 entries) so Phase 1b's `MascotIcon` gets a closed prop type
- **SVGs** to `src/assets/` (21 mascots; `og-image.svg` excluded). `useColoredSvg` (`game/index.html:2292`) regex-substitutes `fill: <color>` on the raw string — `?raw` imports preserve that flow and remove the obsolete file:// rationale (lines 2287–2291).
- **CSS** lifted from `<style>` block into `src/styles/global.css` as-is. No per-component split (deferred to Phase 4). Keeps CSS custom properties, `[data-theme="dark"]`, prefers-reduced-motion, all animations.
- **Module-level helpers** in `src/platform/dom.ts`: `isTouchDevice` (with `typeof window` guard), `BEST_KEY`, `getBestScore`, `setBestScore`. **`SHARE_URL` is also here for now but belongs next to the share helper that consumes it — move in Phase 1b.**
- Root `index.html` updated with meta tags, OG cards, Google Fonts link. `public/og-image.png` staged for the Phase 5 deploy cutover.

**Stale-CSS caveat for Phase 1b**: `src/styles/global.css` was lifted from `game/index.html` before PR #2 merged. Two new rules (`.signup-error`, `.signup-honeypot` at `game/index.html` lines ~1154–1170) are missing — Phase 1b's `EmailSignup` port catches them up alongside the component.

#### Phase 1b — Component split

- **Components**: split the inline `<script type="text/babel">` block into `src/components/*.jsx` files (still JSX, not TSX). Roughly one file per React component (~23 components). Minimal-edit copies.
- **Ordering**: leaves first — `Toggle`, `PosLegend`, `MascotIcon`, `Confetti`, `Keyboard`, `ChainRows`, `BoilDefs`, `FlyingPig` → mid-tier `HsvPicker`, `FloatingColorPicker`, `AnimatedMascot`, `ColorOverrideContext` → screens `StartScreen`, `OnboardingScreen`, `EndScreen`, `DemoSection`, `LegacyDemoSection`, `EmailSignup`, `DebugBadge`, `ExperimentsPanel` → `PlayScreen` (~400 lines, the long pole) → `App`.
- **Shared modules to create alongside components**:
  - `src/game/constants.ts` — `TOTAL_TIME`, `HEAD_START`, `MSG_DURATION`, `POS_COLORS`, `POS_EMOJI`
  - `src/game/modes.ts` — `MODES` (full bundled form; split into pure config + data closures in Phase 1.5)
  - `src/game/helpers.ts` — pure logic functions (`diffPos`, `bfsPath`, `getValidMoves`, `pickStarter`, `pickLadderPair`, `getStarterPool`, `generateShareText`, color helpers) — moves to `src/lib/` in Phase 2
  - `src/game/svgUtils.ts` — `scopeSvgStyles`, `useColoredSvg` (React hook — stays out of `src/lib/`)
- **`SHARE_URL`** moves from `src/platform/dom.ts` to wherever `generateShareText` lands.
- **`EmailSignup` port (PR #2 changes — preserve, don't revert to pre-PR shape)**:
  - 4-state machine: `'idle' | 'submitting' | 'done' | 'error'` (not the old boolean `done`)
  - Async fetch to `APPS_SCRIPT_URL` with `Content-Type: text/plain;charset=utf-8` (avoids CORS preflight that Apps Script Web Apps don't handle)
  - Honeypot input (`website` field, offscreen)
  - Error state UI (`role="alert"`)
  - Bails loud if `APPS_SCRIPT_URL` is empty so unconfigured deploys don't silently fake success
  - Catch up the two missing CSS rules (`.signup-error`, `.signup-honeypot`) into `global.css`
  - Reference `NEWSLETTER_PLAN.md` for the Apps Script deploy steps
- **`APPS_SCRIPT_URL` placement**: read via `import.meta.env.VITE_APPS_SCRIPT_URL` (with empty-string default) in a new `src/game/config.ts`. Lets Vercel build inject the URL via env without touching code, and keeps the "empty string → throw" guard from PR #2 intact. **Not** in `platform/dom.ts` — it's deploy config, not a DOM helper.
- Update `src/main.tsx` to mount the real `App`; replace the Phase 1a sanity-check `App.tsx`.

**Verify**: full game playable at `npm run dev`, including all three modes, dark mode toggle, hints toggle, color picker, share flow, end screen, EmailSignup (with `VITE_APPS_SCRIPT_URL` set). Side-by-side with `game/index.html` to confirm parity.

### Phase 1.5 — Split `MODES` config

`MODES` (in `game/index.html` around line 2257) bundles pure config (durations, word lengths, position points, labels) with data-binding closures (`getWords: () => WORDS`). Split before extracting logic so PlayScreen's later TSX conversion doesn't have to land at the same time:

- `src/lib/modes.ts` — pure mode config (no data references)
- `src/data/modeData.ts` — `getWords`, `getStarters`, `getPairs` lookups bound to data imports
- Components update import paths.

**Verify**: game plays unchanged.

### Phase 2 — Extract pure logic to TypeScript

Create `src/lib/` with **zero React/DOM imports** (enforced by the ESLint rule from Phase 0). This is the layer that ports straight to React Native later.

Files (functions already DI-clean — they all take `words` as a `Set<string>` parameter):

- `src/lib/types.ts` — `Mode`, `ModeId`, `ChainEntry`, `Move`, `StreakRule`, etc.
- `src/lib/moves.ts` — `diffPos`, `getValidMoves` (logic lives at `game/index.html` near the helper block at ~2370)
- `src/lib/bfs.ts` — `bfsPath`
- `src/lib/puzzle.ts` — `pickStarter`, `pickLadderPair` (**already accept optional `seed` parameter** — see `game/index.html:2390, 2398` — no RNG refactor needed; tests pass a fixed seed in `[0, 1)`)
- `src/lib/scoring.ts` — position weights, score calc
- `src/lib/share.ts` — `generateShareText` (decouples from `MODES` via the Phase 1.5 split)
- `src/lib/modes.ts` (from Phase 1.5)

JSX components are refactored to import from `src/lib/` instead of having logic inline. Components stay `.jsx`.

`Math.random()` calls that are presentational (confetti angles ~4293, mascot blinking ~2903, initial puzzle seed ~4441) stay in components — not in `src/lib/`.

**Verify**: game plays unchanged; `npm run typecheck` clean for `src/lib/`; ESLint flags any accidental `react` import in `src/lib/`.

### Phase 3 — Tests for pure logic

Vitest specs in `src/lib/__tests__/`:

- **moves.test.ts** — valid moves under each `streakRule` (Soar Boar vs Soy Boy vs This That); position-changed validation; rejects non-words; rejects reused words.
- **bfs.test.ts** — finds known paths; returns `null` for unreachable; respects word set boundary.
- **puzzle.test.ts** — seeded determinism (same seed → same starter / pair across runs); covers `pickStarter` and `pickLadderPair`.
- **scoring.test.ts** — position weights produce expected totals across chain lengths.
- **share.test.ts** — formatted output matches snapshot for representative chains across all modes.

Use the real wordlists from `src/data/` in tests (they're already in-process; no fixtures needed).

**Verify**: `npm test` shows the logic suite passing; `npm run typecheck` clean.

### Phase 4 — Components to TSX (incremental, leaf-first)

Convert `.jsx` → `.tsx` one component at a time, smallest leaves first. PlayScreen last.

Suggested order: `Tile` → `ChainRow` → `Keyboard` → `Toggle` → `ScorePill` → `AnimatedMascot` → `ColorPicker` → `StartScreen` → `EndScreen` → `PlayScreen`.

For each component:

1. Rename `.jsx` → `.tsx`, add prop types.
2. Split that component's CSS out of `src/styles/global.css` into `<Component>.module.css`. Update class refs (`className={styles.foo}`).
3. Add RTL smoke tests where the component has meaningful interaction: `Keyboard.test.tsx` (key press → callback), `ChainRow.test.tsx` (rendering states), `StartScreen.test.tsx` / `EndScreen.test.tsx` (transitions), `PlayScreen.test.tsx` (start → complete a short chain → end).

**Also in Phase 4**: introduce `ThemeContext` and `ColoredBgContext`, replacing the `MutationObserver` pattern currently scattered across ~5 components (`game/index.html:2533, 2876, 3663`). Theme changes go through `setTheme()` setting both context state and `documentElement.dataset.theme`.

**Carry over the `appVersion` localStorage migration** (around `game/index.html:4441`) — currently clears `colorOverrides` when version doesn't match. Port as-is so existing players don't lose preferences. Document all keys in use: `bestScore:${modeId}`, `hintOn`, `darkMode`, `debugMode`, `colorOverrides`, `appVersion`.

**Accessibility smoke**: enable `@testing-library/jest-dom` matchers for the smoke tests; check `aria-label` on `Toggle` and key landmarks; respect prefers-reduced-motion in any new components.

**Verify**: `npm run typecheck` clean, all tests pass, side-by-side play matches the old build (try all three modes, dark mode, hints toggle, share, color picker).

### Phase 5 — Cleanup & deploy

- **Decide `SVG_DATA` final form.** The original 357 KB inline strings exist only because `file://` blocked `fetch()`. Under Vite, `?raw` imports or `fetch('/big-pig-1.svg').then(r => r.text())` both work. Tree-shake any SVGs unused by the active mode if bundle size matters.
- **Self-host fonts** via `@fontsource/dm-sans`, `@fontsource/instrument-sans`, `@fontsource/instrument-serif`, `@fontsource/outfit`. Removes the Google Fonts `<link>` from root `index.html`; reduces CLS; works offline.
- **Perf budget**: confirm prod chunks stay under the 500 KB warning. After Phase 1a the bundle is 545 KB / 184 KB gzip, dominated by eager SVG raw-string imports — split per-component or lazy-load mascots not used by the active mode.
- **Set `VITE_APPS_SCRIPT_URL` in the production env** (Vercel project settings) before flipping DNS — EmailSignup throws on empty string, so leaving this unset silently breaks signups even though the rest of the game works. **Deploy blocker.**
- **Deploy**: swap `soarboar.com` from serving `game/` to serving `dist/`. Keep `game/` in git history for one release as a fallback.
- **Remove `game/`** once parity is confirmed in production.
- Update `README.md` with new dev/build commands and the `VITE_APPS_SCRIPT_URL` env var requirement.

**Verify**: production build deployed; one full game played end-to-end on real domain; lighthouse perf comparable to or better than current.

## Critical files

- `game/index.html` — source of truth. Key regions:
  - L2257–2473 → `MODES`, `BEST_KEY`, all pure logic candidates
  - L2287–2291 → obsolete `file://` rationale (delete in Phase 5)
  - L2292 → `useColoredSvg` (drives SVG strategy)
  - L2390, 2398 → `pickStarter`, `pickLadderPair` (already seedable)
  - L2533, 2876, 3663 → theme `MutationObserver` pattern (collapse to Context in Phase 4)
  - L3722–3797 → `EmailSignup` (PR #2): async Apps Script POST, 4-state machine, honeypot — preserve in 1b port
  - L1154–1170 → `.signup-error` + `.signup-honeypot` CSS (PR #2) — missing from `src/styles/global.css`; catch up in 1b
  - L4441–4537 → App-level state, `appVersion` migration
- `game/svg-data.js` — 357 KB inline SVGs (ported to `src/data/svgData.ts` + `src/assets/` in Phase 1a)
- `game/wordlist.js`, `wordlist3.js`, `pairs.js`, `starters.js`, `starters3.js` — data (ported to `src/data/*.ts` in Phase 1a)
- `NEWSLETTER_PLAN.md` — Apps Script Web App deploy steps for `VITE_APPS_SCRIPT_URL`; required reading before Phase 5 deploy
- `tokens/tokens.css` — drifted; decide fate in Phase 0
- `README.md` — update in Phase 5

## Existing functions to reuse (do not rewrite)

- `diffPos(a, b)` — string diff helper
- `getValidMoves(word, used, streakPos, streakCount, streakRule, words)` — already DI-clean
- `bfsPath(start, target, words)` — already DI-clean
- `pickStarter(seed?)`, `pickLadderPair(seed?)` — already seedable
- `generateShareText(...)` — needs `MODES` split (Phase 1.5) before pure extraction

## End-to-end verification

After each phase, confirm:

1. **Game runs**: `npm run dev`, play one full round in each of the three modes.
2. **Type-clean**: `npm run typecheck`.
3. **Tests green**: `npm test`.
4. **Lint green**: `npm run lint` (especially the `no-restricted-imports` rule for `src/lib/`).
5. **Build succeeds**: `npm run build`, then `npm run preview` plays correctly.
6. **Parity with `game/index.html`** until Phase 5: open both in side-by-side tabs, compare scoring, animations, share text, dark mode, color picker.
