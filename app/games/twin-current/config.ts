import type { AgeBand, CargoSymbol, QuestContext, Rect, RouteRule, SpeedTier } from "./types";

// ---------------------------------------------------------------------------
// Session shape
// ---------------------------------------------------------------------------

export const SCORED_ROUNDS = 16;

// Tutorial rounds, shared by both age bands. Practice is never scored and
// never costs energy. Round 4 exists purely to demonstrate a rule change.
export type PracticeRoundSpec = {
  sparkCount: number;
  targetCount: number;
  rule: RouteRule;
  speedPxPerSec: number;
  motionMs: number;
};

export const PRACTICE_ROUNDS: PracticeRoundSpec[] = [
  { sparkCount: 4, targetCount: 2, rule: "match", speedPxPerSec: 45, motionMs: 5000 },
  { sparkCount: 5, targetCount: 2, rule: "match", speedPxPerSec: 50, motionMs: 5000 },
  { sparkCount: 6, targetCount: 2, rule: "match", speedPxPerSec: 55, motionMs: 5000 },
  { sparkCount: 6, targetCount: 2, rule: "swap", speedPxPerSec: 55, motionMs: 5000 },
];

// Scored-round difficulty, per age band. Spark count, speed and motion time
// all ramp linearly from the first scored round to the last.
export type AgeBandConfig = {
  sparkCountRange: [number, number];
  // Target count for scored round i: 3 from `threeTargetsFromRound` on (if
  // set), else 2. Three targets always come with three gate categories.
  threeTargetsFromRound: number | null;
  speedRange: [number, number];
  motionMsRange: [number, number];
  // How many times the rule flips across the 16 scored rounds.
  ruleSwitches: number;
  // Motion feel. separation pushes sparks apart (fewer close crossings);
  // crossingPull steers targets toward nearby decoys (more crossings).
  separation: number;
  crossingPull: number;
  // Randomise which gate sits on the left each round.
  shuffleGates: boolean;
};

export const AGE_BAND_CONFIG: Record<AgeBand, AgeBandConfig> = {
  "6-10": {
    sparkCountRange: [6, 8],
    threeTargetsFromRound: null,
    speedRange: [60, 90],
    motionMsRange: [5000, 6000],
    ruleSwitches: 3,
    separation: 1,
    crossingPull: 0,
    shuffleGates: false,
  },
  "11-16": {
    sparkCountRange: [8, 10],
    threeTargetsFromRound: 6,
    speedRange: [80, 125],
    motionMsRange: [5000, 6500],
    ruleSwitches: 6,
    separation: 0.25,
    crossingPull: 0.7,
    shuffleGates: true,
  },
};

// The design's 8 symbols. Each round draws its 2 (or 3) gate emblems from
// these at random.
export const ALL_SYMBOLS: CargoSymbol[] = ["star", "moon", "heart", "leaf", "sun", "swirl", "butterfly", "snowflake"];

export function speedTierFor(speedPxPerSec: number): SpeedTier {
  if (speedPxPerSec < 70) return "slow";
  if (speedPxPerSec < 100) return "medium";
  return "fast";
}

// ---------------------------------------------------------------------------
// Timing (ms)
// ---------------------------------------------------------------------------

export const TIMING = {
  revealMs: 3000, // targets glow + show their emblem, everything still
  fadeMs: 500, // glow and emblem fade out, still stationary
  resultMs: 1100, // true targets briefly revealed after the last pick
  flowMs: 800, // gates swing open, the stream surges, next round
} as const;

// ---------------------------------------------------------------------------
// Energy + rewards
// ---------------------------------------------------------------------------

export const START_ENERGY = 100;
export const WRONG_ROUTE_ENERGY_COST = 10;

export const REWARDS = {
  completionXp: 120,
  completionCoins: 30,
  fistBonusCoins: 10,
  fistBadge: "Single Ranger",
  // FIST = both tracking and gate-routing accuracy at or above this.
  fistThresholdPct: 90,
  // Awarded once, when both Day 2 games (this + Signal Watch) are complete.
  day2BonusXp: 30,
  accessoryChoices: ["Energy Tail Rings", "Moonleaf Cape", "Glow Orb Pack", "River Trail"],
  accessoriesToPick: 2,
} as const;

