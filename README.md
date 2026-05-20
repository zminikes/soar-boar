# Soar Boar

A 60-second word-chaining game. Change exactly one letter per turn to make a new word — score more by changing harder positions.

## Modes

- **Soar Boar** — 4-letter words, 60 seconds
- **Soy Boy** — 3-letter words, 45 seconds

## Running locally

Open `game/index.html` in a browser. No build step needed — it's a single-file React app using Babel standalone.

Or serve it with any static file server:

```bash
cd game
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Project structure

```
game/           The playable app (deploy this directory)
  index.html    Game + all UI in one file (React 18 + Babel standalone)
  wordlist.js   4-letter word dictionary
  wordlist3.js  3-letter word dictionary
  starters.js   Curated 4-letter starting words
  starters3.js  Curated 3-letter starting words
  *.svg         Mascot illustrations (pig + bean, light + dark variants)

design/         Visual direction explorations
scripts/        Utility scripts (word list analysis)
```

## Deployment

The `game/` directory is self-contained and can be deployed to any static host (GitHub Pages, Netlify, Vercel, etc.).
