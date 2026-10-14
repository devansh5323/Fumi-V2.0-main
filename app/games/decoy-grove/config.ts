import type { ObjectKind, ObjectSpec, RoundSpec } from "./types";

// ---------------------------------------------------------------------------
// Rounds — exactly as in the Decoy Grove sheet ("Objects to include" /
// "Odd one out"). Each round is checked on load (see bottom of file).
// Sheet "green mushroom" = the teal mushroom illustration; "smooth shell" =
// the yellow smooth shell; "timer" = the hourglass.
// ---------------------------------------------------------------------------

const o = (kind: ObjectKind, count: number, extra: Partial<ObjectSpec> = {}): ObjectSpec => ({ kind, count, ...extra });

export const ROUNDS: RoundSpec[] = [
  { id: 1, sheet: "4 green mushrooms, 1 purple mushroom", answer: "Purple mushroom", decoys: [o("mushroom-green", 4)], odd: o("mushroom-purple", 1) },
  { id: 2, sheet: "5 moon-shaped charms, 1 sun-shaped charm", answer: "Sun-shaped charm", decoys: [o("charm-moon", 5)], odd: o("charm-sun", 1) },
  { id: 3, sheet: "7 orange fireflies, 1 blue firefly", answer: "Blue firefly", decoys: [o("firefly-orange", 7)], odd: o("firefly-blue", 1) },
  { id: 4, sheet: "8 feathered arrows, 1 wooden arrow", answer: "Wooden arrow", decoys: [o("arrow-feathered", 8)], odd: o("arrow-wooden", 1) },
  { id: 5, sheet: "8 orange spiral shells, 1 smooth shell", answer: "Smooth shell", decoys: [o("shell-spiral-orange", 8)], odd: o("shell-smooth-yellow", 1) },
  { id: 6, sheet: "4 moon-shaped charms, 3 sun-shaped charms, 1 timer", answer: "Timer", decoys: [o("charm-moon", 4), o("charm-sun", 3)], odd: o("timer", 1) },
  { id: 7, sheet: "5 orange fireflies, 3 yellow fireflies, 1 blue firefly", answer: "Blue firefly", decoys: [o("firefly-orange", 5), o("firefly-yellow", 3)], odd: o("firefly-blue", 1) },
  { id: 8, sheet: "4 feathered arrows, 4 wooden arrows, 1 timer", answer: "Timer", decoys: [o("arrow-feathered", 4), o("arrow-wooden", 4)], odd: o("timer", 1) },
  { id: 9, sheet: "6 green mushrooms, 4 purple mushrooms, 1 orange firefly", answer: "Orange firefly", decoys: [o("mushroom-green", 6), o("mushroom-purple", 4)], odd: o("firefly-orange", 1) },
  { id: 10, sheet: "5 blue spiral shells, 5 orange ridged shells, 1 yellow smooth shell", answer: "Yellow Smooth shell", decoys: [o("shell-spiral-blue", 5), o("shell-ridged-orange", 5)], odd: o("shell-smooth-yellow", 1) },
  { id: 11, sheet: "7 moon-shaped charms, 3 sun-shaped charms, 1 timer", answer: "Timer", decoys: [o("charm-moon", 7), o("charm-sun", 3)], odd: o("timer", 1) },
  { id: 12, sheet: "9 orange fireflies, 1 blue firefly", answer: "Blue firefly", decoys: [o("firefly-orange", 9)], odd: o("firefly-blue", 1) },
  { id: 13, sheet: "8 feathered arrows, 3 wooden arrows, 1 timer", answer: "Timer", decoys: [o("arrow-feathered", 8), o("arrow-wooden", 3)], odd: o("timer", 1) },
  { id: 14, sheet: "4 orange spiral shells, 5 orange ridged shells, 1 blue spiral shell", answer: "Different-colour spiral shell", decoys: [o("shell-spiral-orange", 4), o("shell-ridged-orange", 5)], odd: o("shell-spiral-blue", 1) },
  { id: 15, sheet: "6 green mushrooms, 3 wooden masks, 1 purple mushrooms", answer: "1 purple mushrooms", decoys: [o("mushroom-green", 6), o("mask-wooden", 3)], odd: o("mushroom-purple", 1) },
  { id: 16, sheet: "8 moon-shaped charms, 3 sun-shaped charms, 1 wooden mask", answer: "1 wooden mask", decoys: [o("charm-moon", 8), o("charm-sun", 3)], odd: o("mask-wooden", 1) },
  { id: 17, sheet: "7 orange fireflies, 3 yellow fireflies, 1 blue firefly", answer: "Blue firefly", decoys: [o("firefly-orange", 7), o("firefly-yellow", 3)], odd: o("firefly-blue", 1) },
  { id: 18, sheet: "7 feathered arrows, 3 wooden arrows, 1 wooden mask", answer: "1 wooden mask", decoys: [o("arrow-feathered", 7), o("arrow-wooden", 3)], odd: o("mask-wooden", 1) },
  { id: 19, sheet: "10 purple mushrooms, 1 green mushroom", answer: "Green mushroom", decoys: [o("mushroom-purple", 10)], odd: o("mushroom-green", 1) },
  { id: 20, sheet: "4 blue spiral shells, 3 orange ridged shells, 3 yellow smooth shells, 1 orange spiral shell", answer: "1 orange spiral shell", decoys: [o("shell-spiral-blue", 4), o("shell-ridged-orange", 3), o("shell-smooth-yellow", 3)], odd: o("shell-spiral-orange", 1) },
  { id: 21, sheet: "6 moon-shaped charms, 4 sun-shaped charms, 3 blue spiral shells, 1 orange spiral shell", answer: "1 orange spiral shell", decoys: [o("charm-moon", 6), o("charm-sun", 4), o("shell-spiral-blue", 3)], odd: o("shell-spiral-orange", 1) },
  { id: 22, sheet: "13 orange fireflies, 1 blue firefly", answer: "Blue firefly", decoys: [o("firefly-orange", 13)], odd: o("firefly-blue", 1) },
  { id: 23, sheet: "6 right wooden arrows, 1 left wooden arrow, 5 right facing masks", answer: "1 left wooden arrow", decoys: [o("arrow-wooden", 6, { facing: "right" }), o("mask-wooden", 5, { facing: "right" })], odd: o("arrow-wooden", 1, { facing: "left" }) },
  { id: 24, sheet: "10 top facing purple mushrooms, 5 top facing green mushroom, 1 downward facing purple mushroom", answer: "1 downward facing purple mushroom", decoys: [o("mushroom-purple", 10), o("mushroom-green", 5)], odd: o("mushroom-purple", 1, { upsideDown: true }) },
  { id: 25, sheet: "10 left moving orange fireflies, 5 left moving blue firefly, 1 right moving orange firefly", answer: "1 right moving orange firefly", decoys: [o("firefly-orange", 10, { facing: "left", drift: "left" }), o("firefly-blue", 5, { facing: "left", drift: "left" })], odd: o("firefly-orange", 1, { facing: "right", drift: "right" }) },
];

