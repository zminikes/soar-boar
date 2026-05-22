# Soar Boar

A timed word-chaining game. Change exactly one letter per turn to make a new word — score more by changing harder positions. Currently mid-migration from a single-file CDN React build to a Vite + TypeScript build; both are playable side by side.

## Modes

- **Soar Boar** — 4-letter words, 60 seconds
- **Soy Boy** — 3-letter words, 45 seconds
- **This That** — 4-letter word ladder; reach the target in as few moves as possible

## Running locally

The Vite dev build is the primary path going forward.

```bash
npm install
npm run dev
```

Vite serves at `http://localhost:5173` by default and hot-reloads on save.

To exercise the email-signup form locally, also set:

```bash
export VITE_APPS_SCRIPT_URL="https://script.google.com/macros/s/…/exec"
```

`EmailSignup` throws on an empty URL by design — unconfigured deploys fail loud rather than silently faking success. See [`NEWSLETTER_PLAN.md`](./NEWSLETTER_PLAN.md) for the one-time Apps Script deploy steps.

### Legacy single-file build

`game/index.html` is still the live site at the time of writing. To run it, open the file directly or serve the `game/` directory with any static server:

```bash
cd game
python3 -m http.server 8000
```

Then open `http://localhost:8000`. The legacy build will be removed in the final cut-over (Phase 5g).

## Scripts

| Command            | What it does                                  |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Vite dev server with HMR                      |
| `npm run build`    | Type-check then build to `dist/`              |
| `npm run preview`  | Preview the production build locally          |
| `npm test`         | Run the Vitest suite once                     |
| `npm run test:watch` | Vitest in watch mode                        |
| `npm run typecheck`  | TypeScript-only check (no emit)             |
| `npm run lint`     | ESLint over the repo                          |
| `npm run format`   | Prettier write                                |

CI (`.github/workflows/ci.yml`) runs `typecheck`, `lint`, `test`, and `build` on every PR.

## Project structure

```
src/
  App.tsx               Top-level screen routing (start / tutorial / playing / end)
  main.tsx              Vite entry — mounts <App/>, imports global CSS + fonts
  components/           React components (one file per component)
  lib/                  Pure logic — no React, no DOM. Portable to React Native.
                          moves.ts, bfs.ts, puzzle.ts, share.ts, modes.ts, colorMath.ts, types.ts
  data/                 Wordlists, starters, mascot SVG bundles
  game/                 React-aware glue (constants, context, svg utils, env config)
  platform/             Browser-only adapters (localStorage, share detection)
  styles/global.css     Global CSS (splits per-component in Phase 5e)
  assets/               Mascot SVGs (imported via Vite ?raw and url variants)
  test/setup.ts         RTL + jest-dom + navigator stubs

game/                   Legacy single-file build (deploys to soarboar.com today)
docs/migration/         The phased migration plan
public/                 Static assets served at site root (og-image.png, favicon)
```

The `src/lib/` boundary is enforced by ESLint's `no-restricted-imports` — anything inside `src/lib/**` may not import React or `src/data/*`, so the layer that ports to React Native stays clean.

## Deployment

Vercel builds the Vite output from the repo root. Set `VITE_APPS_SCRIPT_URL` in the project's environment variables before promoting a build — the EmailSignup throw guards against shipping with it unset.

Until the cut-over, `soarboar.com` serves `game/`. The migration's final phase swaps the served directory to `dist/` (see [`docs/migration/PLAN.md`](./docs/migration/PLAN.md)).
