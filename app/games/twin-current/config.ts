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
  selectMs: number;
};

export const PRACTICE_ROUNDS: PracticeRoundSpec[] = [
  { sparkCount: 6, targetCount: 2, rule: "match", speedPxPerSec: 45, motionMs: 5000, selectMs: 8000 },
  { sparkCount: 7, targetCount: 2, rule: "match", speedPxPerSec: 50, motionMs: 5000, selectMs: 8000 },
  { sparkCount: 8, targetCount: 2, rule: "match", speedPxPerSec: 55, motionMs: 5000, selectMs: 7500 },
  { sparkCount: 8, targetCount: 2, rule: "swap", speedPxPerSec: 55, motionMs: 5000, selectMs: 7500 },
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
  // Step 3 window (balls still flowing), shrinking from first to last round.
  selectMsRange: [number, number];
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
    sparkCountRange: [8, 12],
    threeTargetsFromRound: null,
    speedRange: [60, 90],
    motionMsRange: [5000, 6000],
    selectMsRange: [7000, 5000],
    ruleSwitches: 3,
    separation: 1,
    crossingPull: 0,
    shuffleGates: false,
  },
  "11-16": {
    sparkCountRange: [10, 14],
    threeTargetsFromRound: 6,
    speedRange: [80, 125],
    motionMsRange: [5000, 6500],
    selectMsRange: [6000, 4000],
    ruleSwitches: 6,
    separation: 0.25,
    crossingPull: 0.7,
    shuffleGates: true,
  },
};

// The design's symbol set ("set can change per level"). Each round draws
// its 2 (or 3) gate symbols from these at random.
export const ALL_SYMBOLS: CargoSymbol[] = ["sun", "moon", "leaf", "star", "drop", "heart", "bolt", "swirl", "mountain"];

export const SYMBOL_NAME: Record<CargoSymbol, string> = {
  sun: "Sun",
  moon: "Moon",
  leaf: "Leaf",
  star: "Star",
  drop: "Drop",
  heart: "Heart",
  bolt: "Bolt",
  swirl: "Swirl",
  mountain: "Mountain",
};

// Step 1 glow colours, by target slot (the mockup's gold and purple).
export const PREVIEW_GLOW = ["#FFC21F", "#B061FF", "#36D97A"];

// Each symbol's badge colour — used for a revealed ball's glow.
export const SYMBOL_COLOR: Record<CargoSymbol, string> = {
  sun: "#FFB21E",
  moon: "#9B5CF0",
  leaf: "#3FB34F",
  star: "#2F80E8",
  drop: "#1FA8EE",
  heart: "#F0527A",
  bolt: "#FF9A2E",
  swirl: "#A35CE8",
  mountain: "#B06A3C",
};

export function speedTierFor(speedPxPerSec: number): SpeedTier {
  if (speedPxPerSec < 70) return "slow";
  if (speedPxPerSec < 100) return "medium";
  return "fast";
}

// ---------------------------------------------------------------------------
// Timing (ms)
// ---------------------------------------------------------------------------

export const TIMING = {
  previewMs: 3000, // step 1: targets glow, everything still
  fadeMs: 400, // glow fades, still stationary
  revealMs: 1100, // step 4: selected balls show their symbols
  ruleMs: 1500, // step 5: the rule card appears before the gates rise
  resultMs: 1000, // missed targets briefly re-light
  flowMs: 700, // gates swing open, the stream surges, next round
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

export const SPARK_RADIUS = 20;

// Gates stand across the heads of the two channels, at the waterfall —
// gold on the left, purple on the right (a third, teal, in the middle for
// 3-category rounds).
export const GATE_ASPECT = 1.12; // width / height of the gate art
export const GATE_BOTTOM = 266; // just in front of the waterfall's base
export type GateArt = "gold" | "purple" | "teal";
export function gateRects(count: number): (Rect & { art: GateArt })[] {
  const w = count === 2 ? 88 : 80; // smaller = further back, by the falls
  const h = w / GATE_ASPECT;
  const centres = count === 2 ? [76, 306] : [70, 192, 314];
  const arts: GateArt[] = count === 2 ? ["gold", "purple"] : ["gold", "teal", "purple"];
  return centres.map((cx, i) => ({ x: cx - w / 2, y: GATE_BOTTOM - h, width: w, height: h, art: arts[i] }));
}

export const RULE_CARD_TOP = 100;

const A = "/games/twin-current";
export const ASSETS = {
  background: `${A}/backgrounds/river.jpg`,
  riverMask: `${A}/backgrounds/river-mask.png`,
  fallsMask: `${A}/backgrounds/falls-mask.png`,
  ball: `${A}/balls/ball.png`,
  symbol: (s: CargoSymbol) => `${A}/symbols/${s}.png`,
  gate: { gold: `${A}/gates/gate-gold.png`, purple: `${A}/gates/gate-purple.png`, teal: `${A}/gates/gate-teal.png` } as Record<GateArt, string>,
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
