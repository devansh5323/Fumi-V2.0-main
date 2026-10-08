import type { AgeBand, BlockPerformance, DecoyType, GameOutcome, GameRewards, SignalResult, SignalWatchMetrics, StageResult } from "../types";
import { REWARDS, SPEED_PHASES } from "../config";

function pct(num: number, den: number): number {
  return den === 0 ? 0 : Math.round((num / den) * 1000) / 10;
}

function avg(values: number[]): number | null {
  return values.length === 0 ? null : Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function summarise(signals: SignalResult[]) {
  const real = signals.filter((s) => s.type === "three-rings");
  const decoys = signals.filter((s) => s.type !== "three-rings");
  const hits = real.filter((s) => s.outcome === "hit");
  const tapped = decoys.filter((s) => s.outcome === "false-alarm");
  return { real, decoys, hits, tapped };
}

// Computed over SCORED blocks only — tutorial and practice are excluded.
export function computeMetrics(blocks: StageResult[], gameplayDurationMs: number): SignalWatchMetrics {
  const signals = blocks.flatMap((b) => b.signals);
  const stray = blocks.flatMap((b) => b.strayTaps);
  const { real, decoys, hits, tapped } = summarise(signals);

  const distractorsTappedByType: Record<DecoyType, number> = {
    "two-rings": 0,
    "one-ring": 0,
    sunlight: 0,
    bubbles: 0,
    "fish-splash": 0,
    leaves: 0,
    "blue-spark": 0,
  };
  for (const t of tapped) distractorsTappedByType[t.type as DecoyType] += 1;

  const performanceByBlock: BlockPerformance[] = SPEED_PHASES.map((ph, i) => {
    const sm = summarise(signals.filter((sig) => sig.phase === i + 1));
    return {
      block: i + 1,
      intervalMs: ph.intervalMs,
      realSignals: sm.real.length,
      detected: sm.hits.length,
      detectionAccuracyPct: pct(sm.hits.length, sm.real.length),
      distractors: sm.decoys.length,
      distractorsTapped: sm.tapped.length,
      rejectionAccuracyPct: pct(sm.decoys.length - sm.tapped.length, sm.decoys.length),
      avgResponseMs: avg(sm.hits.map((h) => h.reactionMs ?? 0)),
    };
  });

  return {
    totalRealSignals: real.length,
    realSignalsDetected: hits.length,
    detectionAccuracyPct: pct(hits.length, real.length),
    realSignalsMissed: real.length - hits.length,
    totalDistractors: decoys.length,
    distractorsTapped: tapped.length,
    distractorRejectionAccuracyPct: pct(decoys.length - tapped.length, decoys.length),
    avgResponseMs: avg(hits.map((h) => h.reactionMs ?? 0)),
    performanceByBlock,
    gameplayDurationMs,
    distractorsTappedByType,
    wrongTowerTaps: stray.filter((t) => t.kind === "wrong-tower").length,
    noSignalTaps: stray.filter((t) => t.kind === "no-signal").length,
  };
}

export function isFist(m: SignalWatchMetrics): boolean {
  return m.detectionAccuracyPct >= REWARDS.fistThresholdPct && m.distractorRejectionAccuracyPct >= REWARDS.fistThresholdPct;
}

// 3 stars = FIST; 2 = both accuracies average 75%+; otherwise 1 — finishing
// always earns at least one star.
function starsFor(m: SignalWatchMetrics): number {
  if (isFist(m)) return 3;
  return (m.detectionAccuracyPct + m.distractorRejectionAccuracyPct) / 2 >= 75 ? 2 : 1;
}

function computeRewards(m: SignalWatchMetrics, earnsDay2Bonus: boolean): GameRewards {
  const fistAchieved = isFist(m);
  return {
    xp: REWARDS.completionXp,
    coins: REWARDS.completionCoins + (fistAchieved ? REWARDS.fistBonusCoins : 0),
    fistAchieved,
    badge: fistAchieved ? REWARDS.fistBadge : null,
    collectible: REWARDS.collectible,
    day2BonusXp: earnsDay2Bonus ? REWARDS.day2BonusXp : 0,
  };
}

export function computeGameOutcome(ageBand: AgeBand, all: StageResult[], gameplayDurationMs: number, earnsDay2Bonus: boolean): GameOutcome {
  const stageResults = all.filter((s) => !s.isPractice);
  const metrics = computeMetrics(stageResults, gameplayDurationMs);
  return {
    ageBand,
    stageResults,
    metrics,
    starsEarned: starsFor(metrics),
    rewards: computeRewards(metrics, earnsDay2Bonus),
    accessoryChosen: null,
  };
}
