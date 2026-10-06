# Pathfinder Sweep

Game 1 of FUMI. A visual-search / selective-attention mini-game: find the
one hex tile whose symbol exactly matches the reference marker before the
3-minute clock runs out. Difficulty (tile count + how visually similar the
decoys are) increases every single trial.

This folder is fully self-contained and is the reference template every
future game should copy — see [Adding a new game](../../../README.md#adding-a-new-game)
in the project root README for the checklist.

## Structure

```
pathfinder-sweep/
  PathfinderSweepGame.tsx   Orchestrator: owns screen/game state, composes everything below
  types.ts                 All shared TypeScript contracts for this game
  config.ts                Tunable data only — timings, difficulty ramps, copy, layout constants
  index.ts                 Public barrel — this is the only path other code should import from
  engine/                  Pure game logic, no React, no DOM
    rng.ts                   Seeded PRNG — every trial is reproducible from its seed
    symbolLibrary.ts          The glyph shape definitions
    distractorFactory.ts      Builds each trial's tile set (target + decoys)
    scatterLayout.ts          Places tiles on screen without overlap
    sessionPlanner.ts         Builds the full sequence of trials for a run
    metrics.ts                Turns raw trial results into the end-of-game outcome/star rating
  components/               Presentational React components, game-specific
    HexTile.tsx, SymbolGlyph.tsx, ReferenceBadge.tsx, SearchField.tsx,
    FireflyCue.tsx, ForestPath.tsx
  lib/
    sessionReporter.ts        The one seam a backend integration replaces later
```

Assets for this game live under `/public/games/pathfinder-sweep/` (not the
public root), referenced as `/games/pathfinder-sweep/<path>` from
components.

## Importing this game elsewhere

```ts
import { PathfinderSweepGame } from "@/app/games/pathfinder-sweep";
```

Only `index.ts`'s exports are the supported public surface
(`PathfinderSweepGame`, `PathfinderSweepGameProps`, and the result types).
Nothing inside `engine/`, `components/`, or `lib/` is meant to be imported
directly from outside this folder.

## Backend integration point

`lib/sessionReporter.ts`'s `reportGame(outcome: GameOutcome)` is called once
per completed playthrough. It currently writes to `localStorage`; swapping
in a real API call is the only change needed to wire this game into a
backend.
