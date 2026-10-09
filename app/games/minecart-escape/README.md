# Minecart Escape — word search

Three themed word-search rounds in a mine. Fumi rides the cart.

## Flow

Start → for each round: **intro** (Fumi + round title, theme, instruction) →
"Building the mine…" → **play** → **result** ("Track Cleared!") → **final summary**.

- Each round has 10 hidden words and a 3:00 countdown that only runs while the
  grid is visible and the game is not paused. It never goes below 00:00.
- The round ends when all 10 words are found (the timer stops) or time runs out.
- Round end: Fumi says "You found X words!", then **Track Cleared!** (5+ words,
  `PASS_WORDS`) or **Try Again** (fewer: one of 3 lives, `LIVES`, is lost and the
  same round is replayed with a freshly shuffled grid). Then Fumi leaves and
  "Round N" appears with a Start button.
- Losing the last life ends the game. Full metrics are only shown at the end
  (all 3 rounds cleared, or out of lives).
- Under the grid, all 10 words are listed greyed out; each lights up in its
  highlight colour with a ✓ when found.
- Words are placed horizontally, vertically and diagonally, some reversed.
  Every word is guaranteed to be present (the generator is in `engine/wordsearch.ts`).
- Select by dragging across the letters, or tap the first letter and then the last.
  Selections snap to straight lines. Both directions count.

## Editing content

All round content is in `config.ts` → `ROUNDS`:

```ts
{ round: 1, title: "Mining Tools", description: "...", words: [...10 words], gridSize: 12, timeLimitMs: 180_000 }
```

Change the words, grid size or time there. Copy (instruction, "Track Cleared!",
"Try Again", pass mark, lives) is also in `config.ts`.

## Files

| Path | What |
| --- | --- |
| `config.ts` | Rounds, copy, colours, rewards, asset paths |
| `types.ts` | Round results, metrics, outcome |
| `engine/wordsearch.ts` | Puzzle generation, line snapping, word matching |
| `engine/metrics.ts` | Totals, stars, rewards |
| `components/WordGrid.tsx` | Letter grid + drag/tap selection + highlights |
| `components/MineArt.tsx` | Cave backdrop, wood/parchment panels, Fumi in the cart |
| `MinecartEscapeGame.tsx` | Screens and round timer |
| `lib/sessionReporter.ts` | Sends the outcome to `/api/results/minecart-escape` |

## Data saved

`GameOutcome.rounds[]` holds every attempt (`attempt`, `passed`), each with: the words found (with `foundAtMs`),
missed words, invalid and repeat selections, time taken, time remaining, and how the
round ended (`all-found` / `time-up`). The game is saved as soon as it ends (not only on Claim Rewards); the accessory is
added to the localStorage copy when claimed. The CSV trials export has one row per
word per round attempt.
