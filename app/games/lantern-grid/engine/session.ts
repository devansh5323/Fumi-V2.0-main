import type { AgeBand, PuzzleResult, SessionMetrics, SessionOutcome } from "../types";
import { PUZZLES } from "../config";

export function computeMetrics(puzzles: PuzzleResult[], livesRemaining: number, elapsedActiveMs: number, elapsedWallMs: number): SessionMetrics {
  const puzzlesSolved = puzzles.filter((p) => p.solved).length;
  const drops = puzzles.reduce((s, p) => s + p.attempts.length, 0);
  const incorrectAttempts = puzzles.reduce((s, p) => s + p.wrongAttempts, 0);
  // attempt.atMs is measured from the puzzle appearing, so each response
  // time is the gap since the previous drop on that puzzle.
  const responseTimes = puzzles.flatMap((p) => p.attempts.map((a, i) => a.atMs - (i > 0 ? p.attempts[i - 1].atMs : 0)));
  return {
    totalPuzzles: PUZZLES.length,
    puzzlesAttempted: puzzles.filter((p) => p.attempts.length > 0).length,
    puzzlesSolved,
    incorrectAttempts,
    avgResponseTimeMs: responseTimes.length ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null,
    livesRemaining,
    firstTryCorrect: puzzles.filter((p) => p.solved && p.wrongAttempts === 0).length,
    accuracyPct: drops === 0 ? 0 : Math.round(((drops - incorrectAttempts) / drops) * 1000) / 10,
    completionDurationMs: puzzlesSolved === PUZZLES.length ? Math.round(elapsedActiveMs) : null,
    elapsedActiveMs: Math.round(elapsedActiveMs),
    elapsedWallMs: Math.round(elapsedWallMs),
  };
}

export function buildOutcome(args: {
  sessionId: string;
  status: SessionOutcome["status"];
  ageBand: AgeBand;
  startedAt: string;
  puzzles: PuzzleResult[];
  livesRemaining: number;
  elapsedActiveMs: number;
  elapsedWallMs: number;
}): SessionOutcome {
  return {
    sessionId: args.sessionId,
    status: args.status,
    ageBand: args.ageBand,
    startedAt: args.startedAt,
    puzzles: args.puzzles,
    metrics: computeMetrics(args.puzzles, args.livesRemaining, args.elapsedActiveMs, args.elapsedWallMs),
  };
}
