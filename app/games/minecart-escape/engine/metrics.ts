import type { AgeBand, GameOutcome, RoundResult, WordSearchMetrics } from "../types";
import { REWARDS, ROUNDS } from "../config";

function pct(num: number, den: number): number {
  return den === 0 ? 0 : Math.round((num / den) * 1000) / 10;
}

// The last attempt at each round played, in round order.
export function lastAttempts(attempts: RoundResult[]): RoundResult[] {
  const byRound = new Map<number, RoundResult>();
  for (const a of attempts) byRound.set(a.round, a);
  return [...byRound.values()].sort((a, b) => a.round - b.round);
}

export function computeMetrics(attempts: RoundResult[]): WordSearchMetrics {
  const rounds = lastAttempts(attempts);
  const totalWords = ROUNDS.reduce((s, r) => s + r.words.length, 0);
  const totalWordsFound = rounds.reduce((s, r) => s + r.wordsFound, 0);
  // Time per found word: gaps between successive finds within each attempt.
  const perWord: number[] = [];
  for (const r of attempts) {
    let prev = 0;
    for (const f of [...r.found].sort((a, b) => a.foundAtMs - b.foundAtMs)) {
      perWord.push(f.foundAtMs - prev);
      prev = f.foundAtMs;
    }
  }
  return {
    roundsPlayed: rounds.length,
    attemptsPlayed: attempts.length,
    livesLost: attempts.filter((a) => !a.passed).length,
    totalWords,
    totalWordsFound,
    accuracyPct: pct(totalWordsFound, totalWords),
    invalidSelections: attempts.reduce((s, r) => s + r.invalidSelections, 0),
    repeatSelections: attempts.reduce((s, r) => s + r.repeatSelections, 0),
    roundsCleared: rounds.filter((r) => r.passed).length,
    roundsAllFound: rounds.filter((r) => r.end === "all-found").length,
    avgTimePerWordMs: perWord.length ? Math.round(perWord.reduce((a, b) => a + b, 0) / perWord.length) : null,
    totalTimeMs: attempts.reduce((s, r) => s + r.timeTakenMs, 0),
    byRound: rounds.map((r) => ({
      round: r.round,
      title: r.title,
      wordsFound: r.wordsFound,
      wordsTotal: r.wordsTotal,
      timeTakenMs: r.timeTakenMs,
      end: r.end,
      passed: r.passed,
      attempts: attempts.filter((a) => a.round === r.round).length,
    })),
  };
}

// 3 stars = FIST (90%+ of all words); 2 = 60%+; otherwise 1.
// `finished` is false while the game is still being played (saved after
// every round so a game left half-way is kept too).
export function computeGameOutcome(gameId: string, ageBand: AgeBand, attempts: RoundResult[], livesLeft: number, finished: boolean): GameOutcome {
  const metrics = computeMetrics(attempts);
  const completed = metrics.roundsCleared === ROUNDS.length;
  const fistAchieved = metrics.accuracyPct >= REWARDS.fistThresholdPct;
  return {
    gameId,
    status: !finished ? "in-progress" : completed ? "completed" : "out-of-lives",
    ageBand,
    rounds: attempts,
    completed,
    livesLeft,
    metrics,
    starsEarned: fistAchieved ? 3 : metrics.accuracyPct >= 60 ? 2 : 1,
    rewards: {
      xp: REWARDS.completionXp,
      coins: REWARDS.completionCoins + (fistAchieved ? REWARDS.fistBonusCoins : 0),
      fistAchieved,
      collectible: REWARDS.collectible,
      gems: REWARDS.gems,
    },
    accessoryChosen: null,
  };
}
