import type { AccuracyBucket, AgeBand, GameOutcome, GameRewards, RoundResult, SpeedTier, TwinCurrentMetrics } from "../types";
import { REWARDS } from "../config";

function pct(num: number, den: number): number {
  return den === 0 ? 0 : Math.round((num / den) * 1000) / 10;
}

function avg(values: number[]): number | null {
  return values.length === 0 ? null : Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function bucket(presented: number, identified: number): AccuracyBucket {
  return { presented, identified, accuracyPct: pct(identified, presented) };
}

// Every metric is computed over SCORED rounds only — practice is excluded.
export function computeMetrics(scored: RoundResult[], gameplayDurationMs: number): TwinCurrentMetrics {
  const totalTargetsPresented = scored.reduce((s, r) => s + r.targetCount, 0);
  const correctTargetsIdentified = scored.reduce((s, r) => s + r.correctTargets, 0);
  const correctGateRoutes = scored.reduce((s, r) => s + r.correctRoutes, 0);
  const wrongGateRoutes = scored.reduce((s, r) => s + r.wrongRoutes, 0);

  const identificationTimes = scored.flatMap((r) => r.picks.filter((p) => p.isTarget).map((p) => p.sincePrevMs));
  const ruleChangeRounds = scored.filter((r) => r.ruleChanged);

  const bySparkCount: Record<number, AccuracyBucket> = {};
  for (const r of scored) {
    const prev = bySparkCount[r.sparkCount] ?? bucket(0, 0);
    bySparkCount[r.sparkCount] = bucket(prev.presented + r.targetCount, prev.identified + r.correctTargets);
  }

  const bySpeed: Record<SpeedTier, AccuracyBucket> = { slow: bucket(0, 0), medium: bucket(0, 0), fast: bucket(0, 0) };
  for (const r of scored) {
    const prev = bySpeed[r.speedTier];
    bySpeed[r.speedTier] = bucket(prev.presented + r.targetCount, prev.identified + r.correctTargets);
  }

  return {
    totalTargetsPresented,
    correctTargetsIdentified,
    trackingAccuracyPct: pct(correctTargetsIdentified, totalTargetsPresented),
    wrongSparksSelected: scored.reduce((s, r) => s + r.wrongSparks, 0),
    targetsMissed: scored.reduce((s, r) => s + r.missedTargets, 0),
    avgTargetIdentificationMs: avg(identificationTimes),
    correctGateRoutes,
    // Of the targets correctly identified, how many went through the right gate.
    gateRoutingAccuracyPct: pct(correctGateRoutes, correctGateRoutes + wrongGateRoutes),
    wrongGateRoutes,
    totalRuleChanges: ruleChangeRounds.length,
    avgResponseAfterRuleChangeMs: avg(ruleChangeRounds.map((r) => r.firstResponseMs).filter((v): v is number => v !== null)),
    trackingAccuracyBySparkCount: bySparkCount,
    trackingAccuracyBySpeed: bySpeed,
    gameplayDurationMs,
  };
}

export function isFist(metrics: TwinCurrentMetrics): boolean {
  return metrics.trackingAccuracyPct >= REWARDS.fistThresholdPct && metrics.gateRoutingAccuracyPct >= REWARDS.fistThresholdPct;
}

// 3 stars = FIST; 2 = the two accuracies average 70%+; otherwise 1 — finishing
// always earns at least one star.
function starsFor(metrics: TwinCurrentMetrics): number {
  if (isFist(metrics)) return 3;
  return (metrics.trackingAccuracyPct + metrics.gateRoutingAccuracyPct) / 2 >= 70 ? 2 : 1;
}

function computeRewards(metrics: TwinCurrentMetrics, earnsDay2Bonus: boolean): GameRewards {
  const fistAchieved = isFist(metrics);
  return {
    xp: REWARDS.completionXp,
    coins: REWARDS.completionCoins + (fistAchieved ? REWARDS.fistBonusCoins : 0),
    fistAchieved,
    badge: fistAchieved ? REWARDS.fistBadge : null,
    day2BonusXp: earnsDay2Bonus ? REWARDS.day2BonusXp : 0,
  };
}

export function computeGameOutcome(
  ageBand: AgeBand,
  allResults: RoundResult[],
  gameplayDurationMs: number,
  energyRemaining: number,
  earnsDay2Bonus: boolean
): GameOutcome {
  const roundResults = allResults.filter((r) => !r.isPractice);
  const metrics = computeMetrics(roundResults, gameplayDurationMs);
  return {
    ageBand,
    roundResults,
    metrics,
    starsEarned: starsFor(metrics),
    energyRemaining,
    rewards: computeRewards(metrics, earnsDay2Bonus),
    accessoriesChosen: [],
  };
}
