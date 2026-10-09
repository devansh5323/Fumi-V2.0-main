import type { RoundSpec } from "./types";

// ---------------------------------------------------------------------------
// Round content — from the design spreadsheet (Theme / Words to include /
// Grid Size / Time). Edit here to change a round; nothing else needs to
// change. Grid sizes and times follow the brief: Round 1 12×12, Rounds 2–3
// 13×13, three minutes each.
// ---------------------------------------------------------------------------

export const ROUNDS: RoundSpec[] = [
  {
    round: 1,
    title: "Mining Tools",
    description: "Things miners use to work & stay safe.",
    words: ["Pickaxe", "Helmet", "Lantern", "Rope", "Drill", "Wrench", "Hammer", "Boots", "Shovel", "Compass"],
    gridSize: 12,
    timeLimitMs: 3 * 60 * 1000,
  },
  {
    round: 2,
    title: "Rocks & Minerals",
    description: "Things you discover inside a mine",
    words: ["Crystal", "Quartz", "Copper", "Fossil", "Coal", "Gravel", "Boulder", "Mineral", "Stones", "Diamonds"],
    gridSize: 13,
    timeLimitMs: 3 * 60 * 1000,
  },
  {
    round: 3,
    title: "Escape Route",
    description: "Things that guide your way out",
    words: ["Bridge", "Tunnel", "Track", "Switch", "Signal", "Ladder", "Passage", "Ramp", "Shaft", "Cart"],
    gridSize: 13,
    timeLimitMs: 3 * 60 * 1000,
  },
];

// From the sheet's "Instruction" note — shown before every round.
export const INSTRUCTION = "Find the hidden words in the grid to clear the mine track";
// From the sheet: "At the end of every round Fumi can come say — Track Cleared!"
export const ROUND_END_LINE = "Track Cleared!";
// What Fumi says after each round.
export function foundLine(found: number): string {
  return `You found ${found} word${found === 1 ? "" : "s"}!`;
}
export const TRY_AGAIN_LINE = "Try Again";
export const OUT_OF_LIVES_LINE = "Out of lives!";

// A round is cleared with at least this many words; fewer costs a life and
// the round is replayed (same words, freshly shuffled grid).
export const PASS_WORDS = 5;
// Lives for the whole game; losing the last one ends the game.
export const LIVES = 3;

// ---------------------------------------------------------------------------
// Rewards (unchanged from the Minecart Escape brief)
// ---------------------------------------------------------------------------

export const REWARDS = {
  completionXp: 100,
  completionCoins: 25,
  fistBonusCoins: 5,
  // FIST = at least this share of all 30 words found.
  fistThresholdPct: 90,
  collectible: "Gems",
  gems: 15,
  accessoryChoices: ["Mine Helmet", "Tunnel Cape", "Rail Goggles"],
} as const;

// ---------------------------------------------------------------------------
// Look & layout — fixed 390x700 design surface, same as every FUMI game
// ---------------------------------------------------------------------------

export const PLAY_AREA = { width: 390, height: 700 };
export const SAFE_AREA_TOP = 44;

// Highlight colours for found words (vivid, white text readable on each).
export const WORD_COLORS = ["#2fa84f", "#7b3fc9", "#1f6fd1", "#e2701b", "#d63c79", "#0f9c94", "#c9442e", "#b58a12", "#4b54d1", "#5e9e1a"];

export const LOADING_MS = 650; // "Building the mine…" before each grid

const A = "/games/minecart-escape";
export const ASSETS = {
  fumi: `${A}/mascot/fumi.png`,
  titlePlank: `${A}/ui/title-plank.png`,
  pause: `${A}/ui/pause.png`,
  lantern: `${A}/ui/lantern.png`,
  lantern2: `${A}/ui/lantern-2.png`,
  crystalLeft: `${A}/ui/crystal-left.png`,
  crystalRight: `${A}/ui/crystal-right.png`,
  crystalSmall: `${A}/ui/crystal-small.png`,
};
