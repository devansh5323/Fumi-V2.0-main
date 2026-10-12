import type { CellKind, Dir, PieceSymbol, Round } from "./types";
import { checkFlow } from "./engine/flow";

// ---------------------------------------------------------------------------
// Content — copied from the River Routes sheet. Each round can be edited on
// its own: board layout, tray pieces (in order) and the solved board.
// Board: S = Start, E = End, X = boulder, · = empty space.
// ---------------------------------------------------------------------------

type SheetRound = { board: string[]; tray: string; solution: string[] };

const SHEET: SheetRound[] = [
  // Round 0 — guided practice with Fumi
  { board: ["S · · X", "X · · X", "X · · X", "X X · E"], tray: "─ ┐ │ │ └", solution: ["S ─ ┐ X", "X · │ X", "X · │ X", "X X └ E"] },
  { board: ["S · X X", "X · · X", "X X · X", "X · · E"], tray: "┐ └ ┐ │ └", solution: ["S ┐ X X", "X └ ┐ X", "X X │ X", "X · └ E"] },
  { board: ["S · X X", "X · · X", "X X · X", "X · · E"], tray: "┐ └ ┐ │ └", solution: ["S ┐ X X", "X └ ┐ X", "X X │ X", "X · └ E"] },
  { board: ["S · X X", "X · · X", "X · X X", "· · · E"], tray: "┐ │ │ └ ─", solution: ["S ┐ X X", "X │ · X", "X │ X X", "· └ ─ E"] },
  { board: ["S · · X", "X · X X", "· · · X", "X X · E"], tray: "┐ │ └ ┐ └", solution: ["S ┐ · X", "X │ X X", "· └ ┐ X", "X X └ E"] },
  { board: ["S · X X X", "X · · X X", "X X · X X", "· · · · X", "X X X · E"], tray: "┐ └ ┐ │ └ ┐ └", solution: ["S ┐ X X X", "X └ ┐ X X", "X X │ X X", "· · └ ┐ X", "X X X └ E"] },
];

// Which sides each piece is open on (from the sheet's legend). Start opens
// to the right and End to the left in every round.
export const OPENINGS: Record<PieceSymbol | "S" | "E", Dir[]> = {
  "─": ["L", "R"],
  "│": ["U", "D"],
  "┌": ["R", "D"],
  "┐": ["L", "D"],
  "└": ["R", "U"],
  "┘": ["L", "U"],
  S: ["R"],
  E: ["L"],
};

export const PIECE_NAMES: Record<PieceSymbol, string> = {
  "─": "straight across",
  "│": "straight up and down",
  "┌": "corner, right and down",
  "┐": "corner, left and down",
  "└": "corner, up and right",
  "┘": "corner, left and up",
};

// Artwork (cut from the design reference). ┌ and ┘ aren't used by the sheet
// and have no art of their own; they're drawn as mirrored ┐ / └.
export const PIECE_ART: Record<PieceSymbol, { src: string; flip?: boolean }> = {
  "─": { src: "/games/river-routes/pieces/h.webp" },
  "│": { src: "/games/river-routes/pieces/v.webp" },
  "┐": { src: "/games/river-routes/pieces/ld.webp" },
  "└": { src: "/games/river-routes/pieces/ur.webp" },
  "┌": { src: "/games/river-routes/pieces/ld.webp", flip: true },
  "┘": { src: "/games/river-routes/pieces/ur.webp", flip: true },
};

const PIECE_SET = Object.keys(OPENINGS).filter((k) => k !== "S" && k !== "E");
const tokens = (line: string) => line.trim().split(/\s+/).map((t) => (t === "·" ? "." : t));

function parse(row: SheetRound, id: number): Round {
  const fail = (msg: string): never => {
    throw new Error(`River Routes round ${id}: ${msg}`);
  };
  const board = row.board.map(tokens);
  const size = board.length;
  board.forEach((line, r) => line.length !== size && fail(`board row ${r + 1} has ${line.length} cells, expected ${size}`));
  board.flat().forEach((t) => !["S", "E", "X", "."].includes(t) && fail(`unknown board symbol "${t}"`));
  const tray = tokens(row.tray);
  tray.forEach((t) => !PIECE_SET.includes(t) && fail(`unknown tray piece "${t}"`));
  const sol = row.solution.map(tokens);
  const solution = sol.map((line, r) =>
    line.map((t, c) => {
      const b = board[r]?.[c];
      if (PIECE_SET.includes(t)) {
        if (b !== ".") fail(`solution puts a piece on a non-empty cell (${r + 1},${c + 1})`);
        return t as PieceSymbol;
      }
      if (t !== b) fail(`solution cell (${r + 1},${c + 1}) is "${t}" but the board has "${b}"`);
      return null;
    })
  );
  const used = solution.flat().filter(Boolean).sort().join("");
  if (used !== [...tray].sort().join("")) fail("the solution's pieces don't match the tray");
  const round: Round = { id, practice: id === 0, size, board: board as CellKind[][], tray: tray as PieceSymbol[], solution };
  const check = checkFlow(round.board, solution);
  if (!check.ok) fail("the solution doesn't connect Start to End using every piece");
  return round;
}

