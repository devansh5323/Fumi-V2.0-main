import type { GameOutcome, TrialResult } from "../types";
import { GAME_TIME_LIMIT_MS, TOTAL_TRIALS } from "../config";

// Stars are a forgiving rating signal, not a hard fail condition. Finishing
// every trial is graded on how much of the 3-minute clock was left to
// spare; running out of the clock before finishing is graded on how much
// progress was made — either way the worst outcome is still 1 star, never
// 0, so the game always feels finishable rather than punitive.
function starsForRun(correctMatches: number, timeTakenMs: number, timedOut: boolean): number {
  if (!timedOut) {
    const remainingRatio = 1 - timeTakenMs / GAME_TIME_LIMIT_MS;
    if (remainingRatio >= 0.4) return 3;
    if (remainingRatio >= 0.15) return 2;
    return 1;
  }
  const progressRatio = correctMatches / TOTAL_TRIALS;
  return progressRatio >= 0.7 ? 2 : 1;
}

export function computeGameOutcome(trialResults: TrialResult[], timedOut: boolean, startedAt: number, endedAt: number): GameOutcome {
  const correctMatches = trialResults.length;
  const incorrectTaps = trialResults.reduce((sum, t) => sum + t.incorrectTaps, 0);
  const tilesScanned = correctMatches + incorrectTaps;
  const timeTakenMs = endedAt - startedAt;

  return {
    trialResults,
    timedOut,
    starsEarned: starsForRun(correctMatches, timeTakenMs, timedOut),
    timeTakenMs,
    tilesScanned,
    correctMatches,
  };
}
