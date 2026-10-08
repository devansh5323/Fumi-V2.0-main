# FUMI

FUMI is a collection of short cognitive mini-games for kids, built with
Next.js (App Router), React, and TypeScript. Each game is a self-contained,
screen-based experience presented inside a phone-frame device mockup.

## Games

| # | Game | Folder | What it trains |
|---|------|--------|-----------------|
| 1 | Pathfinder Sweep | [`app/games/pathfinder-sweep/`](app/games/pathfinder-sweep/README.md) | Selective attention, visual scanning |
| 2 | Signal Watch | [`app/games/signal-watch/`](app/games/signal-watch/README.md) | Sustained attention, signal detection |
| 3 | Twin Current | [`app/games/twin-current/`](app/games/twin-current/README.md) | Divided attention, dynamic visual attention, task switching |

## Tech stack

- **Next.js 16** (App Router), **React 19**, **TypeScript** (strict)
- Inline styles only — no CSS modules, no Tailwind, no styled-components
- `pnpm` as the package manager
- No test framework — verification is `tsc --noEmit` + `eslint` + manual/Playwright-driven checks

## Getting started

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Other scripts:

```bash
pnpm exec tsc --noEmit   # typecheck
pnpm lint                # eslint
pnpm build               # production build
```

## Project structure

```
app/
  games/
    pathfinder-sweep/     One game, fully self-contained — see its own README
    <next-game>/          Every future game follows the identical layout
  components/             Shared, cross-game UI primitives (mascot, device frame, ambient background, typewriter text)
  layout.tsx              Root layout — fonts, metadata
  page.tsx                Landing/shell — game picker (components/GamePicker.tsx), mounts the chosen game
  globals.css             Design tokens (CSS variables) + shared @keyframes
public/
  games/
    pathfinder-sweep/     Assets belonging only to this game (backgrounds, mascot art, etc.)
    <next-game>/          Same pattern per game
```

### Shared vs. game-specific

- **`app/components/`** — only things generic enough to be reused by *any*
  future game (e.g. the mascot character, the phone-frame device mockup,
  the ambient starfield background, the typewriter text effect).
- **`app/games/<game-slug>/`** — everything specific to one game: its
  screens, its game-loop logic, its own components, its own config, its
  own assets under `public/games/<game-slug>/`.

If you're unsure which bucket something belongs in, ask: "would a second,
completely different game also want this exact thing, unmodified?" If yes,
it's shared. If it only makes sense in the context of this one game, it
lives inside that game's folder.

## Adding a new game

Copy the shape of [`app/games/pathfinder-sweep/`](app/games/pathfinder-sweep/README.md)
exactly:

1. Create `app/games/<game-slug>/` (kebab-case, matches the game's name).
2. Inside it: `types.ts`, `config.ts` (data only), `engine/` (pure logic,
   no React), `components/` (presentational), `lib/` (integration seams
   like a results reporter), `<GameName>Game.tsx` (the orchestrator), and
   `index.ts` (the only supported import surface — re-export the game
   component, its props type, and any result types other code needs).
3. Put game-specific assets under `public/games/<game-slug>/` and reference
   them as `/games/<game-slug>/...`. Never put game-specific assets at the
   public root.
4. Add the game to the table at the top of this README.
5. Wire it into `app/page.tsx` (or wherever games get selected/launched).

This keeps every game independently reviewable, deletable, and handoff-able
— a new team member (or a different team entirely) should be able to open
one game's folder and understand it without reading any other game's code.

## Game results backend (local)

Signal Watch and Twin Current send every completed session to a small
local backend built into the app (Next.js route handlers in
`app/api/results/`). The data is stored on disk as one JSON line per
session:

```
data/game-results/signal-watch.jsonl
data/game-results/twin-current.jsonl
```

`data/` is git-ignored. A session is saved when the child taps
**Claim Rewards** on the results screen. The games also keep a
`localStorage` copy as a fallback.

With `pnpm dev` running, engineers can pull the data from:

| URL | What you get |
|---|---|
| `/api/results` | Which games have data, session counts, links |
| `/api/results/<game>` | All sessions, full JSON (every metric plus per-trial data) |
| `/api/results/<game>?format=csv` | One row per session: every summary metric, flattened (`metrics.detectionAccuracyPct`, `metrics.performanceByBlock.0.detected`, …) |
| `/api/results/<game>?format=csv&level=trials` | One row per trial: each signal (Signal Watch) or each scored round (Twin Current) |

`<game>` is `signal-watch` or `twin-current`. Sessions are written with a
`sessionId` (UUID) and a `receivedAt` timestamp. To reset the data, delete
the `.jsonl` files.

## Deployment

Deployed on Vercel. Pushing to `main` can be wired up for auto-deploy once
the GitHub repo is connected to the Vercel project.
