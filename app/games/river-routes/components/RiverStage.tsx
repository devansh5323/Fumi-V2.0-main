"use client";

import { useRef, useState } from "react";
import type { Cell, FlowCheck, Round } from "../types";
import { PLAY_AREA } from "../config";
import { PieceImg, SAND, SAND_EDGE, TileImg, WOOD, WOOD_EDGE } from "./Art";

// Layout of the board and tray on the 390x700 surface.
export const BOARD = { left: 32, top: 190, size: 326, pad: 10, gap: 5 };
export const TRAY = { left: 10, top: 528, width: 370, height: 86, pad: 10, gap: 8 };

export type Rect = { x: number; y: number; w: number; h: number };
type Pos = { x: number; y: number };

export function cellSize(n: number) {
  return (BOARD.size - BOARD.pad * 2 - BOARD.gap * (n - 1)) / n;
}
export function cellRect(n: number, { r, c }: Cell): Rect {
  const s = cellSize(n);
  return { x: BOARD.left + BOARD.pad + c * (s + BOARD.gap), y: BOARD.top + BOARD.pad + r * (s + BOARD.gap), w: s, h: s };
}
export function pieceSize(count: number) {
  return Math.min(62, (TRAY.width - TRAY.pad * 2 - TRAY.gap * (count - 1)) / count);
}
export function slotRect(count: number, i: number): Rect {
  const s = pieceSize(count);
  const rowW = count * s + (count - 1) * TRAY.gap;
  return { x: TRAY.left + (TRAY.width - rowW) / 2 + i * (s + TRAY.gap), y: TRAY.top + (TRAY.height - s) / 2, w: s, h: s };
}
export const trayRect: Rect = { x: TRAY.left, y: TRAY.top, w: TRAY.width, h: TRAY.height };

export type DropTarget = Cell | "tray" | null;
export type DropOutcome = "placed" | "returned" | "invalid" | "ignored";

export type FlowView = { check: FlowCheck; lit: number } | null;

export type Guide = {
  items: number[]; // tray items the child may drag (others are dimmed)
  target: Cell; // the glowing space
  demo: boolean; // show the ghost hand dragging item -> target
};

type RiverStageProps = {
  round: Round;
  where: (string | null)[]; // per tray item: "r,c" when on the board
  locked: boolean; // no dragging (tour, flowing, paused, done)
  guide: Guide | null; // guided practice step
  flow: FlowView;
  ringCells: Cell[]; // extra gold rings (tutorial tour / decoys)
  spotlight: null | "cells" | "tray"; // tutorial: dim everything except the rings / the tray
  onDrop: (item: number, target: DropTarget) => DropOutcome;
  onTapTray: (item: number) => void; // tap without dragging
};

const key = ({ r, c }: Cell) => `${r},${c}`;
const parseKey = (k: string): Cell => {
  const [r, c] = k.split(",").map(Number);
  return { r, c };
};

