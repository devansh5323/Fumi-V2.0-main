import type { AgeBand, CueType, DistractorKind, QuestContext } from "./types";

// The 5 global difficulty tiers every trial's tile count maps onto. Distractor
// kind pools / magnitudes / high-similarity counts are indexed by TIER, not by
// a trial's position in the stage schedule below — "how hard is a 12-tile
// trial" is defined once, independent of when the session reaches it.
export const TIER_TILE_COUNTS = [8, 10, 12, 14, 16] as const;

export function tierForTileCount(tileCount: number): number {
  const idx = TIER_TILE_COUNTS.indexOf(tileCount as (typeof TIER_TILE_COUNTS)[number]);
  return idx === -1 ? TIER_TILE_COUNTS.length - 1 : idx;
}

// This is one continuous game, not a set of separate levels — difficulty
// ramps smoothly trial-by-trial (see buildTileCounts/buildHighSimilarityCounts
// below), never in level/mission-sized jumps.
export const TOTAL_TRIALS = 21;

// The whole game is played against a single 3-minute clock rather than a
// lives/hearts budget — wrong taps cost no hearts, but time keeps running.
export const GAME_TIME_LIMIT_MS = 3 * 60 * 1000;

function rampInt(min: number, max: number, index: number, total: number): number {
  const t = total > 1 ? index / (total - 1) : 0;
  return Math.round(min + (max - min) * t);
}

// Tile count and near-duplicate-distractor count both climb every single
// trial (not in per-stage jumps) — every correct answer hands back a
// slightly denser, slightly more deceptive board. highSimilarityCount is
// clamped to tileCount-1 downstream since it can never exceed the number of
// non-target tiles available.
const TILE_COUNT_RANGE: Record<AgeBand, [number, number]> = {
  "6-10": [7, 18],
  "11-16": [9, 22],
};

const HIGH_SIMILARITY_RANGE: Record<AgeBand, [number, number]> = {
  "6-10": [1, 9],
  "11-16": [3, 12],
};

function buildTileCounts(ageBand: AgeBand): number[] {
  const [min, max] = TILE_COUNT_RANGE[ageBand];
  return Array.from({ length: TOTAL_TRIALS }, (_, i) => rampInt(min, max, i, TOTAL_TRIALS));
}

function buildHighSimilarityCounts(ageBand: AgeBand, tileCounts: number[]): number[] {
  const [min, max] = HIGH_SIMILARITY_RANGE[ageBand];
  return tileCounts.map((tileCount, i) => Math.min(tileCount - 1, rampInt(min, max, i, TOTAL_TRIALS)));
}

export type TrialAgeConfig = {
  previewMs: number;
  tileCounts: number[]; // length TOTAL_TRIALS, monotonically increasing
  highSimilarityCounts: number[]; // length TOTAL_TRIALS, monotonically increasing
  targetEccentricityBias: number;
  cueMix: Record<CueType, number>; // must sum to TOTAL_TRIALS
  suppressInvalidFirstN: number;
};

const SIX_TO_TEN_TILE_COUNTS = buildTileCounts("6-10");
const ELEVEN_TO_SIXTEEN_TILE_COUNTS = buildTileCounts("11-16");

export const AGE_BAND_CONFIG: Record<AgeBand, TrialAgeConfig> = {
  "6-10": {
    previewMs: 650,
    tileCounts: SIX_TO_TEN_TILE_COUNTS,
    highSimilarityCounts: buildHighSimilarityCounts("6-10", SIX_TO_TEN_TILE_COUNTS),
    targetEccentricityBias: 0,
    cueMix: { valid: 11, neutral: 5, invalid: 5 },
    suppressInvalidFirstN: 4,
  },
  "11-16": {
    previewMs: 500,
    tileCounts: ELEVEN_TO_SIXTEEN_TILE_COUNTS,
    highSimilarityCounts: buildHighSimilarityCounts("11-16", ELEVEN_TO_SIXTEEN_TILE_COUNTS),
    targetEccentricityBias: 0.55,
    cueMix: { valid: 8, neutral: 6, invalid: 7 },
    suppressInvalidFirstN: 0,
  },
};

