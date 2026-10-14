# Decoy Grove — odd one out

Based on Lumosity's **Star Search** (reference video: https://www.youtube.com/watch?v=YTSjaq7FMDQ),
reskinned with the Decoy Grove night-path background and object illustrations.

## Rules

- Each round scatters objects over the grove; exactly one doesn't belong. Tap it.
- **90 s for the whole game** (TIME in the header; "Level N / total" below it) and **3 s per
  level**, timed in the background (no bar on screen). Pauses stop both.
- No tap within 3 s → the game simply switches to the next level (no message); the level
  counts as missed (no points, streak resets).
- The game ends after the last level — straight away, even with time left — or automatically
  when the 100 s run out, showing how many levels were completed.
- **Right:** green ring, `+points`, next round after 0.45 s.
- **Wrong:** red ring + ✕ on the tap, the real odd one is ringed in gold, streak resets,
  no points, next round after 1 s.
- **Score:** 10 points × multiplier. The multiplier is x1, rising by one for every 3
  correct answers in a row (max x5), shown next to SCORE.
- Pause hides the objects and stops the clock.

## Rounds

All rounds are in `config.ts` (`ROUNDS`), one entry per sheet row (`id` = the sheet's row number), with the sheet's
text kept beside the data. Counts are checked against the sheet text on load.

- Sheet "green mushroom" = the teal mushroom illustration; "smooth shell" = yellow smooth
  shell; "timer" = the hourglass.
- Round 23: arrows face right as drawn; the odd arrow is mirrored to face left. The mask
  is symmetrical, so "right-facing" masks look as drawn.
- Round 24: the odd purple mushroom is upside down.
- Round 25: fireflies face left; the odd orange firefly faces right (no movement).
- Rounds 26–35 are direction rounds. Rows 26–33 as written had no single odd object, so
  (as agreed) each row's "1 …" item is the odd one and the group that matched it is flipped
  to the other direction; counts are unchanged and each change is noted in `adjusted`.
  For rows 26–30 and 32 this means the odd one differs from the sheet's answer column.

## Files

| Path | What |
| --- | --- |
| `config.ts` | Rounds, rules (time, points, feedback timing), copy, assets |
| `engine/scatter.ts` | Random scatter on a loose grid — no overlaps, nothing clipped |
| `engine/session.ts` | Metrics |
| `DecoyGroveGame.tsx` | Home, play, pause and end screens |
| `lib/sessionReporter.ts` | Saves to localStorage + `/api/results/decoy-grove` |

## Data

Each session is one entry in localStorage (`fumi-decoy-grove-results`) and the local
backend, updated when play starts, after every answer, on exit/tab hide and at the end
(`status: in-progress | completed | time-up | exited`). Per level: correct, timed out,
what was tapped, response time, streak, multiplier, points. Totals: levels completed, score, correct / wrong / timed out,
accuracy, best streak, average response time, time used.

## Art

`public/games/decoy-grove/objects/*.webp` are the supplied illustrations with only their
plain paper background removed (nothing redrawn). `backgrounds/night-path.jpg` is the
supplied background, unchanged.
