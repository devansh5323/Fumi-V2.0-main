# Twin Current

Game 3 of FUMI (Day 2, Greenwood river relay). It's a multiple-object
tracking game with a rule switch. Fumi marks the priority sparks, and their
glow disappears. Every spark then drifts down one river, crossing paths.
When they stop, the child drags each remembered spark to the gate that the
rule card names.

Skills: divided attention, dynamic visual attention, task switching.
Difficulty: medium → hard. Target length: about 4 minutes.

The game opens on a title screen (wooden "Twin Current" sign, parchment
instruction card and a green Play button over the river), in the same
style as Signal Watch. After Play, Fumi appears above the river and types
"Let's practice first! Watch the glowing balls with me." in a speech
bubble, then leaves, and How to Play round 1 starts. When How to Play
ends, she returns with "Great practice! Now let's play the real game!"
before Round 1/12.
The progress bar shows 4 segments during How to Play, then 12 for the
scored rounds.
The gates stand across the channel heads from the start of every round.

## How a round plays (the mockup's six steps)

The top bar has only a pause button and the progress bar. There's no timer
anywhere, and no rule card: every round, including How to Play, is a
plain match, where each ball goes through the gate showing its own symbol.
The "This one!" tag for missed targets is How to Play only. There's no visible step text; each step is announced to screen
readers. The 2 glowing balls always start in opposite channels (left and
right) and stay there. With 3 targets, both channels are always used.

1. **Look (3 s).** The targets glow (1st gold, 2nd purple, 3rd green).
   Every ball is still.
2. **Watch (5–6.5 s).** All balls become identical bubbles and flow
   through the river's two channels (the twin current), around the island
   chain. Each ball moves at its own speed and turns at its own points, so
   balls overtake and cross. Light trails follow every ball. No target is
   highlighted while they move.
3. **Select (timed).** The balls keep flowing, and the child taps the ones
   they were following before the countdown ends (7 s → 5 s for ages
   6–10, 6 s → 4 s for 11–16). A tapped ball stops where it was caught.
   Taps can be undone until the last one is chosen. When the countdown
   ends, the balls stop and the game waits for the child to finish
   choosing. It never moves on by itself.
4. **Reveal (1.1 s).** Each selected ball turns into its glowing symbol
   badge. Every ball carries a symbol, so a revealed symbol never proves
   the ball was a target.
5. **(Removed.)** There is no rule step; balls always go to the gate with
   their own symbol.
6. **Gates.** The gold and purple stone arches (there all round) stand at
   the heads of the two channels, each with a symbol on its keystone. The child drags each
   selected ball through the gate the rule names (or taps the ball, then
   the gate).

After the last ball, any target the child missed briefly re-lights. Then
the stream surges into the next round.

A wrong ball is logged and the round is never replayed. A wrong gate costs
10 energy in scored rounds only (energy is recorded in the results, but
has no on-screen meter, as in the mockup).

## Wrong ball selected

1. **At the tap (step 3):** no feedback. A wrong pick looks exactly like a
   right one, so the child can't trial-and-error their way to the targets.
   Taps can still be undone until the last ball is chosen.
2. **Step 4 (reveal):** each wrong ball shows a grey ✕. Each target the
   child missed lights up in its preview colour, where it is, with a
   "This one!" tag. The card says e.g. "One ball wasn't ours — the glowing
   one was."
3. **Steps 5–6:** wrong balls fade away. Only correctly found balls are
   routed. If no correct ball was found, the rule and gates are skipped
   and the round goes straight to the result ("You found 0 of 2").
4. **Scoring:** each wrong ball is logged as `wrong-spark` (counted in
   wrong balls selected), and the target it replaced is counted as missed.
   There's no energy cost (energy is only for wrong gates), and the round
   is never replayed.

## Rounds

- **How to Play (both age bands; shown as "How to Play 1/4"…):** 6/2 MATCH, 7/2 MATCH, 8/2 MATCH, 8/2 SWAP
  (balls/targets), with a longer selection window. The last one
  demonstrates a rule change.
- **12 scored rounds, 2 target balls each (24 symbols to identify).**
  Balls on screen: rounds 1–4: 6, rounds 5–8: 10, rounds 9–12: 12 (both
  age bands). Speed and motion time still increase every round.

| | 6–10 | 11–16 |
|---|---|---|
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

All art is cut from the design mockup and upscaled 4× with Real-ESRGAN:

- `backgrounds/river.jpg` (1170×2100): the mockup's step-4 scene, with
  its painted balls removed. It's upscaled twice with Real-ESRGAN (4×, then
  4× again from a half-size copy) for crisp edges, then given a local
  contrast boost and sharpening. It's cropped tight and stretched about 10%
  vertically, so the river fills the screen from just under the top bar.
  `river-mask.png` marks the river and `falls-mask.png` the two waterfall
  curtains: the river current flows, streaks pour down the falls, and mist
  pulses where they land. Small clouds drift in the strip of sky at the top
  only.
- `balls/ball.png`: the default bubble.
- `ui/title-plank.png`: the Signal Watch title sign with its lettering
  removed. "Twin Current" is drawn on top in CSS.
- `mascot/fumi.png`: Fumi with a clean transparent edge.
- `symbols/`: the 9 symbol badges (sun, moon, leaf, star, drop, heart,
  bolt, swirl, mountain). Each round uses 2 of them.
- `gates/`: the gold and purple arches. The round's symbol badge is drawn
  over each keystone. (`gate-teal.png` is a spare third gate, unused now that
  every round has 2 targets.)

Balls move only where `engine/waterMap.ts` allows. It's generated from
`river-mask.png`, with ball centres kept 18 px from any shore.
Regenerate it if the background changes.

## Structure

```
twin-current/
  TwinCurrentGame.tsx   Orchestrator: intro → rounds → completion, drag/drop, scoring
  types.ts / config.ts  Contracts / tunables (rounds, ramps, timing, rewards, layout, copy)
  index.ts              Public barrel
  engine/
    rng.ts                Seeded PRNG
    motion.ts             Channel-current simulation, precomputed at 30fps per round
    waterMap.ts           Generated map of where a ball may move
    rules.ts              MATCH / SWAP gate mapping
    sessionPlanner.ts     Builds all 20 rounds (incl. motion) from a seed
    metrics.ts            Metrics, stars, FIST, rewards
  components/
    RiverBackdrop (scene, clouds, current), EnergySpark (ball states + trail),
    RiverGate (arch + keystone symbol), RuleCard (rule pill), StepHeader, SymbolIcon
  lib/
    sessionReporter.ts    Backend seam (localStorage) + Day 2 completion
```
