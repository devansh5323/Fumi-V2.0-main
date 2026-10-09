# Lantern Grid — pattern completion

Ten lantern-grid puzzles in a row (3×3 for puzzles 1–6, 4×4 for 7–10). Each grid has one
missing lantern ("?"). The child drags one of four lantern cards (A–D) into the gap.

## Flow

Loading (images preloaded) → **intro**: Fumi centre-stage explains, "Let's Go!" →
Fumi moves to the top-left and the first grid slides in → solve → the grid slides out
to the left and the next one comes in from the right → … → **complete** screen.

- No round labels and no visible timer. Progress is the lantern bar at the top: each
  slot lights up with that puzzle's answer lantern once it's solved.
- **3 lives** (hearts). A wrong drop costs one life: the card shows a ✕ over the gap,
  slides back to its slot, and is dimmed so the child tries the remaining options.
  Dropping a card anywhere else just returns it (no life lost). A tap without
  dragging shows a "Drag the lantern to the ?" hint.
- Out of lives → Fumi: "Oh oh, looks like you weren't able to power the grid up.
  Let's try again." **Try Again** restarts at puzzle 1 with 3 lives, an empty bar
  and a new session.
- Keyboard: focus a card and press Enter/Space to try it in the gap.

## Editing puzzles

All content is in `config.ts`, written the same way as the sheet:

```ts
{ order: ["AM AD AM", "AD AM AD", "AM AD ?"], answer: "AM", options: ["Blue Moon", "Amber Diamond", "Amber Moon", "Amber Star"] }
```

Rows are parsed and checked on load (square grid, exactly one `?`, answer among the
options). The legend (`LANTERNS`) maps codes/names to artwork in
`public/games/lantern-grid/lanterns/`.

## Data saved

`SessionOutcome` (see `types.ts`): per puzzle, every drop (option, right/wrong, time
since the puzzle appeared), wrong attempts and time to solve; plus totals:
puzzles solved, incorrect attempts, lives remaining, and **background timing**:
`completionDurationMs` from the first puzzle becoming playable until the tenth is
solved (pauses excluded; `null` if not completed), `elapsedActiveMs`, `elapsedWallMs`.
None of the timing is shown in the game.

Saved to localStorage (`fumi-lantern-grid-results`, one entry per session, updated after
every drop/solve, `status: "in-progress" | "completed" | "game-over"`). Finished
sessions are also sent to the local backend: `/api/results/lantern-grid` (CSV trials
export = one row per puzzle).

## Art

Lantern tiles, back/pause buttons, the progress-bar lantern and the background are cut
from the design reference (upscaled). Blue Moon only appears in the reference with its
base hidden by a label, so its tile is the Amber Moon tile recoloured to match the
reference's blue lanterns.
