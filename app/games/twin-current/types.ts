export type AgeBand = "6-10" | "11-16";

// The design's symbol set. Every ball carries one (so a symbol never gives
// a target away); it's revealed only after the child selects the ball.
export type CargoSymbol = "sun" | "moon" | "leaf" | "star" | "drop" | "heart" | "bolt" | "swirl" | "mountain";

// "match": a spark goes through the gate showing its own emblem.
// "swap": every emblem is sent to the NEXT emblem in the round's list
// (with 2 emblems that's a plain swap; with 3 it's a rotation).
export type RouteRule = "match" | "swap";

export type SpeedTier = "slow" | "medium" | "fast";

export type Point = { x: number; y: number };

export type SparkPlan = {
  sparkId: string;
  isTarget: boolean;
  cargo: CargoSymbol; // every ball carries one; revealed on selection
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
  label: string; // "How to Play 1/4" | "Round 3/16"
  sparks: SparkPlan[];
  targetCount: number;
  categories: CargoSymbol[]; // gate emblems in this round
  gateOrder: CargoSymbol[]; // left -> right
  rule: RouteRule;
  ruleChanged: boolean; // differs from the previous round's rule
  speedPxPerSec: number;
  speedTier: SpeedTier;
  motionMs: number; // step 2: flowing before selection opens
  selectMs: number; // step 3: balls keep flowing while the child selects
  motion: MotionTrack; // covers motionMs + selectMs
};

export type PickOutcome = "correct-route" | "wrong-route" | "wrong-spark";

export type PickRecord = {
  sparkId: string;
  isTarget: boolean;
  cargo: CargoSymbol;
  gate: CargoSymbol | null; // null if never routed
  outcome: PickOutcome;
  // Selection: since the balls stopped / since the previous selection.
  atMs: number;
  sincePrevMs: number;
  // Routing: since the rule appeared (null if never routed).
  routedAtMs: number | null;
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
