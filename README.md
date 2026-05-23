# Soar Boar

A timed word-chaining game. Change exactly one letter per turn to make a new word — score more by changing harder positions.

## Modes

- **Soar Boar** — 4-letter words, 60 seconds
- **Soy Boy** — 3-letter words, 45 seconds
- **This That** — 4-letter word ladder (untimed; reach the target word)

## Running locally

```bash
npm install
npm run dev
```

Opens the Vite dev server (default `http://localhost:5173`). The legacy single-file build still lives at `game/index.html` and remains playable directly in a browser — it's retained as a fallback until the new build ships to production.

## Scripts

| Command             | What it does                                |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Vite dev server with HMR                    |
| `npm run build`     | Typecheck + production build into `dist/`   |
| `npm run preview`   | Serve the production build locally          |
| `npm test`          | Run the Vitest suite once                   |
| `npm run test:watch`| Run Vitest in watch mode                    |
| `npm run typecheck` | `tsc -b --noEmit`                           |
| `npm run lint`      | ESLint over the repo                        |
| `npm run format`    | Prettier write across the repo              |

CI runs typecheck, lint, test, and build on every pull request — see `.github/workflows/ci.yml`.

## Environment

Copy `.env.example` to `.env.local` and fill in any values you want for local development:

```bash
cp .env.example .env.local
```

- `VITE_APPS_SCRIPT_URL` — Apps Script Web App that appends newsletter signups to a Google Sheet. Empty value is fine for local dev (the signup form surfaces an explicit error state). **Required in production** — an unconfigured deploy fails every signup attempt; the form shows its error UI but nothing surfaces server-side, so the breakage is invisible without active testing. See `.claude/plans/NEWSLETTER_PLAN.md` for the one-time deploy steps.

## Project structure

```
src/
  components/   React components (TSX)
  data/         Word lists, mode data, SVG raw imports
  game/         App-level config, constants, context, hooks
  lib/          Pure logic — no React, no DOM (RN-portable)
  platform/    Web-only helpers (DOM, localStorage)
  styles/      Global CSS
  assets/      SVG mascots

game/           Legacy single-file React build (kept as fallback;
                removed after production cutover)
docs/migration/ Modernization plan + phase notes
scripts/        Utility scripts (word list analysis)
```

The `src/lib/` boundary is enforced by ESLint (`no-restricted-imports` forbids `react` / `react-dom`) so the pure-logic layer stays portable for a future React Native port.

## Deployment

Production serves the Vite build from `dist/`. Set `VITE_APPS_SCRIPT_URL` in the host environment (Vercel project settings, etc.) before deploying.
