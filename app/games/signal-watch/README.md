# Signal Watch

Game 2 of FUMI (Greenwood river relay). It's a sustained-attention and
impulse-control game. Three relay towers stand beside a moving river full
of noise: leaves, fish, bubbles and ripples. Now and then a tower fires the
real signal, three rings spreading from its gem, and the child taps that
tower. Every other pulse is a scored decoy the child must not tap.

Skills: sustained attention, impulse control, vigilance, false-alarm
inhibition. Difficulty: medium. Target length: 3.5–4 minutes.

## Flow

1. **Start screen:** the wooden title sign, the parchment card and Play.
2. **Tutorial:** Fumi appears above the towers. Her line ("Let's learn how
   to spot the real signal — watch the towers with me!") types out letter
   by letter in a speech bubble and holds briefly. Then Fumi and the bubble
   fade away, and Fumi isn't shown during play. Next, the tutorial labels a two-ring ripple "Ignore", a single flash
   "Ignore", and a three-ring pulse "That's it — tap!". The tutorial waits
   until the child taps that tower.
3. **The run** (scored): first, Fumi returns once more ("You've got it!
   Now let's play the real game — tap only the three-ring signal!") and
   leaves. Then one continuous run of **100 signals: 70 real, 30 decoys**,
   in shuffled order, one at a time, never twice in a row on the same
   tower. There are no round labels or breaks.

   | Signals | New signal every | Visible for |
   |---|---|---|
   | 1–20 | 1150 ms | 1000 ms |
   | 21–50 | 900 ms | 750 ms |
   | 51–75 | 750 ms | 600 ms |
   | 76–100 | 600 ms | 450 ms |

   Each signal stays up until 150 ms before the next one. Decoys get more
   target-like as the pace rises. The four speed phases are the "vigilance
   blocks" reported in `performanceByBlock`. The run itself takes about 86 s.
4. **Completion:** stats, stars, 100 XP, coins, the River Stone, the
   Hunter Badge (if FIST), and a choice of 1 of 3 accessories.

## Events

- **Real signal:** three concentric rings from the gem (in the tower's
  colour), with ripples at the base.
- **Decoys (scored):** two-ring ripple, single-ring flash, reflected
  sunlight, bubbles, fish splash, leaf cluster, harmless blue spark. Later
  blocks lean on one- and two-ring pulses, the most tempting look-alikes.
- **Background (unscored, `components/RiverLife.tsx`):** drifting leaves,
  jumping fish, bubbles and ripples, clipped to the river. Ages 11–16 get
  more of everything.

Real-signal onsets are jittered 2.5–7 s apart. Decoys fill the time
between them and may overlap an event on another tower (never two on one
tower, at most 2 on screen, never starting within 350 ms of a real signal).
This overlap is what makes withholding the tap hard.

## Responses

- **Hit:** tap the tower showing three rings, or within 150 ms after they
  vanish. a relay beam fires to the next tower
  (blue → purple → gold → blue), and the route line advances.
- **False alarm:** tap a decoy, an idle tower, or the wrong tower. A red ✕
  badge appears (matching the green ✓ for a hit), with a short mist puff.
- **Miss:** the scene doesn't pause.

## Difficulty (`config.ts`)

The pace and counts are the same for both age bands (`SPEED_PHASES`,
`TOTAL_SIGNALS`, `REAL_SIGNALS`). Ages 11–16 get look-alike decoys earlier
(`decoyWeightsByPhase`) and a busier river.

## Metrics (`engine/metrics.ts`, scored blocks only)

- total real signals; real signals detected; detection accuracy %; real
  signals missed
- total distractors; distractors tapped (also split by type); distractor
  rejection accuracy %
- average response time to real signals
- performance per vigilance block (detection, rejection, average response)
- gameplay duration (paused time excluded)
- also: wrong-tower taps and idle-tower taps

## Rewards

- Completing the game gives 100 XP, 25 coins, and the River Stone
  collectible.
- **FIST** means detection accuracy and distractor rejection accuracy are
  both at least 90%. It adds 5 coins (30 total), the Hunter Badge, and
  3 stars.
- The child picks 1 of 3 accessories: Signal Goggles, River Cape, Pulse
  Charm.

## Art

- `backgrounds/river-towers.jpg` (1170×2100): the mockup's river scene,
  upscaled 4× with Real-ESRGAN. `falls-mask.png` and `river-mask.png` are
  alpha masks of the water, used by the flow animations in
  `components/LivingScene.tsx`. Regenerate them if the background changes.
- `ui/title-sign.png`: the title sign, upscaled and cut out.
- `collectibles/river-stone.png`: the River Stone, upscaled 4×.
- Tower gem, base and tap-zone positions (`TOWERS`) and Fumi's position
  (`FUMI_PERCH`) in `config.ts` are measured off the background.
- `mascot/fumi.png`: edges cleaned so no dark outline or bottom strip from
  the original background remains.

## Structure

```
signal-watch/
  SignalWatchGame.tsx   Screens, tutorial, continuous stage runner, tap judging, completion
  types.ts / config.ts  Contracts / tunables (blocks, timing, rewards, layout, copy)
  engine/
    schedule.ts           Builds the 3 round (block) timelines from a seed; tap lookups
    metrics.ts            Metrics, stars, FIST, rewards
    rng.ts                Seeded PRNG
  components/
    LivingScene.tsx       Background + clouds + waterfalls + river current
    RiverLife.tsx         Unscored river noise (leaves, fish, bubbles, ripples)
    SignalEffect.tsx      SVG effect for each signal type
    RelayFeedback.tsx     Relay beam (hit) and mist puff (false alarm)
    FumiGuide.tsx         Fumi + typed speech bubble introducing the tutorial
    SignalHud.tsx         Pause, stage label, route-progress line
  lib/sessionReporter.ts  Backend seam (currently localStorage)
```
