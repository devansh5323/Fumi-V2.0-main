export type AgeBand = "6-10" | "11-16";

// Lantern legend from the sheet: colour + symbol.
export type LanternCode = "AM" | "AD" | "AS" | "BM" | "BD" | "BS";

export type LanternInfo = {
  code: LanternCode;
  name: string; // e.g. "Amber Moon"
  colour: "amber" | "blue";
  symbol: "moon" | "diamond" | "star";
  src: string;
};

// One puzzle, parsed from the sheet. `grid[r][c]` is null at the "?" cell.
export type Puzzle = {
  id: number; // 1..10, the sheet's row
  grid: (LanternCode | null)[][];
  missing: { r: number; c: number };
  answer: LanternCode;
  options: LanternCode[]; // the sheet's Option 1..4, in order (shown as A..D)
};

export type AttemptRecord = {
  option: LanternCode;
  optionLetter: string; // "A".."D"
  correct: boolean;
  atMs: number; // since this puzzle became playable (pauses excluded)
};

export type PuzzleResult = {
  puzzle: number;
  answer: LanternCode;
  solved: boolean;
  attempts: AttemptRecord[];
  wrongAttempts: number;
  timeToSolveMs: number | null; // background only, never shown
};

export type SessionMetrics = {
  totalPuzzles: number;
  puzzlesSolved: number;
  incorrectAttempts: number;
  livesRemaining: number;
  firstTryCorrect: number; // puzzles solved with no wrong attempt
  accuracyPct: number; // correct drops / all drops
  // Background timing (never shown in the game): from the first puzzle
  // becoming playable until the tenth is solved, pauses excluded.
  completionDurationMs: number | null; // null unless all 10 were solved
  elapsedActiveMs: number; // time played so far (pauses excluded)
  elapsedWallMs: number; // wall-clock time, pauses included
};

export type SessionOutcome = {
  sessionId: string;
  status: "in-progress" | "completed" | "game-over";
  ageBand: AgeBand;
  startedAt: string; // ISO, when the first puzzle became playable
  puzzles: PuzzleResult[];
  metrics: SessionMetrics;
};
