import type { Cell, CellKind, Dir, FlowCheck, PieceSymbol } from "../types";

const OPEN: Record<string, Dir[]> = { "─": ["L", "R"], "│": ["U", "D"], "┌": ["R", "D"], "┐": ["L", "D"], "└": ["R", "U"], "┘": ["L", "U"], S: ["R"], E: ["L"] };
const STEP: Record<Dir, [number, number, Dir]> = { U: [-1, 0, "D"], D: [1, 0, "U"], L: [0, -1, "R"], R: [0, 1, "L"] };

// Follows the water from the Start through the placed pieces. It succeeds
// only if it reaches the End and every placed piece is part of the river.
export function checkFlow(board: CellKind[][], pieces: (PieceSymbol | null)[][]): FlowCheck {
  const n = board.length;
  const at = (r: number, c: number): string | null => {
    if (r < 0 || c < 0 || r >= n || c >= n) return null;
    const b = board[r][c];
    if (b === "S" || b === "E") return b;
    return b === "." ? pieces[r][c] : null;
  };
  let start: Cell | null = null;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (board[r][c] === "S") start = { r, c };
  if (!start) return { ok: false, path: [], failure: { kind: "stopped", at: { r: 0, c: 0 }, next: null } };

  const path: Cell[] = [start];
  const seen = new Set<string>([`${start.r},${start.c}`]);
  let cur = start;
  let came: Dir | null = null;
  for (;;) {
    const sym = at(cur.r, cur.c)!;
    if (sym === "E") break;
    const outs = OPEN[sym].filter((d) => d !== came);
    const dir = outs[0];
    const [dr, dc, back] = STEP[dir];
    const next = { r: cur.r + dr, c: cur.c + dc };
    const nsym = at(next.r, next.c);
    const fits = nsym !== null && OPEN[nsym].includes(back) && !seen.has(`${next.r},${next.c}`);
    if (!fits) {
      const inBoard = next.r >= 0 && next.c >= 0 && next.r < n && next.c < n;
      return { ok: false, path, failure: { kind: "stopped", at: cur, next: inBoard ? next : null } };
    }
    path.push(next);
    seen.add(`${next.r},${next.c}`);
    cur = next;
    came = back;
  }
  const unused: Cell[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (pieces[r][c] && !seen.has(`${r},${c}`)) unused.push({ r, c });
  if (unused.length) return { ok: false, path, failure: { kind: "unused", cells: unused } };
  return { ok: true, path, failure: null };
}