export const MAX_CONSECUTIVE_SAME_CUE = 3;

// Snappier across the board — the old timings spent ~2.7s of fixed animation
// per trial before/after the actual search, which across 21 trials ate a
// third of the 3-minute clock on waiting rather than playing.
export const TIMING = {
  shrinkMs: 220,
  cueMs: 150,
  trialFeedbackMs: 320,
  transitionMs: 260,
} as const;

export const KIND_POOL_BY_TIER: DistractorKind[][] = [
  ["mirror", "rotate"],
  ["mirror", "rotate", "mark-removed"],
  ["mirror", "rotate", "mark-removed", "mark-duplicated"],
  ["mirror", "rotate", "mark-removed", "mark-duplicated", "mark-shifted"],
  ["mirror", "rotate", "mark-removed", "mark-duplicated", "mark-shifted"],
];

export type DistractorMagnitude = {
  rotateDeg: [number, number];
  shiftDeg: [number, number];
};

export const MAGNITUDE_BY_TIER: DistractorMagnitude[] = [
  { rotateDeg: [35, 55], shiftDeg: [30, 45] },
  { rotateDeg: [28, 45], shiftDeg: [24, 38] },
  { rotateDeg: [22, 38], shiftDeg: [18, 30] },
  { rotateDeg: [16, 28], shiftDeg: [14, 24] },
  { rotateDeg: [12, 20], shiftDeg: [10, 18] },
];

export const MIN_TILE_SIZE_PX = 56;
export const MAX_TILE_SIZE_PX = 72;

// Fixed mobile-first design surface. Positions/reserved zones are hardcoded
// against this rather than measured at runtime.
export const PLAY_AREA = { width: 390, height: 700 };

// Clears the PhoneFrame's dynamic-island notch (top:10, height:26) so no
// interactive chrome ever renders underneath it.
export const SAFE_AREA_TOP = 44;

export const TOP_BAR_HEIGHT = 56;
export const EXIT_BUTTON_ZONE = { x: 0, y: SAFE_AREA_TOP, width: 64, height: TOP_BAR_HEIGHT };
export const REFERENCE_BADGE_PINNED = { top: SAFE_AREA_TOP, size: 64 };
export const REFERENCE_BADGE_PINNED_ZONE = {
  x: PLAY_AREA.width - REFERENCE_BADGE_PINNED.size - 14,
  y: REFERENCE_BADGE_PINNED.top,
  width: REFERENCE_BADGE_PINNED.size,
  height: REFERENCE_BADGE_PINNED.size,
};
export const REFERENCE_BADGE_PREVIEW_SIZE = 136;

// HUD strip footprint (hearts + gem counter + pause) — reserved so tiles
// never scatter underneath the top chrome.
export const HUD_ZONE = { x: 0, y: SAFE_AREA_TOP, width: PLAY_AREA.width, height: TOP_BAR_HEIGHT };

// Bottom-center feedback toast + rule-reminder footprint — reserved so tiles
// never scatter underneath them.
export const FEEDBACK_TOAST_ZONE = {
  x: PLAY_AREA.width / 2 - 140,
  y: PLAY_AREA.height - 100,
  width: 280,
  height: 100,
};

export const CONSECUTIVE_ERROR_REMINDER_THRESHOLD = 3;

export const CHILD_RULE_TEXT =
  "Look at the marker at the top. Find the one that matches it exactly. Same shape, same direction, same details. Tap it as soon as you find it.";

export const NARRATION_TEXT = "Tap the correct tile to clear each trial.";

export const DEFAULT_QUEST: QuestContext = {
  day: 1,
  region: "Greenwood",
  city: "Fernhaven",
  questId: "the-lost-trail",
  part: "A",
};
