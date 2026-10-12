import type { AgeBand, RoundResult, SessionMetrics, SessionOutcome } from "../types";
import { MAIN_ROUNDS } from "../config";

export function computeMetrics(rounds: RoundResult[]): SessionMetrics {
  const main = rounds.filter((r) => !r.practice);
  const sum = (f: (r: RoundResult) => number) => main.reduce((s, r) => s + f(r), 0);
  return {
    roundsTotal: MAIN_ROUNDS.length,
    roundsCompleted: main.filter((r) => r.completed).length,
    practiceCompleted: rounds.some((r) => r.practice && r.completed),
    firstTryRounds: main.filter((r) => r.completed && r.failedFlows === 0).length,
    totalFlowAttempts: sum((r) => r.flowAttempts),
    totalFailedFlows: sum((r) => r.failedFlows),
    livesLost: sum((r) => r.failedFlows),
    totalInvalidDrops: sum((r) => r.invalidDrops),
    totalMoves: sum((r) => r.piecesPlaced + r.piecesReturned),
    totalTimeMs: sum((r) => r.timeMs),
  };
}

export function buildOutcome(a: { sessionId: string; status: SessionOutcome["status"]; ageBand: AgeBand; startedAt: string; rounds: RoundResult[] }): SessionOutcome {
  const rounds = [...a.rounds].sort((x, y) => x.round - y.round);
  return { sessionId: a.sessionId, status: a.status, ageBand: a.ageBand, startedAt: a.startedAt, rounds, metrics: computeMetrics(rounds) };
}
