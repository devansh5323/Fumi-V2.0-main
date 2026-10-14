import type { AgeBand, RoundRecord, SessionMetrics, SessionOutcome } from "../types";
import { LEVEL_TIME_MS, ROUNDS, TIME_LIMIT_MS } from "../config";

export function computeMetrics(rounds: RoundRecord[], timeUsedMs: number): SessionMetrics {
  const correct = rounds.filter((r) => r.correct).length;
  let best = 0;
  let run = 0;
  for (const r of rounds) {
    run = r.correct ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return {
    roundsTotal: ROUNDS.length,
    roundsPlayed: rounds.length,
    levelsCompleted: rounds.length,
    correct,
    wrong: rounds.filter((r) => !r.correct && !r.timedOut).length,
    timedOut: rounds.filter((r) => r.timedOut).length,
    accuracyPct: rounds.length ? Math.round((correct / rounds.length) * 1000) / 10 : 0,
    score: rounds.reduce((s, r) => s + r.points, 0),
    bestStreak: best,
    avgResponseMs: rounds.length ? Math.round(rounds.reduce((s, r) => s + r.responseMs, 0) / rounds.length) : null,
    timeLimitMs: TIME_LIMIT_MS,
    levelTimeMs: LEVEL_TIME_MS,
    timeUsedMs: Math.round(Math.min(timeUsedMs, TIME_LIMIT_MS)),
  };
}

export function buildOutcome(a: { sessionId: string; status: SessionOutcome["status"]; ageBand: AgeBand; startedAt: string; rounds: RoundRecord[]; timeUsedMs: number }): SessionOutcome {
  return { sessionId: a.sessionId, status: a.status, ageBand: a.ageBand, startedAt: a.startedAt, rounds: a.rounds, metrics: computeMetrics(a.rounds, a.timeUsedMs) };
}