export const ROUNDS: Round[] = SHEET.map(parse);
export const PRACTICE = ROUNDS[0];
export const MAIN_ROUNDS = ROUNDS.slice(1);

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

export const SUBTITLE = "Build the river path to carry energy to the end.";
// The one-liner in Fumi's bubble during Rounds 1-5 (when she has nothing else to say).
export const GOAL_LINE = "Connect the river from Start to End!";
export const COPY = {
  practiceIntro: "Hi! Let's build a river. Connect the Start to the End by placing river pieces in the empty spaces.",
  tourStart: "This is the Start. The river begins here. It never moves.",
  tourEnd: "This is the End. Bring the river all the way here!",
  tourBoulders: "Boulders block the river. Pieces can't go on them.",
  tourTray: "These are your river pieces. They can't be turned, so look where the water goes in and out. You must use every piece!",
  decoys: "See these empty spaces? They stay empty. Not every space is needed!",
  sendFlowPrompt: "All pieces are on the board. Press Send Flow to fill the river!",
  wrongCellPractice: "Almost! Drop it on the glowing space.",
  practiceDone: "Great job! You connected the river!",
  roundStart: "Your turn! Use every piece to bring the river to the End.",
  useAllPieces: "Use all the pieces first, then press Send Flow.",
  blocked: { X: "Boulders block the river. Try an empty space.", S: "The Start never moves. Try an empty space.", E: "The End never moves. Try an empty space." },
  stopped: "Oh! The river stopped here. Let's try this level again.",
  unused: "The river reached the End, but every piece must be part of it. Let's try this level again.",
  // practice can't lose lives or restart, so it keeps the gentler hints
  stoppedPractice: "Oh! The river stopped here. Try moving some pieces.",
  unusedPractice: "The river reached the End, but every piece must be part of it. Try again!",
  restarted: "Here we go again! Bring the river to the End.",
  roundDone: "Great job! You connected the river!",
  gameOver: "Oh oh, looks like the river couldn't reach the end. Let's try again.",
  allDone: "You built every river!",
};

// Practice: the order Fumi guides the pieces in, following the river from
// the Start (taken from the solution).
export const PRACTICE_STEP_TEXT = [
  "Drag the straight piece into the glowing space next to the Start.",
  "This corner turns the river down. Drag it into the glowing space.",
  "Now a straight up-and-down piece. Drag it into the glowing space.",
  "One more straight piece!",
  "Last one! This corner turns the river toward the End.",
];

// ---------------------------------------------------------------------------
// Look
// ---------------------------------------------------------------------------

export const PLAY_AREA = { width: 390, height: 700 };
export const SAFE_AREA_TOP = 44;
export const FLOW_STEP_MS = 190;
// Lives for the whole game (Rounds 1-5): each wrong Send Flow costs one and
// restarts that level; losing all three ends the game and Try Again starts
// again from Round 1 with 3 lives.
export const LIVES = 3;
export const RESTART_HOLD_MS = 1600; // show where the water stopped before the level resets
export const AUTO_NEXT_MS = 2200; // a solved level moves on by itself after "Great job!"

export const ASSETS = {
  background: "/games/river-routes/backgrounds/falls.jpg",
  fumi: "/games/river-routes/mascot/fumi.png",
  pause: "/games/river-routes/ui/pause.png",
  titlePlank: "/games/river-routes/ui/title-plank.png",
  sendFlow: "/games/river-routes/ui/send-flow.png",
  tiles: {
    S: "/games/river-routes/tiles/start.webp",
    E: "/games/river-routes/tiles/end.webp",
    X: "/games/river-routes/tiles/boulder.webp",
    ".": "/games/river-routes/tiles/empty.webp",
  } as Record<CellKind, string>,
};
