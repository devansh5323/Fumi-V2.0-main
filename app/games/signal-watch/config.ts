import type { AgeBand, DecoyType, SignalType, TowerDef, TowerTheme } from "./types";

// ---------------------------------------------------------------------------
// Session shape
// ---------------------------------------------------------------------------

// One continuous run of 100 signals: 70 real three-ring signals and 30
// decoys, in a shuffled order. Signals appear one at a time on a tower
// (never the same tower twice in a row), and speed up in four phases.
export const TOTAL_SIGNALS = 100;
export const REAL_SIGNALS = 70;
export const DECOY_SIGNALS = TOTAL_SIGNALS - REAL_SIGNALS;

// Each signal stays visible until this long before the next one appears.
export const SIGNAL_GAP_MS = 150;

export type SpeedPhase = {
  firstSignal: number; // 1-based, inclusive
  lastSignal: number;
  intervalMs: number; // onset-to-onset: a new signal every intervalMs
};

export const SPEED_PHASES: SpeedPhase[] = [
  { firstSignal: 1, lastSignal: 20, intervalMs: 1150 },
  { firstSignal: 21, lastSignal: 50, intervalMs: 900 },
  { firstSignal: 51, lastSignal: 75, intervalMs: 750 },
  { firstSignal: 76, lastSignal: 100, intervalMs: 600 },
];

// Decoys get more target-like as the run speeds up: early phases lean on
// obviously different decoys, later ones on one/two-ring pulses.
const EASY: Record<DecoyType, number> = { "two-rings": 1, "one-ring": 2, sunlight: 3, bubbles: 3, "fish-splash": 3, leaves: 3, "blue-spark": 2 };
const MID: Record<DecoyType, number> = { "two-rings": 3, "one-ring": 3, sunlight: 2, bubbles: 2, "fish-splash": 2, leaves: 2, "blue-spark": 2 };
const HARD: Record<DecoyType, number> = { "two-rings": 6, "one-ring": 4, sunlight: 1, bubbles: 1, "fish-splash": 1, leaves: 1, "blue-spark": 2 };

export type AgeBandConfig = {
  // Decoy mix for each speed phase (same order as SPEED_PHASES).
  decoyWeightsByPhase: Record<DecoyType, number>[];
  // Unscored background motion (fish, leaves, bubbles, ripples).
  riverActivity: "normal" | "high";
};

export const AGE_BAND_CONFIG: Record<AgeBand, AgeBandConfig> = {
  "6-10": { riverActivity: "normal", decoyWeightsByPhase: [EASY, EASY, MID, MID] },
  "11-16": { riverActivity: "high", decoyWeightsByPhase: [MID, HARD, HARD, HARD] },
};

export const STAGE_LEAD_IN_MS = 1500; // quiet moment before signal 1
export const STAGE_TAIL_MS = 1200;

// A tap shortly after a signal disappears still counts for that signal
// (kept short so it never reaches into the next signal at top speed).
export const RESPONSE_GRACE_MS = 150;

// Tutorial: Fumi labels three examples before the real game.
export type TutorialStep = { type: SignalType; tower: number; label: string; caption: string; waitForTap: boolean };
export const TUTORIAL_STEPS: TutorialStep[] = [
  { type: "two-rings", tower: 0, label: "Ignore", caption: "See this ripple? It's a decoy — ignore it.", waitForTap: false },
  { type: "one-ring", tower: 2, label: "Ignore", caption: "A single flash — ignore that too.", waitForTap: false },
  { type: "three-rings", tower: 1, label: "That's it — tap!", caption: "Three rings! That's the real signal. Tap the tower!", waitForTap: true },
];
export const TUTORIAL_DEMO_MS = 2800;


// ---------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------

export const REWARDS = {
  completionXp: 100,
  completionCoins: 25,
  fistBonusCoins: 5,
  fistBadge: "Hunter Badge",
  // FIST = real-signal detection and decoy rejection both at or above this.
  fistThresholdPct: 90,
  collectible: "River Stone",
  // Awarded once, when both Day 2 games (this + Twin Current) are complete.
  day2BonusXp: 30,
  accessoryChoices: ["Signal Goggles", "River Cape", "Pulse Charm"],
} as const;

// ---------------------------------------------------------------------------
// Layout — fixed 390x700 design surface, same as every FUMI game
// ---------------------------------------------------------------------------

export const PLAY_AREA = { width: 390, height: 700 };
export const SAFE_AREA_TOP = 44;
export const HUD_HEIGHT = 52;

export const ASSETS = {
  // Built from the design mockup (Real-ESRGAN upscaled): the river scene
  // with the towers, above a plain gradient sky.
  background: "/games/signal-watch/backgrounds/river-towers.jpg",
  // Alpha masks (same size as the background) marking waterfall and river
  // pixels, so the flow animations only ever cover water.
  fallsMask: "/games/signal-watch/backgrounds/falls-mask.png",
  riverMask: "/games/signal-watch/backgrounds/river-mask.png",
  titleSign: "/games/signal-watch/ui/title-sign.png",
  riverStone: "/games/signal-watch/collectibles/river-stone.png",
  fumi: "/games/signal-watch/mascot/fumi.png",
} as const;

export const THEME_COLOR: Record<TowerTheme, { core: string; glow: string; light: string }> = {
  blue: { core: "#3d8bff", glow: "rgba(61,139,255,0.85)", light: "#bfe0ff" },
  purple: { core: "#d35cff", glow: "rgba(211,92,255,0.85)", light: "#f3c9ff" },
  gold: { core: "#ffb52e", glow: "rgba(255,181,46,0.85)", light: "#ffe7a8" },
};

// Gem/base positions are measured off the background image — if that image
// changes, re-measure these.
export const TOWERS: TowerDef[] = [
  { id: 0, theme: "blue", name: "Wave tower", gem: { x: 64, y: 416 }, base: { x: 62, y: 548 }, hit: { x: 14, y: 335, width: 100, height: 222 } },
  { id: 1, theme: "purple", name: "Feather tower", gem: { x: 195, y: 419 }, base: { x: 195, y: 550 }, hit: { x: 145, y: 335, width: 100, height: 222 } },
  { id: 2, theme: "gold", name: "Sun tower", gem: { x: 320, y: 418 }, base: { x: 322, y: 548 }, hit: { x: 272, y: 335, width: 100, height: 222 } },
];

// Where Fumi floats: in the sky, above the middle tower.
export const FUMI_PERCH = { x: 195, y: 262 };

// What Fumi says when Play is tapped, before the tutorial starts.
export const TUTORIAL_GREETING = "Let's learn how to spot the real signal — watch the towers with me!";
// What Fumi says after the tutorial, as the real game begins.
export const REAL_GAME_GREETING = "You've got it! Now let's play the real game — tap only the three-ring signal!";
// How long the fully typed greeting stays up before Fumi leaves.
export const GREETING_HOLD_MS = 1300;

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

export const START_CARD_TEXT = "Watch the towers and tap the one with three rings!";

export const NARRATION_TEXT =
  "The river's still carrying energy, but the real signals are buried under all this noise. Watch the relay towers. When you see the three-ring pulse, tap that tower. Ripples and flashes don't matter.";

export const CHILD_RULE_TEXT =
  "Watch all three towers. Tap only the real three-ring signal. Two-ring pulses, flashes and ripples are decoys — do not tap them.";

export const SCORED_CAPTION = "Tap only the three-ring signal!";
