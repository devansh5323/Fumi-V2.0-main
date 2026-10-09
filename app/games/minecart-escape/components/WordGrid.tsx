"use client";

import { useRef, useState } from "react";
import type { Cell, Puzzle } from "../types";
import { WORD_COLORS } from "../config";
import { lineBetween } from "../engine/wordsearch";
import { IronCorners, WOOD, WOOD_EDGE } from "./MineArt";

export type FoundMark = { word: string; cells: Cell[]; colorIndex: number };
export type SelectOutcome = "found" | "invalid" | "repeat" | "short";

type WordGridProps = {
  puzzle: Puzzle;
  found: FoundMark[];
  disabled: boolean;
  boardPx: number; // inner board width/height in px
  onSelect: (cells: Cell[]) => SelectOutcome;
};

const FRAME = 12;

// Capsule geometry from the first to the last cell of a straight line.
function capsule(cells: Cell[], cs: number) {
  const a = cells[0];
  const b = cells[cells.length - 1];
  const ax = a.c * cs + cs / 2;
  const ay = a.r * cs + cs / 2;
  const bx = b.c * cs + cs / 2;
  const by = b.r * cs + cs / 2;
  const len = Math.hypot(bx - ax, by - ay) + cs * 0.84;
  const h = cs * 0.8;
  return {
    left: (ax + bx) / 2 - len / 2,
    top: (ay + by) / 2 - h / 2,
    width: len,
    height: h,
    transform: `rotate(${Math.atan2(by - ay, bx - ax)}rad)`,
  };
}

// The letter board in its wooden, iron-cornered frame. Children select by
// dragging across a straight line of letters (snaps to the nearest of the
// 8 directions), or by tapping the first and then the last letter.
export function WordGrid({ puzzle, found, disabled, boardPx, onSelect }: WordGridProps) {
  const n = puzzle.size;
  const cs = boardPx / n;
  const boardRef = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState<Cell | null>(null);
  const [current, setCurrent] = useState<Cell | null>(null);
  const [anchor, setAnchor] = useState<Cell | null>(null); // tap-tap mode
  const [flash, setFlash] = useState<{ cells: Cell[]; key: number } | null>(null);
  const [moved, setMoved] = useState(false);

  const cellAt = (e: React.PointerEvent): Cell | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const scale = rect.width / boardPx;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    const c = Math.floor(x / cs);
    const r = Math.floor(y / cs);
    if (r < 0 || r >= n || c < 0 || c >= n) return null;
    return { r, c };
  };

  const finish = (cells: Cell[]) => {
    const outcome = onSelect(cells);
    if (outcome === "invalid") setFlash({ cells, key: Date.now() });
  };

  const onDown = (e: React.PointerEvent) => {
    if (disabled) return;
    const cell = cellAt(e);
    if (!cell) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setMoved(false);
    setStart(cell);
    setCurrent(cell);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!start || disabled) return;
    const cell = cellAt(e);
    if (!cell) return;
    if (cell.r !== start.r || cell.c !== start.c) setMoved(true);
    setCurrent(cell);
  };

  const onUp = () => {
    if (!start || disabled) {
      setStart(null);
      return;
    }
    const end = current ?? start;
    if (moved) {
      setAnchor(null);
      finish(lineBetween(start, end, n));
    } else if (anchor && (anchor.r !== start.r || anchor.c !== start.c)) {
      finish(lineBetween(anchor, start, n));
      setAnchor(null);
    } else {
      setAnchor(anchor && anchor.r === start.r && anchor.c === start.c ? null : start);
    }
    setStart(null);
    setCurrent(null);
  };

  const live = start && current && moved ? lineBetween(start, current, n) : null;
  const liveSet = new Set((live ?? []).map(({ r, c }) => `${r},${c}`));
  const foundSet = new Set(found.flatMap((f) => f.cells.map(({ r, c }) => `${r},${c}`)));

  return (
    <div
      style={{
        position: "relative",
        padding: FRAME,
        background: WOOD,
        border: `2px solid ${WOOD_EDGE}`,
        borderRadius: 14,
        boxShadow: "0 10px 24px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,220,170,0.3)",
      }}
    >
      <IronCorners />
      <div
        ref={boardRef}
        role="grid"
        aria-label={`Word search, ${n} by ${n}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => {
          setStart(null);
          setCurrent(null);
        }}
        style={{
          position: "relative",
          width: boardPx,
          height: boardPx,
          borderRadius: 6,
          background: "#1a1d22",
          boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.6)",
          touchAction: "none",
          cursor: disabled ? "default" : "pointer",
        }}
      >
        {/* cells */}
        {puzzle.grid.map((row, r) =>
          row.map((_, c) => (
            <div
              key={`${r}-${c}`}
              style={{
                position: "absolute",
                left: c * cs + 1.5,
                top: r * cs + 1.5,
                width: cs - 3,
                height: cs - 3,
                borderRadius: 4,
                background: "linear-gradient(180deg, #343a42 0%, #2a2f36 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 0 rgba(0,0,0,0.5)",
              }}
            />
          ))
        )}
        {/* found-word capsules */}
        {found.map((f) => (
          <div key={f.word} aria-hidden style={{ position: "absolute", ...capsule(f.cells, cs), borderRadius: cs, background: `${WORD_COLORS[f.colorIndex]}cc`, border: `2px solid ${WORD_COLORS[f.colorIndex]}`, boxShadow: `0 0 10px ${WORD_COLORS[f.colorIndex]}88`, animation: "mw-pop 320ms var(--ease-pop) both" }} />
        ))}
        {/* wrong selection */}
        {flash && <div key={flash.key} aria-hidden onAnimationEnd={() => setFlash(null)} style={{ position: "absolute", ...capsule(flash.cells, cs), borderRadius: cs, background: "rgba(226,69,58,0.55)", border: "2px solid #ff6b5e", animation: "mw-wrong 480ms ease-out both" }} />}
        {/* selection in progress */}
        {live && <div aria-hidden style={{ position: "absolute", ...capsule(live, cs), borderRadius: cs, background: "rgba(255,214,90,0.45)", border: "2px solid #ffd65a" }} />}
        {anchor && <div aria-hidden style={{ position: "absolute", left: anchor.c * cs + 2, top: anchor.r * cs + 2, width: cs - 4, height: cs - 4, borderRadius: cs, border: "2px solid #ffd65a", background: "rgba(255,214,90,0.3)", animation: "glow-pulse 1s ease-in-out infinite" }} />}
        {/* letters on top */}
        {puzzle.grid.map((row, r) =>
          row.map((ch, c) => {
            const key = `${r},${c}`;
            const lit = foundSet.has(key) || liveSet.has(key);
            return (
              <div
                key={`l-${key}`}
                role="gridcell"
                aria-label={ch}
                style={{
                  position: "absolute",
                  left: c * cs,
                  top: r * cs,
                  width: cs,
                  height: cs,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: lit ? "#ffffff" : "#e9edf2",
                  fontFamily: "var(--font-body), system-ui",
                  fontWeight: lit ? 800 : 600,
                  fontSize: cs * 0.56,
                  textShadow: lit ? "0 1px 2px rgba(0,0,0,0.45)" : "none",
                  pointerEvents: "none",
                }}
              >
                {ch}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
