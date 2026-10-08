export type AgeBand = "6-10" | "11-16";

// The one real signal is "three-rings"; everything else is a scored decoy
// the child must withhold from tapping.
export type SignalType =
  | "three-rings"
  | "two-rings" // two-ring ripple — the most tempting near-target
  | "one-ring" // single-ring flash
  | "sunlight" // reflected sunlight glare
  | "bubbles"
  | "fish-splash"
  | "leaves" // leaf cluster
  | "blue-spark"; // harmless blue spark
export type DecoyType = Exclude<SignalType, "three-rings">;

export type TowerTheme = "blue" | "purple" | "gold";

export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; width: number; height: number };

export type TowerDef = {
  id: number;
  theme: TowerTheme;
  name: string;
  gem: Point; // centre of the gem on top of the tower, in play-area px
  base: Point; // where the tower meets the water
  hit: Rect; // tap target
};

export type SignalEvent = {
  eventId: string;
  stageIndex: number;
  isPractice: boolean;
  phase: number; // speed phase 1–4 (1150 / 900 / 750 / 600 ms between signals)
  tower: number;
  type: SignalType;
  startMs: number; // from stage start
  durationMs: number;
};

// One continuous stretch of watching: the practice run, or a scored
// vigilance block. The scene never stops between stages — a short banner
// announces each one.
export type StagePlan = {
  stageIndex: number;
  isPractice: boolean;
  blockNumber: number | null; // 1-based for scored blocks
  label: string; // "Round 1/3"
  banner: string;
  events: SignalEvent[];
  totalMs: number;
};

export type SignalOutcome = "hit" | "miss" | "false-alarm" | "correct-rejection";

export type SignalResult = {
  eventId: string;
  stageIndex: number;
  isPractice: boolean;
  phase: number;
  tower: number;
  type: SignalType;
  durationMs: number;
  outcome: SignalOutcome;
  reactionMs: number | null; // hits and false alarms only
};

// Taps that didn't land on a live signal on that tower.
export type StrayTapKind = "no-signal" | "wrong-tower";
export type StrayTap = { stageIndex: number; isPractice: boolean; tower: number; atMs: number; kind: StrayTapKind };

export type StageResult = {
  stageIndex: number;
  isPractice: boolean;
  blockNumber: number | null;
  signals: SignalResult[];
  strayTaps: StrayTap[];
};

// Performance per vigilance block — here, per speed phase of the run.
export type BlockPerformance = {
  block: number; // speed phase 1–4
  intervalMs: number;
  realSignals: number;
  detected: number;
  detectionAccuracyPct: number;
  distractors: number;
  distractorsTapped: number;
  rejectionAccuracyPct: number;
  avgResponseMs: number | null;
};

export type SignalWatchMetrics = {
  totalRealSignals: number;
  realSignalsDetected: number;
  detectionAccuracyPct: number;
  realSignalsMissed: number;
  totalDistractors: number;
  distractorsTapped: number;
  distractorRejectionAccuracyPct: number;
  avgResponseMs: number | null; // to real signals
  performanceByBlock: BlockPerformance[];
  gameplayDurationMs: number;
  // Supporting detail
  distractorsTappedByType: Record<DecoyType, number>;
  wrongTowerTaps: number;
  noSignalTaps: number;
};

export type GameRewards = {
  xp: number;
  coins: number;
  fistAchieved: boolean;
  badge: string | null;
  collectible: string;
  // +30 when this completion finishes Day 2 (Signal Watch + Twin Current).
  day2BonusXp: number;
};

export type GameOutcome = {
  ageBand: AgeBand;
  stageResults: StageResult[]; // scored blocks only
  metrics: SignalWatchMetrics;
  starsEarned: number;
  rewards: GameRewards;
  accessoryChosen: string | null;
};
