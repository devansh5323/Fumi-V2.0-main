import type { AgeBand, CargoSymbol, RoundPlan, RouteRule, SparkPlan } from "../types";
import { AGE_BAND_CONFIG, ALL_SYMBOLS, PRACTICE_ROUNDS, SCORED_ROUNDS, speedTierFor } from "../config";
import { createRng, randInt, shuffle, type Rng } from "./rng";
import { sampleStartPositions, simulateMotion } from "./motion";

function rampInt(min: number, max: number, index: number, total: number): number {
  const t = total > 1 ? index / (total - 1) : 0;
  return Math.round(min + (max - min) * t);
}

// Picks `switches` distinct scored-round indices (never round 0, at least 2
// rounds apart where possible) at which the rule flips.
function buildScoredRules(switches: number, rng: Rng): RouteRule[] {
  const switchAt = new Set<number>();
  let guard = 0;
  while (switchAt.size < switches && guard++ < 500) {
    const r = 1 + randInt(rng, SCORED_ROUNDS - 1);
    const tooClose = [...switchAt].some((s) => Math.abs(s - r) < 2) && guard < 400;
    if (!tooClose) switchAt.add(r);
  }
  const rules: RouteRule[] = [];
  let current: RouteRule = "match";
  for (let i = 0; i < SCORED_ROUNDS; i++) {
    if (switchAt.has(i)) current = current === "match" ? "swap" : "match";
    rules.push(current);
  }
  return rules;
}

type RoundSpec = {
  isPractice: boolean;
  label: string;
  sparkCount: number;
  targetCount: number;
  rule: RouteRule;
  speedPxPerSec: number;
  motionMs: number;
  selectMs: number;
  separation: number;
  crossingPull: number;
  shuffleGates: boolean;
};

function buildRound(roundIndex: number, spec: RoundSpec, prevRule: RouteRule | null, sessionSeed: string): RoundPlan {
  const rng = createRng(`${sessionSeed}-r${roundIndex}`);
  // A fresh pair (or trio) of the 8 design symbols each round.
  const categories: CargoSymbol[] = shuffle(ALL_SYMBOLS, rng).slice(0, spec.targetCount >= 3 ? 3 : 2);
  const gateOrder = spec.shuffleGates ? shuffle(categories, rng) : [...categories];

  // Balls start alternately in the left (even index) and right (odd index)
  // channel, and stay in their channel. Targets are taken alternately from
  // each side, so the glowing balls are always on opposite sides.
  const left = shuffle(Array.from({ length: spec.sparkCount }, (_, i) => i).filter((i) => i % 2 === 0), rng);
  const right = shuffle(Array.from({ length: spec.sparkCount }, (_, i) => i).filter((i) => i % 2 === 1), rng);
  const firstLeft = rng() < 0.5;
  const targetSlots = Array.from({ length: spec.targetCount }, (_, k) => ((k % 2 === 0) === firstLeft ? left : right)[Math.floor(k / 2)]);
  // Targets carry distinct symbols (one per gate); decoys carry random ones
  // from the same set, so a revealed symbol never proves a ball was a target.
  const targetCargo = shuffle(categories, rng).slice(0, spec.targetCount);

  const sparks: SparkPlan[] = Array.from({ length: spec.sparkCount }, (_, i) => {
    const t = targetSlots.indexOf(i);
    return {
      sparkId: `r${roundIndex}-s${i}`,
      isTarget: t !== -1,
      cargo: t !== -1 ? targetCargo[t] : categories[Math.floor(rng() * categories.length)],
    };
  });

  const start = sampleStartPositions(spec.sparkCount, rng);
  const motion = simulateMotion({
    start,
    targetIndices: targetSlots,
    speedPxPerSec: spec.speedPxPerSec,
    durationMs: spec.motionMs + spec.selectMs,
    separation: spec.separation,
    crossingPull: spec.crossingPull,
    rng,
  });

  return {
    roundIndex,
    isPractice: spec.isPractice,
    label: spec.label,
    sparks,
    targetCount: spec.targetCount,
    categories,
    gateOrder,
    rule: spec.rule,
    ruleChanged: prevRule !== null && prevRule !== spec.rule,
    speedPxPerSec: spec.speedPxPerSec,
    speedTier: speedTierFor(spec.speedPxPerSec),
    motionMs: spec.motionMs,
    selectMs: spec.selectMs,
    motion,
  };
}

// The whole session up front: 4 practice rounds then 16 scored rounds whose
// spark count, speed and motion time climb every round.
export function buildSession(ageBand: AgeBand, sessionSeed: string): RoundPlan[] {
  const cfg = AGE_BAND_CONFIG[ageBand];
  const scoredRules = buildScoredRules(cfg.ruleSwitches, createRng(`${sessionSeed}-rules`));

  const specs: RoundSpec[] = [
    ...PRACTICE_ROUNDS.map((p, i) => ({
      ...p,
      isPractice: true,
      label: `How to Play ${i + 1}/${PRACTICE_ROUNDS.length}`,
      separation: 1,
      crossingPull: 0,
      shuffleGates: false,
    })),
    ...Array.from({ length: SCORED_ROUNDS }, (_, i) => ({
      isPractice: false,
      label: `Round ${i + 1}/${SCORED_ROUNDS}`,
      sparkCount: rampInt(cfg.sparkCountRange[0], cfg.sparkCountRange[1], i, SCORED_ROUNDS),
      targetCount: cfg.threeTargetsFromRound !== null && i >= cfg.threeTargetsFromRound ? 3 : 2,
      rule: scoredRules[i],
      speedPxPerSec: rampInt(cfg.speedRange[0], cfg.speedRange[1], i, SCORED_ROUNDS),
      motionMs: rampInt(cfg.motionMsRange[0], cfg.motionMsRange[1], i, SCORED_ROUNDS),
      selectMs: rampInt(cfg.selectMsRange[0], cfg.selectMsRange[1], i, SCORED_ROUNDS),
      separation: cfg.separation,
      crossingPull: cfg.crossingPull,
      shuffleGates: cfg.shuffleGates,
    })),
  ];

  const rounds: RoundPlan[] = [];
  let prevRule: RouteRule | null = null;
  specs.forEach((spec, i) => {
    rounds.push(buildRound(i, spec, prevRule, sessionSeed));
    prevRule = spec.rule;
  });
  return rounds;
}
