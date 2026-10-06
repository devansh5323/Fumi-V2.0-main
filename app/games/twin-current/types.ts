export type AgeBand = "6-10" | "11-16";

// Cargo emblems (the design's 8 symbols). A target spark shows its emblem
// during the reveal only; gates carry them permanently in a neutral colour.
export type CargoSymbol = "star" | "moon" | "heart" | "leaf" | "sun" | "swirl" | "butterfly" | "snowflake";

// "match": a spark goes through the gate showing its own emblem.
// "swap": every emblem is sent to the NEXT emblem in the round's list
// (with 2 emblems that's a plain swap; with 3 it's a rotation).
export type RouteRule = "match" | "swap";

// The glow colour Fumi marks each target with during the reveal. Indexed by
// target slot, so the first target is always green, the second purple.
export type TargetGlow = "green" | "purple" | "gold";

export type SpeedTier = "slow" | "medium" | "fast";

export type Point = { x: number; y: number };

export type SparkPlan = {
  sparkId: string;
  isTarget: boolean;
  // Only set for targets.
  cargo: CargoSymbol | null;
  glow: TargetGlow | null;
};

// Precomputed motion: frames[f][sparkIndex] at a fixed timestep. The last
// frame is where every spark comes to rest.
export type MotionTrack = {
  frameMs: number;
  frames: Point[][];
};

export type RoundPlan = {
  roundIndex: number; // 0-based across the whole session, practice included
  isPractice: boolean;
  label: string; // "Practice 1/4" | "Round 3/16"
  sparks: SparkPlan[];
  targetCount: number;
  categories: CargoSymbol[]; // gate emblems in this round
  gateOrder: CargoSymbol[]; // left -> right
  rule: RouteRule;
  ruleChanged: boolean; // differs from the previous round's rule
  speedPxPerSec: number;
  speedTier: SpeedTier;
  motionMs: number;
  motion: MotionTrack;
};

export type PickOutcome = "correct-route" | "wrong-route" | "wrong-spark";

export type PickRecord = {
  sparkId: string;
  isTarget: boolean;
  cargo: CargoSymbol | null;
  gate: CargoSymbol;
  outcome: PickOutcome;
  // Since the gates appeared.
  atMs: number;
  // Since the previous pick (or since the gates appeared, for the first).
  sincePrevMs: number;
};

export type RoundResult = {
  roundIndex: number;
  isPractice: boolean;
  sparkCount: number;
  targetCount: number;
  speedPxPerSec: number;
  speedTier: SpeedTier;
  rule: RouteRule;
  ruleChanged: boolean;
  picks: PickRecord[];
  correctTargets: number;
  wrongSparks: number;
  missedTargets: number;
  correctRoutes: number;
  wrongRoutes: number;
  firstResponseMs: number | null;
};

export type AccuracyBucket = {
  presented: number;
  identified: number;
  accuracyPct: number;
};

export type TwinCurrentMetrics = {
  totalTargetsPresented: number;
  correctTargetsIdentified: number;
  trackingAccuracyPct: number;
  wrongSparksSelected: number;
  targetsMissed: number;
  avgTargetIdentificationMs: number | null;
  correctGateRoutes: number;
  gateRoutingAccuracyPct: number;
  wrongGateRoutes: number;
  totalRuleChanges: number;
  avgResponseAfterRuleChangeMs: number | null;
  trackingAccuracyBySparkCount: Record<number, AccuracyBucket>;
  trackingAccuracyBySpeed: Record<SpeedTier, AccuracyBucket>;
  gameplayDurationMs: number;
};

export type GameRewards = {
  xp: number;
  coins: number;
  fistAchieved: boolean;
  badge: string | null;
  // +30 when this completion finishes Day 2 (Twin Current + Signal Watch).
  day2BonusXp: number;
};

export type GameOutcome = {
  ageBand: AgeBand;
  roundResults: RoundResult[]; // scored rounds only
  metrics: TwinCurrentMetrics;
  starsEarned: number;
  energyRemaining: number;
  rewards: GameRewards;
  accessoriesChosen: string[];
};

export type QuestContext = {
  day: number;
  region: string;
  questId: string;
};

export type Rect = { x: number; y: number; width: number; height: number };
