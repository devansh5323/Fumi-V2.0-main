# Twin Current

Game 3 of FUMI (Day 2, Greenwood river relay). It's a multiple-object
tracking game with a rule switch. Fumi marks the priority sparks, and their
glow disappears. Every spark then drifts down one river, crossing paths.
When they stop, the child drags each remembered spark to the gate that the
rule card names.

Skills: divided attention, dynamic visual attention, task switching.
Difficulty: medium → hard. Target length: about 4 minutes.

## How a round plays

1. **Reveal (3 s).** Every ball is still. The targets turn into the
   design's glowing balls (1st green, 2nd purple, 3rd yellow) and show a
   symbol. Fumi marks each target with an arrow.
2. **Fade (0.5 s).** The glow and symbol fade, so every ball is the same
   blue ball. No target is highlighted again while they move.
3. **Motion (5–6.5 s).** All sparks flow and cross paths, then stop.
4. **Gates.** The design's neutral stone-and-wood gates appear across the
   top of the river, with a rule card just below them. Fumi points at the card, never at the correct gate. The child
   drags each remembered spark to a gate (or taps the spark, then taps a
   gate).
   - **MATCH:** each spark goes to the gate with its own emblem.
   - **SWAP:** each spark goes to the other gate (with three gates, the
     next one along).

   Each round draws its 2 (or 3) symbols at random from the design's 8:
   star, moon, heart, leaf, sun, swirl, butterfly, snowflake.
5. **Result (1.1 s).** Any target the child missed lights up again briefly.
6. **Flow (0.8 s).** The gates open, the stream surges, and the next round
   starts with more or faster sparks.

The child gets as many drags as there are targets. A wrong spark is logged
and the round is never replayed. A wrong gate costs 10 energy in scored
rounds only. Energy never ends the game.

## Rounds

- **Practice (both age bands):** 4/2 MATCH, 5/2 MATCH, 6/2 MATCH, 6/2 SWAP
  (sparks/targets). The last one demonstrates a rule change.
- **16 scored rounds.** Spark count, speed and motion time increase every
  round.

| | 6–10 | 11–16 |
|---|---|---|
| Sparks | 6 → 8 | 8 → 10 |
| Targets / gate emblems | 2 / 2 | 2 / 2, then 3 / 3 from round 7 |
| Speed (px/s) | 60 → 90 | 80 → 125 |
| Rule switches | 3 | 6 |
| Crossings | Sparks push apart (fewer close crossings) | Targets steer toward decoys (more crossings) |
| Gate order | Fixed | Shuffled each round |

## Metrics (`engine/metrics.ts`, scored rounds only)

- total targets presented; correct targets identified; tracking accuracy
  %; wrong sparks selected; targets missed
- average target identification time
- correct gate routes; wrong gate routes; gate-routing accuracy %
- total rule changes; average response time after a rule change
- tracking accuracy by spark count and by speed tier
- gameplay duration (paused time excluded)

## Rewards

- Completing the game gives 120 XP and 30 coins.
- **FIST** means tracking accuracy and gate-routing accuracy are both at
  least 90%. It adds 10 coins (40 total), the Single Ranger badge, and
  3 stars.
- The child picks 2 of 4 accessories: Energy Tail Rings, Moonleaf Cape,
  Glow Orb Pack, River Trail.
- **Day 2 bonus (+30 XP):** awarded once, by whichever of Twin Current or
  Signal Watch completes Day 2 second. The shared logic is in
  `app/lib/dayProgress.ts`.

## Art

All art is cut from the design sheet and upscaled 4× with Real-ESRGAN:

- `backgrounds/river.jpg` (1170×2100): the painted river.
  `backgrounds/river-mask.png` marks the water, so the animated current
  only covers water.
- `balls/`: blue (every ball after the preview), green, purple and yellow
  (the targets' preview glow).
- `symbols/`: the 8 coloured symbols. `gates/`: the 8 matching neutral
  gates.
- `effects/`: a splash (when a ball reaches a gate) and a water swirl
  (under resting balls).

The balls move only inside the painted river. Its edges at each height
are measured into `RIVER_EDGES` in `config.ts`; re-measure them if the
background changes.

## Structure

```
twin-current/
  TwinCurrentGame.tsx   Orchestrator: intro → rounds → completion, drag/drop, scoring
  types.ts / config.ts  Contracts / tunables (rounds, ramps, timing, rewards, layout, copy)
  index.ts              Public barrel
  engine/
    rng.ts                Seeded PRNG
    motion.ts             Steering simulation, precomputed at 30fps per round
    rules.ts              MATCH / SWAP gate mapping
    sessionPlanner.ts     Builds all 20 rounds (incl. motion) from a seed
    metrics.ts            Metrics, stars, FIST, rewards
  components/
    RiverBackdrop, EnergySpark, RiverGate, RuleCard, SymbolIcon, TwinHud
  lib/
    sessionReporter.ts    Backend seam (localStorage) + Day 2 completion
```