// ---------------------------------------------------------------------------
// Rules (from the Star Search reference, as agreed)
// ---------------------------------------------------------------------------

export const TIME_LIMIT_MS = 100_000; // 100 s for the whole game
export const LEVEL_TIME_MS = 4_000; // each level must be answered within 4 s, or it's missed (not shown on screen)
export const BASE_POINTS = 10;
export const STREAK_STEP = 3; // every 3 correct in a row raises the multiplier
export const MAX_MULTIPLIER = 5;
export const CORRECT_HOLD_MS = 450; // feedback before the next round
export const WRONG_HOLD_MS = 1000; // wrong: red flash + the real answer shown

export function multiplierFor(streak: number): number {
  return Math.min(MAX_MULTIPLIER, 1 + Math.floor(streak / STREAK_STEP));
}

// ---------------------------------------------------------------------------
// Copy (English only)
// ---------------------------------------------------------------------------

export const COPY = {
  intro: "One object in the grove doesn't belong. Find the odd one out and tap it — you have 4 seconds for each level!",
  timeUp: "Time's up!",
  allDone: "You found every odd one out!", // all 25 right
  finished: "You made it through the grove!", // reached the end with some misses
};

// ---------------------------------------------------------------------------
// Look
// ---------------------------------------------------------------------------

export const PLAY_AREA = { width: 390, height: 700 };
export const SAFE_AREA_TOP = 44;
export const FIELD = { left: 12, top: 124, width: 366, height: 564 }; // where objects are scattered

export const ASSETS = {
  background: "/games/decoy-grove/backgrounds/night-path.jpg",
  fumi: "/games/decoy-grove/fumi.png",
  titlePlank: "/games/decoy-grove/title-plank.png",
};
export const objectSrc = (kind: ObjectKind) => `/games/decoy-grove/objects/${kind}.webp`;
export const ALL_KINDS: ObjectKind[] = ["mushroom-green", "mushroom-purple", "charm-moon", "charm-sun", "firefly-orange", "firefly-yellow", "firefly-blue", "arrow-feathered", "arrow-wooden", "shell-spiral-orange", "shell-spiral-blue", "shell-ridged-orange", "shell-smooth-yellow", "mask-wooden", "timer"];

// ---------------------------------------------------------------------------
// Load-time check: counts in the data match the sheet text, ids are 1..25,
// and the odd one is visually distinct from every decoy group.
// ---------------------------------------------------------------------------

const look = (s: ObjectSpec) => `${s.kind}|${s.facing ?? "right"}|${s.upsideDown ? "down" : "up"}|${s.drift ?? "none"}`;
ROUNDS.forEach((r, i) => {
  const fail = (m: string): never => {
    throw new Error(`Decoy Grove round ${r.id}: ${m}`);
  };
  if (r.id !== i + 1) fail("rounds must be numbered 1-25 in order");
  if (r.odd.count !== 1) fail("the odd one out must appear once");
  // (compared as sets: the sheet sometimes lists the odd one mid-row, e.g. round 23)
  const sheetCounts = (r.sheet.match(/\d+/g) ?? []).map(Number).sort((x, y) => x - y);
  const dataCounts = [...r.decoys.map((d) => d.count), r.odd.count].sort((x, y) => x - y);
  if (sheetCounts.join(",") !== dataCounts.join(",")) fail(`counts ${dataCounts} don't match the sheet (${sheetCounts})`);
  if (r.decoys.some((d) => look(d) === look(r.odd))) fail("the odd one out looks the same as a decoy group");
});
