export type AgeBand = "6-10" | "11-16";

// Every object the game can show (one supplied illustration each).
export type ObjectKind =
  | "mushroom-green"
  | "mushroom-purple"
  | "charm-moon"
  | "charm-sun"
  | "firefly-orange"
  | "firefly-yellow"
  | "firefly-blue"
  | "arrow-feathered"
  | "arrow-wooden"
  | "shell-spiral-orange"
  | "shell-spiral-blue"
  | "shell-ridged-orange"
  | "shell-smooth-yellow"
  | "mask-wooden"
  | "timer";

// One group of identical objects in a round. Facing / flip / drift are only
// used by the direction rounds (23-25); otherwise objects appear as drawn.
export type ObjectSpec = {
  kind: ObjectKind;
  count: number;
  facing?: "left" | "right"; // art faces right as drawn; "left" mirrors it
  upsideDown?: boolean; // e.g. a downward-facing mushroom
  drift?: "left" | "right"; // slowly moving objects
};

export type RoundSpec = {
  id: number; // 1..25, the sheet's row
  sheet: string; // the sheet's "Objects to include", for checking
  answer: string; // the sheet's "Odd one out"
  decoys: ObjectSpec[];
  odd: ObjectSpec; // count is always 1
};

export type Placed = ObjectSpec & { key: string; isOdd: boolean; x: number; y: number; size: number };

export type RoundRecord = {
  round: number;
  correct: boolean;
  timedOut: boolean; // no tap within the 4 s level time
  tapped: string; // what was tapped, e.g. "mushroom-purple" or "firefly-orange (left, drifting left)"
  responseMs: number; // round shown -> tap
  streakBefore: number;
  multiplier: number;
  points: number;
};

export type SessionMetrics = {
  roundsTotal: number; // 25
  roundsPlayed: number; // levels played (answered or missed)
  levelsCompleted: number; // same as roundsPlayed — levels the child got through
  correct: number;
  wrong: number; // wrong taps
  timedOut: number; // levels missed by running out of the 4 s
  accuracyPct: number;
  score: number;
  bestStreak: number;
  avgResponseMs: number | null;
  timeLimitMs: number;
  levelTimeMs: number;
  timeUsedMs: number; // pauses excluded
};

export type SessionOutcome = {
  sessionId: string;
  status: "in-progress" | "completed" | "time-up" | "exited"; // completed = all 25 rounds played
  ageBand: AgeBand;
  startedAt: string;
  rounds: RoundRecord[];
  metrics: SessionMetrics;
};
