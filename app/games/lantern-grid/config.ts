import type { LanternCode, LanternInfo, Puzzle } from "./types";

// ---------------------------------------------------------------------------
// Content — copied from the Lantern Grid sheet. Edit here to change puzzles.
// ---------------------------------------------------------------------------

// Sheet legend (column A).
export const LANTERNS: Record<LanternCode, LanternInfo> = {
  AM: { code: "AM", name: "Amber Moon", colour: "amber", symbol: "moon", src: "/games/lantern-grid/lanterns/AM.webp" },
  AD: { code: "AD", name: "Amber Diamond", colour: "amber", symbol: "diamond", src: "/games/lantern-grid/lanterns/AD.webp" },
  AS: { code: "AS", name: "Amber Star", colour: "amber", symbol: "star", src: "/games/lantern-grid/lanterns/AS.webp" },
  BM: { code: "BM", name: "Blue Moon", colour: "blue", symbol: "moon", src: "/games/lantern-grid/lanterns/BM.webp" },
  BD: { code: "BD", name: "Blue Diamond", colour: "blue", symbol: "diamond", src: "/games/lantern-grid/lanterns/BD.webp" },
  BS: { code: "BS", name: "Blue Star", colour: "blue", symbol: "star", src: "/games/lantern-grid/lanterns/BS.webp" },
};

// The sheet's rows, written the same way as its "Order", "Answer" and
// "Option 1-4" columns. `?` marks the missing lantern.
type SheetRow = { order: string[]; answer: string; options: [string, string, string, string] };

const SHEET: SheetRow[] = [
  { order: ["AM AD AM", "AD AM AD", "AM AD ?"], answer: "AM", options: ["Blue Moon", "Amber Diamond", "Amber Moon", "Amber Star"] },
  { order: ["AM AD AS", "AD AS AM", "AS AM ?"], answer: "AD", options: ["Amber Star", "Amber Diamond", "Blue Diamond", "Amber Moon"] },
  { order: ["AM BD AS", "BM AD BS", "AM BD ?"], answer: "AS", options: ["Blue Star", "Amber Moon", "Amber Diamond", "Amber Star"] },
  { order: ["AM BD AS", "BS AM BD", "AD BS ?"], answer: "AM", options: ["Amber Moon", "Blue Moon", "Amber Star", "Blue Diamond"] },
  { order: ["AM AD AS", "BD BS BM", "AS AM ?"], answer: "AD", options: ["Blue Diamond", "Amber Star", "Amber Diamond", "Amber Moon"] },
  { order: ["AM BD AS", "AD BS AM", "AS BM ?"], answer: "AD", options: ["Amber Moon", "Amber Diamond", "Blue Diamond", "Blue Star"] },
  { order: ["AM AD AS AM", "BD BS BM BD", "AS AM AD AS", "BM BD BS ?"], answer: "BM", options: ["Amber Moon", "Blue Diamond", "Blue Star", "Blue Moon"] },
  { order: ["AM BD AS BM", "BD AS BM AD", "AS BM AD BS", "? AD BS AM"], answer: "BM", options: ["Blue Star", "Blue Moon", "Amber Moon", "Blue Diamond"] },
  { order: ["AM ? AD BM", "BD AS BS AD", "AD BS AS BD", "BM AD BD AM"], answer: "BD", options: ["Amber Diamond", "Blue Star", "Blue Diamond", "Amber Moon"] },
  { order: ["AM BD BS BM", "BD AS BM BD", "BS BM AD BS", "BM BD ? AM"], answer: "BS", options: ["Blue Star", "Amber Star", "Blue Moon", "Blue Diamond"] },
];

function codeOf(token: string): LanternCode {
  const t = token.trim();
  const byCode = (Object.keys(LANTERNS) as LanternCode[]).find((c) => c === t);
  const byName = (Object.values(LANTERNS) as LanternInfo[]).find((l) => l.name.toLowerCase() === t.toLowerCase());
  const code = byCode ?? byName?.code;
  if (!code) throw new Error(`Lantern Grid: unknown lantern "${token}"`);
  return code;
}

// Parsed + checked once at load: square grid, exactly one "?", answer among
// the four options. A typo in the sheet data fails loudly instead of
// producing an unsolvable puzzle.
export const PUZZLES: Puzzle[] = SHEET.map((row, i) => {
  const cells = row.order.map((line) => line.trim().split(/\s+/));
  const size = cells.length;
  const holes: { r: number; c: number }[] = [];
  const grid = cells.map((line, r) => {
    if (line.length !== size) throw new Error(`Lantern Grid puzzle ${i + 1}: row ${r + 1} has ${line.length} lanterns, expected ${size}`);
    return line.map((tok, c) => {
      if (tok === "?") {
        holes.push({ r, c });
        return null;
      }
      return codeOf(tok);
    });
  });
  if (holes.length !== 1) throw new Error(`Lantern Grid puzzle ${i + 1}: expected exactly one "?", found ${holes.length}`);
  const missing = holes[0];
  const answer = codeOf(row.answer);
  const options = row.options.map(codeOf);
  if (!options.includes(answer)) throw new Error(`Lantern Grid puzzle ${i + 1}: answer ${answer} is not one of the options`);
  return { id: i + 1, grid, missing, answer, options };
});

export const OPTION_LETTERS = ["A", "B", "C", "D"];

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

// From the sheet's "Instructions" note.
export const INSTRUCTION = "Study the lantern grid and spot the pattern. Drag the lantern that correctly fills the missing space.";
// Fumi's welcome on the first screen.
export const FUMI_INTRO = "Hi, I'm Fumi! Study the lantern grid and spot the pattern. Then drag the lantern that fills the missing space marked with ?";
export const GAME_OVER_LINE = "Oh oh, looks like you weren't able to power the grid up. Let's try again.";
export const COMPLETE_LINE = "The Lantern Grid is powered up!";

// ---------------------------------------------------------------------------
// Rules + look
// ---------------------------------------------------------------------------

export const LIVES = 3;
export const SOLVED_HOLD_MS = 1300; // celebrate the placed lantern before sliding on
export const SLIDE_MS = 480;
export const WRONG_HOLD_MS = 650; // the ✕ shows on the dropped card before it returns
export const RETURN_MS = 380;

export const PLAY_AREA = { width: 390, height: 700 };
export const SAFE_AREA_TOP = 44;

export const ASSETS = {
  background: "/games/lantern-grid/backgrounds/grove.jpg",
  fumi: "/games/lantern-grid/mascot/fumi.png",
  back: "/games/lantern-grid/ui/back.png",
  pause: "/games/lantern-grid/ui/pause.png",
  progressLantern: "/games/lantern-grid/ui/progress-lantern.png",
};