export function RiverStage({ round, where, locked, guide, flow, ringCells, spotlight, onDrop, onTapTray }: RiverStageProps) {
  const n = round.size;
  const s = cellSize(n);
  const ps = pieceSize(round.tray.length);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ item: number; pointerId: number; offset: Pos; start: Pos; moved: boolean; from: "tray" | "board" } | null>(null);
  const [drag, setDrag] = useState<{ item: number; pos: Pos; size: number } | null>(null);
  const [hover, setHover] = useState<Cell | null>(null);
  const [flash, setFlash] = useState<{ cell: Cell; seq: number } | null>(null);
  const seq = useRef(0);
  // the ghost-hand demo hides once the child starts dragging, and comes
  // back for the next guided step (a new target)
  const [demoHiddenFor, setDemoHiddenFor] = useState<string | null>(null);
  const demoOn = !!guide && demoHiddenFor !== key(guide.target);

  const toLocal = (clientX: number, clientY: number): Pos => {
    const rect = rootRef.current!.getBoundingClientRect();
    const k = rect.width / PLAY_AREA.width;
    return { x: (clientX - rect.left) / k, y: (clientY - rect.top) / k };
  };
  const cellAt = (p: Pos): Cell | null => {
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        const b = cellRect(n, { r, c });
        const m = BOARD.gap / 2 + 2;
        if (p.x >= b.x - m && p.x <= b.x + b.w + m && p.y >= b.y - m && p.y <= b.y + b.h + m) return { r, c };
      }
    return null;
  };
  const inTray = (p: Pos) => p.x >= trayRect.x && p.x <= trayRect.x + trayRect.w && p.y >= trayRect.y - 10 && p.y <= trayRect.y + trayRect.h + 30;
  const canDrag = (item: number) => !locked && (!guide || guide.items.includes(item));

  const start = (e: React.PointerEvent, item: number, from: "tray" | "board") => {
    if (!canDrag(item) || dragRef.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toLocal(e.clientX, e.clientY);
    const home = from === "tray" ? slotRect(round.tray.length, item) : cellRect(n, parseKey(where[item]!));
    const size = from === "tray" ? ps : s;
    dragRef.current = { item, pointerId: e.pointerId, offset: { x: p.x - home.x, y: p.y - home.y }, start: p, moved: false, from };
    setDrag({ item, pos: { x: home.x, y: home.y }, size });
    if (guide) setDemoHiddenFor(key(guide.target));
  };
  const move = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const p = toLocal(e.clientX, e.clientY);
    if (!d.moved && Math.hypot(p.x - d.start.x, p.y - d.start.y) > 6) d.moved = true;
    // while dragging, the piece grows to board-cell size and centres on the finger
    const size = d.moved ? s : ps;
    setDrag({ item: d.item, pos: { x: p.x - size / 2, y: p.y - size / 2 }, size });
    setHover(d.moved ? cellAt(p) : null);
  };
  const end = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    const p = toLocal(e.clientX, e.clientY);
    setDrag(null);
    setHover(null);
    if (!d.moved) {
      if (d.from === "board") onDrop(d.item, "tray"); // tap a placed piece: back to the tray
      else onTapTray(d.item);
      return;
    }
    const cell = cellAt(p);
    const target: DropTarget = cell ?? (inTray(p) ? "tray" : null);
    const outcome = onDrop(d.item, target);
    if (outcome === "invalid" && cell) setFlash({ cell, seq: ++seq.current });
  };
  const cancel = () => {
    dragRef.current = null;
    setDrag(null);
    setHover(null);
  };
  const handlers = (item: number, from: "tray" | "board") => ({
    onPointerDown: (e: React.PointerEvent) => start(e, item, from),
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: cancel,
    onLostPointerCapture: (e: React.PointerEvent) => {
      if (dragRef.current?.pointerId === e.pointerId) cancel();
    },
  });

  const lit = new Map<string, number>();
  if (flow) flow.check.path.slice(0, flow.lit).forEach((c, i) => lit.set(key(c), i));
  const flowDone = flow && flow.lit >= flow.check.path.length;
  const failRings: Cell[] = flowDone && flow.check.failure ? (flow.check.failure.kind === "stopped" ? [flow.check.failure.at, ...(flow.check.failure.next ? [flow.check.failure.next] : [])] : flow.check.failure.cells) : [];
  const success = flowDone && flow.check.ok;

  return (
    <div ref={rootRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* ---- board ---- */}
      <div style={{ position: "absolute", left: BOARD.left, top: BOARD.top, width: BOARD.size, height: BOARD.size, borderRadius: 16, background: SAND, border: `3px solid ${SAND_EDGE}`, boxShadow: "0 12px 26px rgba(0,30,70,0.45), inset 0 2px 0 rgba(255,255,255,0.5)", boxSizing: "border-box" }}>
        <div style={{ position: "absolute", inset: BOARD.pad - 4, borderRadius: 10, background: "rgba(12,40,64,0.85)", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6)" }} />
      </div>
      <div role="grid" aria-label={`River board, ${n} by ${n}`}>
        {round.board.flatMap((row, r) =>
          row.map((kind, c) => {
            const b = cellRect(n, { r, c });
            const k = key({ r, c });
            const isTarget = guide && guide.target.r === r && guide.target.c === c;
            const isHover = hover && hover.r === r && hover.c === c;
            const litIdx = lit.get(k);
            return (
              <div key={k} role="gridcell" aria-label={kind === "S" ? "Start" : kind === "E" ? "End" : kind === "X" ? "Boulder" : "Empty space"} style={{ position: "absolute", left: b.x, top: b.y, width: s, height: s }}>
                <TileImg kind={kind} size={s} />
                {spotlight && !(spotlight === "cells" && ringCells.some((x) => x.r === r && x.c === c)) && <div aria-hidden style={{ position: "absolute", inset: -1, borderRadius: s * 0.14, background: "rgba(4,22,44,0.62)", transition: "opacity 300ms ease" }} />}
                {isHover && <div style={{ position: "absolute", inset: 0, borderRadius: s * 0.14, boxShadow: `inset 0 0 0 3px ${kind === "." ? "#ffe066" : "#ff6b5e"}`, background: kind === "." ? "rgba(255,224,102,0.18)" : "rgba(255,90,80,0.22)" }} />}
                {isTarget && <div style={{ position: "absolute", inset: -3, borderRadius: s * 0.16, border: "3px solid #ffe066", boxShadow: "0 0 16px 4px rgba(255,224,102,0.85)", animation: "glow-pulse 1.2s ease-in-out infinite" }} />}
                {litIdx !== undefined && (kind === "S" || kind === "E") && <div style={{ position: "absolute", inset: -2, borderRadius: s * 0.16, boxShadow: "0 0 18px 6px rgba(120,220,255,0.9)", animation: kind === "E" && success ? "rr-burst 900ms ease-out both" : "rr-lit 400ms ease-out both" }} />}
              </div>
            );
          })
        )}
      </div>

      {/* tutorial / decoy rings */}
      {ringCells.map((c) => {
        const b = cellRect(n, c);
        return <div key={`ring-${key(c)}`} aria-hidden style={{ position: "absolute", left: b.x - 4, top: b.y - 4, width: b.w + 8, height: b.h + 8, borderRadius: s * 0.18, border: "4px solid #fff06a", boxShadow: "0 0 18px 5px rgba(255,230,90,0.95)", animation: "glow-pulse 1.2s ease-in-out infinite", zIndex: 6 }} />;
      })}

      {/* ---- tray ---- */}
      <div style={{ position: "absolute", left: TRAY.left, top: TRAY.top, width: TRAY.width, height: TRAY.height, borderRadius: 16, background: WOOD, border: `3px solid ${WOOD_EDGE}`, boxShadow: "0 10px 22px rgba(0,30,70,0.45), inset 0 2px 0 rgba(255,220,170,0.35)", boxSizing: "border-box" }}>
        <div style={{ position: "absolute", inset: 5, borderRadius: 11, background: "rgba(40,22,8,0.55)", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)" }} />
      </div>
      {round.tray.map((sym, i) => {
        const b = slotRect(round.tray.length, i);
        const onBoard = where[i] !== null;
        const dragging = drag?.item === i;
        const dim = !!guide && !guide.items.includes(i) && !onBoard;
        const pulse = !!guide && guide.items.includes(i) && !onBoard && !dragging;
        return (
          <button
            key={`tray-${i}`}
            type="button"
            aria-label={onBoard ? `Slot ${i + 1}: piece is on the board` : `River piece ${i + 1}`}
            {...handlers(i, "tray")}
            style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, padding: 0, border: "none", background: "none", touchAction: "none", cursor: onBoard || !canDrag(i) ? "default" : "grab", pointerEvents: onBoard ? "none" : "auto", zIndex: 4 }}
          >
            {onBoard || dragging ? (
              <div style={{ width: "100%", height: "100%", boxSizing: "border-box", borderRadius: 10, border: "2px dashed rgba(255,220,170,0.35)" }} />
            ) : (
              <div style={{ animation: pulse ? "rr-nudge 1.1s ease-in-out infinite" : undefined, opacity: dim ? 0.35 : 1, filter: pulse ? "drop-shadow(0 0 8px rgba(255,224,102,0.95))" : undefined }}>
                <PieceImg symbol={sym} size={b.w} />
              </div>
            )}
          </button>
        );
      })}

      {spotlight === "cells" && <div aria-hidden style={{ position: "absolute", left: TRAY.left, top: TRAY.top, width: TRAY.width, height: TRAY.height, borderRadius: 16, background: "rgba(4,22,44,0.55)", zIndex: 5 }} />}

      {/* ---- placed pieces (draggable again; tap to send back) ---- */}
      {where.map((k, i) => {
        if (k === null) return null;
        const b = cellRect(n, parseKey(k));
        const litIdx = lit.get(k);
        const dragging = drag?.item === i;
        return (
          <button
            key={`placed-${i}`}
            type="button"
            aria-label={`River piece on the board, row ${parseKey(k).r + 1} column ${parseKey(k).c + 1}`}
            {...handlers(i, "board")}
            style={{ position: "absolute", left: b.x, top: b.y, width: s, height: s, padding: 0, border: "none", background: "none", touchAction: "none", cursor: locked ? "default" : "grab", pointerEvents: locked ? "none" : "auto", zIndex: 5, opacity: dragging ? 0 : 1 }}
          >
            <div key={k} style={{ position: "relative", animation: "rr-drop 360ms var(--ease-pop) both" }}>
              <PieceImg symbol={round.tray[i]} size={s} style={{ filter: litIdx !== undefined ? "drop-shadow(0 0 10px rgba(120,225,255,0.95)) brightness(1.15) saturate(1.2)" : undefined }} />
              {litIdx !== undefined && <div style={{ position: "absolute", inset: 0, borderRadius: s * 0.12, background: "radial-gradient(circle, rgba(200,245,255,0.55) 0%, rgba(120,220,255,0) 70%)", animation: "rr-lit 420ms ease-out both" }} />}
            </div>
          </button>
        );
      })}

      {/* failure markers */}
      {failRings.map((c, i) => {
        const b = cellRect(n, c);
        return <div key={`fail-${i}`} aria-hidden style={{ position: "absolute", left: b.x - 3, top: b.y - 3, width: b.w + 6, height: b.h + 6, borderRadius: s * 0.18, border: `3px ${i === 0 ? "solid" : "dashed"} #ff5a4e`, boxShadow: "0 0 14px rgba(255,90,78,0.8)", animation: "shake-x 420ms ease-in-out, glow-pulse 1.2s ease-in-out 420ms infinite", zIndex: 7 }} />;
      })}

      {/* invalid drop flash */}
      {flash && (
        <div key={flash.seq} aria-hidden onAnimationEnd={() => setFlash(null)} style={{ position: "absolute", ...(() => { const b = cellRect(n, flash.cell); return { left: b.x, top: b.y, width: b.w, height: b.h }; })(), borderRadius: s * 0.14, background: "rgba(255,80,70,0.45)", border: "3px solid #ff5a4e", animation: "rr-invalid 600ms ease-out both", zIndex: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: s * 0.4, fontWeight: 900 }}>
          ✕
        </div>
      )}

      {/* ghost demo: a hand drags the piece to the glowing space */}
      {guide?.demo && demoOn && !drag && (() => {
        const item = guide.items.find((i) => where[i] === null);
        if (item === undefined) return null;
        const from = slotRect(round.tray.length, item);
        const to = cellRect(n, guide.target);
        const vars = { ["--fx" as string]: `${from.x + from.w / 2}px`, ["--fy" as string]: `${from.y + from.h / 2}px`, ["--tx" as string]: `${to.x + to.w / 2}px`, ["--ty" as string]: `${to.y + to.h / 2}px` } as React.CSSProperties;
        return (
          <div aria-hidden style={{ position: "absolute", left: 0, top: 0, zIndex: 20, pointerEvents: "none", animation: "rr-ghost 2.4s ease-in-out infinite", ...vars }}>
            <div style={{ position: "absolute", left: -ps / 2, top: -ps / 2, opacity: 0.7 }}>
              <PieceImg symbol={round.tray[item]} size={ps} />
            </div>
            <div style={{ position: "absolute", left: 4, top: 6, fontSize: 34, filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.45))" }}>👆</div>
          </div>
        );
      })()}

      {/* the piece under the finger */}
      {drag && (
        <div style={{ position: "absolute", left: drag.pos.x, top: drag.pos.y, zIndex: 30, pointerEvents: "none", transform: "scale(1.06)", filter: "drop-shadow(0 12px 14px rgba(0,30,70,0.5))", transition: "width 120ms ease, height 120ms ease" }}>
          <PieceImg symbol={round.tray[drag.item]} size={drag.size} />
        </div>
      )}
    </div>
  );
}
