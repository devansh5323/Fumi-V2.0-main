import type { AgeBand, GameOutcome, RoundResult, WordSearchMetrics } from "../types";
import { REWARDS } from "../config";

function pct(num: number, den: number): number {
  return den === 0 ? 0 : Math.round((num / den) * 1000) / 10;
}

export function computeMetrics(rounds: RoundResult[]): WordSearchMetrics {
  const totalWords = rounds.reduce((s, r) => s + r.wordsTotal, 0);
  const totalWordsFound = rounds.reduce((s, r) => s + r.wordsFound, 0);
  // Time per found word: gaps between successive finds within each round.
  const perWord: number[] = [];
  for (const r of rounds) {
    let prev = 0;
    for (const f of [...r.found].sort((a, b) => a.foundAtMs - b.foundAtMs)) {
      perWord.push(f.foundAtMs - prev);
      prev = f.foundAtMs;
    }
  }
  return {
    roundsPlayed: rounds.length,
    totalWords,
    totalWordsFound,
    accuracyPct: pct(totalWordsFound, totalWords),
    invalidSelections: rounds.reduce((s, r) => s + r.invalidSelections, 0),
    repeatSelections: rounds.reduce((s, r) => s + r.repeatSelections, 0),
    roundsCleared: rounds.filter((r) => r.end === "all-found").length,
    avgTimePerWordMs: perWord.length ? Math.round(perWord.reduce((a, b) => a + b, 0) / perWord.length) : null,
    totalTimeMs: rounds.reduce((s, r) => s + r.timeTakenMs, 0),
    byRound: rounds.map((r) => ({ round: r.round, title: r.title, wordsFound: r.wordsFound, wordsTotal: r.wordsTotal, timeTakenMs: r.timeTakenMs, end: r.end })),
  };
}

// 3 stars = FIST (90%+ of all words); 2 = 60%+; otherwise 1.
export function computeGameOutcome(ageBand: AgeBand, rounds: RoundResult[]): GameOutcome {
  const metrics = computeMetrics(rounds);
  const fistAchieved = metrics.accuracyPct >= REWARDS.fistThresholdPct;
  return {
    ageBand,
    rounds,
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
