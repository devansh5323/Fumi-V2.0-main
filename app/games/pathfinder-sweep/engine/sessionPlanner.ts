import type { AgeBand, CueType, SymbolId, TrialPlan } from "../types";
import { AGE_BAND_CONFIG, MAX_CONSECUTIVE_SAME_CUE, TOTAL_TRIALS, tierForTileCount } from "../config";
import { buildTileSet, pickTargetSymbol } from "./distractorFactory";
import { SYMBOL_LIBRARY } from "./symbolLibrary";
import { createRng, randInt, trialSeed, type Rng } from "./rng";

const CUE_TYPES: CueType[] = ["valid", "neutral", "invalid"];

// Constructs the sequence one slot at a time, always picking among the valid
// (non-run-violating, non-forbidden) candidates the one with the MOST
// remaining count — the standard greedy strategy for "no run longer than k"
// rearrangement problems: always depleting the most abundant type first is
// what prevents it from being forced into a long run later. Ties are broken
// with rng for variety.
function buildCueSequence(ageBand: AgeBand, rng: Rng): CueType[] {
  const cfg = AGE_BAND_CONFIG[ageBand];
  const remaining: Record<CueType, number> = { ...cfg.cueMix };
  const seq: CueType[] = [];
  let lastType: CueType | null = null;
  let runLen = 0;

  for (let i = 0; i < TOTAL_TRIALS; i++) {
    const forbidInvalid = i < cfg.suppressInvalidFirstN;

    let candidates = CUE_TYPES.filter((t) => remaining[t] > 0 && !(forbidInvalid && t === "invalid"));
    if (runLen >= MAX_CONSECUTIVE_SAME_CUE) {
      candidates = candidates.filter((t) => t !== lastType);
    }
    if (candidates.length === 0) candidates = CUE_TYPES.filter((t) => remaining[t] > 0);

    const maxRemaining = Math.max(...candidates.map((t) => remaining[t]));
    const tied = candidates.filter((t) => remaining[t] === maxRemaining);
    const pick = tied[randInt(rng, tied.length)];

    seq.push(pick);
    remaining[pick]--;
    if (pick === lastType) runLen++;
    else {
      lastType = pick;
      runLen = 1;
    }
  }

  return seq;
}

function buildTrial(
  trialIndex: number,
  tileCount: number,
  highSimilarityCount: number,
  cueType: CueType,
  sessionSeed: string,
  lastSymbol: SymbolId | undefined
): TrialPlan {
  const rng = createRng(trialSeed(sessionSeed, trialIndex));
  const targetSymbolId = pickTargetSymbol(rng, lastSymbol);
  const tier = tierForTileCount(tileCount);

  const tiles = buildTileSet(targetSymbolId, tileCount, highSimilarityCount, tier, rng, `t${trialIndex}`, SYMBOL_LIBRARY);

  return {
    trialIndex,
    tileCount,
    cueType,
    targetSymbolId,
    tiles,
  };
}

// Builds every trial for the entire session as one flat, continuous list —
// this is a single game, not a sequence of separate levels. Tile count and
// near-duplicate-distractor density both climb every single trial (see
// AGE_BAND_CONFIG's ramp arrays), so difficulty increases with every correct
// answer rather than in level-sized jumps.
export function buildAllTrials(ageBand: AgeBand, sessionSeed: string): TrialPlan[] {
  const cfg = AGE_BAND_CONFIG[ageBand];
  const cueSequence = buildCueSequence(ageBand, createRng(`${sessionSeed}-cues`));

  const trials: TrialPlan[] = [];
  let lastSymbol: SymbolId | undefined;

  for (let trialIndex = 0; trialIndex < TOTAL_TRIALS; trialIndex++) {
    const trial = buildTrial(
      trialIndex,
      cfg.tileCounts[trialIndex],
      cfg.highSimilarityCounts[trialIndex],
      cueSequence[trialIndex],
      sessionSeed,
      lastSymbol
    );
    lastSymbol = trial.targetSymbolId;
    trials.push(trial);
  }

  return trials;
}
