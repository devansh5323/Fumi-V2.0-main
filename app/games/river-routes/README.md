# River Routes — path planning

Drag river pieces from the tray into the empty spaces so the water runs from the
Start tile to the End tile. Round 0 is a guided practice with Fumi; Rounds 1–5 are
played independently. No timer.

## Rules (from the sheet)

- Start, End and boulder tiles are fixed; pieces can't go on them.
- Pieces can't be rotated. Every tray piece must be used.
- Not every empty space is used — the leftover ones are decoys and stay empty.
- Each round has exactly one solution (checked: see "Data" below).

## How it plays

- Drag a piece from the tray onto an empty space. Drop it on another piece to swap;
  drag a placed piece to move it, or back to the tray / tap it to return it.
- Dropping on Start / End / a boulder flashes red, Fumi explains, the piece goes back.
- **Send Flow** lights up once every piece is on the board. The water then runs from
  the Start cell by cell. Success → "Great job! You connected the river!" and the
  game moves to the next level by itself after ~2 s (or tap **Next Round**). Failure → the water stops; the spot is ringed in red and Fumi says
  "Oh! The river stopped here. Try moving some pieces." (or that every piece must be
  part of the river).
- **Lives (Rounds 1–5): 3 for the whole game**, shown top-right. Every wrong Send
  Flow costs one and **restarts that level**: the water stops where it breaks (red ring,
  Fumi: "Oh! The river stopped here. Let's try this level again."), then every piece
  goes back to the tray. Lives carry over between levels. Losing the third → Fumi: "Oh
  oh, looks like the river couldn't reach the end. Let's try again." → **Try Again**
  starts a fresh game from Round 1 (practice skipped) with 3 lives. The practice round
  has no lives and doesn't restart.

### Round 0 — guided practice

1. Fumi introduces the goal → **Start Practice**.
2. Tour (with spotlight): the Start, the End, the boulders, the tray (pieces can't be
   turned; use every piece).
3. Five guided drops in river order: the needed piece bounces in the tray, the target
   space glows, and a ghost hand shows the drag until the child starts. Only the
   highlighted piece can be dragged; a wrong space → "Almost! Drop it on the glowing
   space."
4. Decoy spaces are highlighted ("They stay empty").
5. Send Flow → "Great job! You connected the river!" → **Start Round 1**.

## Data

All rounds are in `config.ts`, written exactly like the sheet:

```ts
{ board: ["S · · X", "X · · X", "X · · X", "X X · E"], tray: "─ ┐ │ │ └", solution: ["S ─ ┐ X", "X · │ X", "X · │ X", "X X └ E"] }
```

Each round is parsed and checked on load: square board, known symbols, the solution
matches the board (pieces only on `·`), the solution uses exactly the tray pieces, and
it really connects Start to End. A finished board is accepted only if the water
reaches the End using every piece **and** it equals the sheet's solution.

## Results

Saved to localStorage (`fumi-river-routes-results`) and the local backend
(`/api/results/river-routes`, CSV trials = one row per round), one entry per session,
updated when Play is pressed, when each round starts, after every drop and Send Flow,
on exit, when the tab is hidden/closed, and at the end (`status: "in-progress" |
"completed" | "game-over" | "exited"`). The round being played is included as it stands. Per round: pieces placed / returned, invalid drops,
Send Flow attempts / failures, completed, and background time (never shown).

## Art

Tiles, river pieces, the title plank, Send Flow, back and pause buttons and the
background are cut from the design reference (upscaled). ┌ and ┘ aren't used by the
sheet; if added they're drawn as mirrored ┐ / └.