// ---------------------------------------------------------------------------
// Layout — fixed 390x700 design surface, same as every FUMI game
// ---------------------------------------------------------------------------

export const PLAY_AREA = { width: 390, height: 700 };
export const SAFE_AREA_TOP = 44;
export const HUD_HEIGHT = 52;

export const SPARK_RADIUS = 22;

// The painted river's left/right water edges at each screen height (px),
// measured off the background's water mask. Sparks stay inside these.
// Re-measure if the background changes.
export const RIVER_EDGES: [y: number, left: number, right: number][] = [
  [100, 76, 327], [120, 86, 336], [140, 97, 345], [160, 108, 345], [180, 111, 319], [200, 100, 293],
  [220, 75, 277], [240, 48, 295], [260, 44, 318], [280, 61, 342], [300, 80, 354], [320, 76, 369],
  [340, 57, 381], [360, 81, 389], [380, 118, 389], [400, 156, 389], [420, 137, 389], [440, 118, 389],
  [460, 97, 384], [480, 91, 371], [500, 82, 333], [520, 66, 295], [540, 50, 263], [560, 39, 255],
  [580, 41, 257], [600, 59, 277], [620, 75, 309], [640, 90, 341], [660, 94, 354], [680, 99, 356],
];

export function riverEdgesAt(y: number): [number, number] {
  const rows = RIVER_EDGES;
  if (y <= rows[0][0]) return [rows[0][1], rows[0][2]];
  for (let i = 1; i < rows.length; i++) {
    if (y <= rows[i][0]) {
      const [y0, l0, r0] = rows[i - 1];
      const [y1, l1, r1] = rows[i];
      const t = (y - y0) / (y1 - y0);
      return [l0 + (l1 - l0) * t, r0 + (r1 - r0) * t];
    }
  }
  const last = rows[rows.length - 1];
  return [last[1], last[2]];
}

// Like the design, the gates stand across the river at the TOP of the
// screen, with the rule card just below them. Sparks move in the band below.
export const GATE_TOP = SAFE_AREA_TOP + HUD_HEIGHT + 6;
export const GATE_ASPECT = 0.91; // width / height of the gate art

export function gateRects(count: number): Rect[] {
  const gap = count === 2 ? 14 : 8;
  const width = count === 2 ? 108 : 92;
  const height = width / GATE_ASPECT;
  const span = width * count + gap * (count - 1);
  const left = 206 - span / 2;
  return Array.from({ length: count }, (_, i) => ({ x: left + i * (width + gap), y: GATE_TOP, width, height }));
}

export const RULE_CARD_RECT: Rect = { x: 120, y: 226, width: 180, height: 54 };

export const SPARK_FIELD = { yMin: 300, yMax: 640 };

const A = "/games/twin-current";
export const ASSETS = {
  background: `${A}/backgrounds/river.jpg`,
  riverMask: `${A}/backgrounds/river-mask.png`,
  ball: {
    neutral: `${A}/balls/blue.png`,
    green: `${A}/balls/green.png`,
    purple: `${A}/balls/purple.png`,
    gold: `${A}/balls/yellow.png`,
  },
  symbol: (s: CargoSymbol) => `${A}/symbols/${s}.png`,
  gate: (s: CargoSymbol) => `${A}/gates/${s}.png`,
  splash: `${A}/effects/splash.png`,
  swirl: `${A}/effects/swirl.png`,
  fumi: `${A}/mascot/fumi.png`,
};

export const FUMI_SRC = ASSETS.fumi;

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

export const QUEST_TEXT =
  "The relay is active, but the river has split Greenwood energy into two moving channels. Track the priority sparks — and watch for changing routing rules!";

export const NARRATION_TEXT =
  "Two of these sparks belong to us. Watch them. Their glow will disappear, but they're still our sparks. Keep track of them while they move. Then we'll send them through the right gate.";

export const CHILD_RULE_TEXT =
  "Remember the glowing sparks. When they all look the same, keep watching ours. When they stop, drag each of our sparks to the gate the rule card shows.";

export const DEFAULT_QUEST: QuestContext = {
  day: 2,
  region: "Greenwood",
  questId: "twin-current",
};
