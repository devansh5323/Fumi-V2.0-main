import type { Cell, Placement, Puzzle } from "../types";
import { createRng, randInt, shuffle, type Rng } from "./rng";

// 8 directions [dr, dc]. Forward directions (left-to-right / downward) are
// weighted to come up 3× more often than reversed ones — friendlier for
// young readers, while still including some backwards words.
const FORWARD: [number, number][] = [
  [0, 1], // →
  [1, 0], // ↓
  [1, 1], // ↘
  [-1, 1], // ↗
];
const REVERSE: [number, number][] = [
  [0, -1], // ←
  [-1, 0], // ↑
  [-1, -1], // ↖
  [1, -1], // ↙
];
const WEIGHTED_DIRS: [number, number][] = [...FORWARD, ...FORWARD, ...FORWARD, ...REVERSE];
const ALL_DIRS: [number, number][] = [...FORWARD, ...REVERSE];

const ALPHABET = "ABCDEFGHIJKLMNOPRSTUVWY"; // filler letters (rare Q/X/Z/J/K left out so they don't attract the eye)

function tryPlace(grid: (string | null)[][], word: string, rng: Rng): Cell[] | null {
  const n = grid.length;
  for (let attempt = 0; attempt < 400; attempt++) {
    const [dr, dc] = WEIGHTED_DIRS[randInt(rng, WEIGHTED_DIRS.length)];
    const r0 = randInt(rng, n);
    const c0 = randInt(rng, n);
    const rEnd = r0 + dr * (word.length - 1);
    const cEnd = c0 + dc * (word.length - 1);
    if (rEnd < 0 || rEnd >= n || cEnd < 0 || cEnd >= n) continue;
    const cells: Cell[] = [];
    let ok = true;
    for (let i = 0; i < word.length && ok; i++) {
      const r = r0 + dr * i;
      const c = c0 + dc * i;
      const cur = grid[r][c];
      if (cur !== null && cur !== word[i]) ok = false;
      cells.push({ r, c });
    }
    // Allow crossings, but never let a word sit entirely on top of another.
    if (ok && cells.every(({ r, c }) => grid[r][c] !== null)) ok = false;
    if (!ok) continue;
    cells.forEach(({ r, c }, i) => (grid[r][c] = word[i]));
    return cells;
  }
  return null;
}

// Every place `word` can be read in the grid, in any of the 8 directions.
export function findOccurrences(grid: string[][], word: string): Cell[][] {
  const n = grid.length;
  const out: Cell[][] = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      for (const [dr, dc] of ALL_DIRS) {
        const cells: Cell[] = [];
        for (let i = 0; i < word.length; i++) {
          const rr = r + dr * i;
          const cc = c + dc * i;
          if (rr < 0 || rr >= n || cc < 0 || cc >= n || grid[rr][cc] !== word[i]) break;
          cells.push({ r: rr, c: cc });
        }
        if (cells.length === word.length) out.push(cells);
      }
  return out;
}

export function countOccurrences(grid: string[][], word: string): number {
  return findOccurrences(grid, word).length;
}

const cellKey = ({ r, c }: Cell) => `${r},${c}`;

// A word must appear exactly once — except where it is unavoidably part of
// another target word (e.g. CART read backwards inside TRACK). Those
// embedded copies still count if the child selects them.
function uniqueEnough(grid: string[][], placements: Placement[]): boolean {
  return placements.every((p) => {
    const extra = findOccurrences(grid, p.word).filter((occ) => {
      if (occ.map(cellKey).join("|") === p.cells.map(cellKey).join("|")) return false;
      return !placements.some((q) => q !== p && occ.every((cell) => q.cells.some((qc) => cellKey(qc) === cellKey(cell))));
    });
    return extra.length === 0;
  });
}

// Builds a size×size grid containing every word once (see uniqueEnough),
// with the rest filled by random letters.
// Deterministic for a given seed; retries with a derived seed if needed.
export function generatePuzzle(words: string[], size: number, seed: string): Puzzle {
  const targets = words.map((w) => w.toUpperCase().replace(/[^A-Z]/g, ""));
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = createRng(`${seed}-${attempt}`);
    const grid: (string | null)[][] = Array.from({ length: size }, () => Array<string | null>(size).fill(null));
    const order = [...targets].sort((a, b) => b.length - a.length || (rng() < 0.5 ? -1 : 1));
    const placements: Placement[] = [];
    let failed = false;
    for (const word of order) {
      const cells = tryPlace(grid, word, rng);
      if (!cells) {
        failed = true;
        break;
      }
      placements.push({ word, cells });
    }
    if (failed) continue;
    const filled = grid.map((row) => row.map((ch) => ch ?? ALPHABET[randInt(rng, ALPHABET.length)]));
    if (!uniqueEnough(filled, placements)) continue;
    // keep placements in the sheet's order
    const byWord = new Map(placements.map((p) => [p.word, p]));
    return { size, grid: filled, placements: targets.map((w) => byWord.get(w)!) };
  }
  throw new Error(`Could not build a ${size}x${size} word search for: ${targets.join(", ")}`);
}

// The straight line of cells from `a` towards `b`, snapped to the nearest
// of the 8 directions and clipped to the grid.
export function lineBetween(a: Cell, b: Cell, size: number): Cell[] {
  const dr = b.r - a.r;
  const dc = b.c - a.c;
  if (dr === 0 && dc === 0) return [a];
  let best: [number, number] = [0, 1];
  let bestScore = -Infinity;
  const len = Math.hypot(dr, dc);
  for (const [r, c] of ALL_DIRS) {
    const score = (dr * r + dc * c) / (len * Math.hypot(r, c));
    if (score > bestScore) {
      bestScore = score;
      best = [r, c];
    }
  }
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  const cells: Cell[] = [];
  for (let i = 0; i <= steps; i++) {
    const r = a.r + best[0] * i;
    const c = a.c + best[1] * i;
    if (r < 0 || r >= size || c < 0 || c >= size) break;
    cells.push({ r, c });
  }
  return cells;
}

// The unfound target word a selection spells (forwards or backwards), if
// any. Matching is by letters, so an embedded copy (CART inside TRACK)
// counts too.
export function matchWord(selection: Cell[], grid: string[][], unfound: string[]): string | null {
  if (selection.length < 2) return null;
  const letters = selection.map(({ r, c }) => grid[r][c]).join("");
  const reversed = [...letters].reverse().join("");
  return unfound.find((w) => w === letters || w === reversed) ?? null;
}

export function shuffledColors(n: number, seed: string): number[] {
  return shuffle(
    Array.from({ length: n }, (_, i) => i),
    createRng(seed)
  );
}
