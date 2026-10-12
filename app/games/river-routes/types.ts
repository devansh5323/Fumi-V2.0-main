export type AgeBand = "6-10" | "11-16";

// River pieces, written with the sheet's own symbols.
//  ─ horizontal   │ vertical   ┌ right+down   ┐ left+down   └ right+up   ┘ left+up
export type PieceSymbol = "─" | "│" | "┌" | "┐" | "└" | "┘";
export type Dir = "U" | "D" | "L" | "R";

// Board notation from the sheet: S start, E end, X boulder, . empty space.
export type CellKind = "S" | "E" | "X" | ".";
export type Cell = { r: number; c: number };

export type Round = {
  id: number; // 0 = guided practice, 1..5
  practice: boolean;
  size: number;
  board: CellKind[][];
  tray: PieceSymbol[]; // in the sheet's order
  solution: (PieceSymbol | null)[][]; // piece per empty cell in the solved board (null = decoy / fixed)
};

export type FlowCheck = {
  ok: boolean;
  path: Cell[]; // cells the water reached, from Start onwards
  // why it failed: the river stopped (gap / wrong turn), or it reached the
  // End without using every piece on the board
  failure: null | { kind: "stopped"; at: Cell; next: Cell | null } | { kind: "unused"; cells: Cell[] };
};

export type RoundResult = {
  round: number;
  practice: boolean;
  completed: boolean;
  piecesPlaced: number; // drops of a piece onto an empty space (incl. moves)
  piecesReturned: number; // pieces taken back to the tray
  invalidDrops: number; // drops on Start / End / boulders
  flowAttempts: number; // "Send Flow" presses
  failedFlows: number; // each one costs a life and restarts the level (rounds 1-5)
  livesLeft: number; // game lives left (3 for the whole game) when the round ended / so far
  timeMs: number; // background only, never shown; pauses excluded
  trayShown: string; // the tray order the child saw (shuffled for rounds 1-5), e.g. "│ ┐ └ ┐ └"
};

export type SessionMetrics = {
  roundsTotal: number; // 5 (practice not counted)
  roundsCompleted: number;
  practiceCompleted: boolean;
  firstTryRounds: number; // solved on the first Send Flow
  totalFlowAttempts: number;
  totalFailedFlows: number;
  livesLost: number; // wrong flows in rounds 1-5 (= lives lost)
  totalInvalidDrops: number;
  totalMoves: number;
  totalTimeMs: number; // rounds 1-5, background only
};

export type SessionOutcome = {
  sessionId: string;
  status: "in-progress" | "completed" | "game-over" | "exited"; // game-over = 3 wrong flows in the game
  ageBand: AgeBand;
  startedAt: string;
  rounds: RoundResult[];
  metrics: SessionMetrics;
};
