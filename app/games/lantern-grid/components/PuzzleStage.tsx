"use client";

import { useEffect, useRef, useState } from "react";
import type { Puzzle } from "../types";
import {
  OPTION_LETTERS,
  PLAY_AREA,
  RETURN_MS,
  SLIDE_MS,
  WRONG_HOLD_MS,
} from "../config";
import {
  INK,
  IronCorners,
  LanternTile,
  PARCHMENT,
  TEXT_DISPLAY,
  WOOD,
  WOOD_DARK,
  WOOD_EDGE,
} from "./Art";

// Layout of the puzzle area on the 390x700 surface.
export const BOARD = { left: 14, top: 206, size: 362, frame: 12, gap: 6 };
export const TRAY = {
  left: 8,
  top: 580,
  width: 374,
  height: 112,
  pad: 8,
  gap: 8,
};
const CARD_W = (TRAY.width - TRAY.pad * 2 - TRAY.gap * 3) / 4;
const CARD_H = TRAY.height - TRAY.pad * 2;
const CARD_TILE = 66;

type Pos = { x: number; y: number };
export type DropResult = "correct" | "wrong";

function cellGeometry(n: number) {
  const inner = BOARD.size - BOARD.frame * 2;
  const cell = (inner - BOARD.gap * (n - 1)) / n;
  return { inner, cell };
}

function cardHome(i: number): Pos {
  return {
    x: TRAY.left + TRAY.pad + i * (CARD_W + TRAY.gap),
    y: TRAY.top + TRAY.pad,
  };
}

type PuzzleStageProps = {
  puzzle: Puzzle;
  active: boolean; // accepts drags (false while paused / sliding / game over)
  slide: "in" | "out" | "idle";
  onSlideEnd: () => void;
  onAttempt: (optionIndex: number) => DropResult;
};

// The lantern board and the four draggable answer cards. Drag a card onto
// the "?" cell: right -> it locks in with a green glow; wrong -> a ✕ shows
// on the card over the gap, then it slides back to its slot (and is dimmed).
// Dropping anywhere else just returns the card, no life lost.
export function PuzzleStage({
  puzzle,
  active,
  slide,
  onSlideEnd,
  onAttempt,
}: PuzzleStageProps) {
  const n = puzzle.grid.length;
  const { cell } = cellGeometry(n);
  const target = {
    x: BOARD.left + BOARD.frame + puzzle.missing.c * (cell + BOARD.gap),
    y: BOARD.top + BOARD.frame + puzzle.missing.r * (cell + BOARD.gap),
    size: cell,
  };
  const targetCentre = { x: target.x + cell / 2, y: target.y + cell / 2 };
  const correctIdx = puzzle.options.indexOf(puzzle.answer);

  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    idx: number;
    pointerId: number;
    offset: Pos;
    start: Pos;
    moved: boolean;
  } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [drag, setDrag] = useState<{ idx: number; pos: Pos } | null>(null);
  const [fly, setFly] = useState<{
    idx: number;
    pos: Pos;
    cross: boolean;
    moving: boolean;
  } | null>(null);
  const [hot, setHot] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [wrong, setWrong] = useState<number[]>([]);
  const [hint, setHint] = useState<{ idx: number; key: number } | null>(null);
  const hintSeq = useRef(0);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);
  const later = (fn: () => void, ms: number) =>
    timers.current.push(setTimeout(fn, ms));

  // client px -> 390x700 surface px (works if the phone frame is scaled)
  const toLocal = (clientX: number, clientY: number): Pos => {
    const rect = rootRef.current!.getBoundingClientRect();
    const k = rect.width / PLAY_AREA.width;
    return { x: (clientX - rect.left) / k, y: (clientY - rect.top) / k };
  };
  const overTarget = (cardPos: Pos) => {
    const cx = cardPos.x + CARD_W / 2;
    const cy = cardPos.y + CARD_H / 2;
    const m = 22;
    return (
      cx > target.x - m &&
      cx < target.x + cell + m &&
      cy > target.y - m &&
      cy < target.y + cell + m
    );
  };
  const busy = !active || placed || fly !== null;

  const returnHome = (
    idx: number,
    from: Pos,
    cross: boolean,
    thenWrong: boolean,
  ) => {
    setFly({ idx, pos: from, cross, moving: false });
    later(
      () => {
        setFly({ idx, pos: cardHome(idx), cross, moving: true });
        later(() => {
          setFly(null);
          if (thenWrong) setWrong((w) => [...w, idx]);
        }, RETURN_MS + 30);
      },
      cross ? WRONG_HOLD_MS : 30,
    );
  };

  const resolve = (idx: number) => {
    const result = onAttempt(idx);
    if (result === "correct") setPlaced(true);
    // wrong: the card sits over the gap with a ✕, then goes back — it never stays in the grid
    else
      returnHome(
        idx,
        { x: targetCentre.x - CARD_W / 2, y: targetCentre.y - CARD_H / 2 },
        true,
        true,
      );
  };

  const onPointerDown = (e: React.PointerEvent, idx: number) => {
    if (busy || wrong.includes(idx) || dragRef.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toLocal(e.clientX, e.clientY);
    const home = cardHome(idx);
    dragRef.current = {
      idx,
      pointerId: e.pointerId,
      offset: { x: p.x - home.x, y: p.y - home.y },
      start: p,
      moved: false,
    };
    setDrag({ idx, pos: home });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const p = toLocal(e.clientX, e.clientY);
    if (!d.moved && Math.hypot(p.x - d.start.x, p.y - d.start.y) > 6)
      d.moved = true;
    const pos = { x: p.x - d.offset.x, y: p.y - d.offset.y };
    setDrag({ idx: d.idx, pos });
    setHot(d.moved && overTarget(pos));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    const p = toLocal(e.clientX, e.clientY);
    const pos = { x: p.x - d.offset.x, y: p.y - d.offset.y };
    setDrag(null);
    setHot(false);
    if (!d.moved) {
      setHint({ idx: d.idx, key: ++hintSeq.current }); // a tap: nudge "drag me"
      return;
    }
    if (!active) returnHome(d.idx, pos, false, false);
    else if (overTarget(pos)) resolve(d.idx);
    else returnHome(d.idx, pos, false, false);
  };
  const onPointerCancel = () => {
    const d = dragRef.current;
    dragRef.current = null;
    setHot(false);
    setDrag(null);
    if (d) returnHome(d.idx, cardHome(d.idx), false, false);
  };

  return (
    <div
      ref={rootRef}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <div
        onAnimationEnd={(e) => {
          if (
            e.animationName === "lg-slide-in" ||
            e.animationName === "lg-slide-out"
          )
            onSlideEnd();
        }}
        style={{
          position: "absolute",
          inset: 0,
          animation:
            slide === "in"
              ? `lg-slide-in ${SLIDE_MS}ms cubic-bezier(0.2,0.8,0.2,1) both`
              : slide === "out"
                ? `lg-slide-out ${SLIDE_MS}ms cubic-bezier(0.6,0,0.8,0.2) both`
                : undefined,
        }}
      >
        {/* ---- board ---- */}
        <div
          style={{
            position: "absolute",
            left: BOARD.left,
            top: BOARD.top,
            width: BOARD.size,
            height: BOARD.size,
            padding: BOARD.frame,
            boxSizing: "border-box",
            borderRadius: 16,
            background: WOOD,
            border: `2px solid ${WOOD_EDGE}`,
            boxShadow:
              "0 14px 28px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,225,170,0.35)",
          }}
        >
          <IronCorners size={28} />
          <div
            role="grid"
            aria-label={`Lantern grid, ${n} by ${n}`}
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              borderRadius: 8,
              background: "#17181c",
              boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.7)",
              display: "grid",
              gridTemplateColumns: `repeat(${n}, ${cell}px)`,
              gap: BOARD.gap,
            }}
          >
            {puzzle.grid.flatMap((row, r) =>
              row.map((code, c) => {
                const isHole = r === puzzle.missing.r && c === puzzle.missing.c;
                if (!isHole && code)
                  return (
                    <div
                      key={`${r}-${c}`}
                      role="gridcell"
                      aria-label={`${code}`}
                    >
                      <LanternTile code={code} size={cell} radius={7} />
                    </div>
                  );
                return (
                  <div
                    key={`${r}-${c}`}
                    role="gridcell"
                    aria-label={
                      placed
                        ? `Missing lantern filled: ${puzzle.answer}`
                        : "Missing lantern"
                    }
                    style={{
                      position: "relative",
                      width: cell,
                      height: cell,
                      borderRadius: 8,
                    }}
                  >
                    {placed ? (
                      <div
                        style={{
                          position: "relative",
                          animation: "lg-pop 420ms var(--ease-pop) both",
                        }}
                      >
                        <LanternTile
                          code={puzzle.answer}
                          size={cell}
                          radius={8}
                          style={{
                            boxShadow:
                              "0 0 0 3px #4ee06a, 0 0 18px 4px rgba(78,224,106,0.75)",
                          }}
                        />
                        <Sparkles size={cell} />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          boxSizing: "border-box",
                          borderRadius: 8,
                          border: `${hot ? 3 : 2.5}px dashed ${hot ? "#ffd65a" : "rgba(220,220,230,0.7)"}`,
                          background: hot ? "rgba(255,214,90,0.16)" : "#202227",
                          boxShadow: hot
                            ? "0 0 16px rgba(255,214,90,0.6)"
                            : "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "rgba(225,225,232,0.85)",
                          fontFamily: TEXT_DISPLAY,
                          fontWeight: 800,
                          fontSize: cell * 0.5,
                          transition: "all 120ms ease",
                        }}
                      >
                        ?
                      </div>
                    )}
                  </div>
                );
              }),
            )}
          </div>
        </div>

        {/* ---- answer tray ---- */}
        <div
          style={{
            position: "absolute",
            left: TRAY.left,
            top: TRAY.top,
            width: TRAY.width,
            height: TRAY.height,
            boxSizing: "border-box",
            borderRadius: 14,
            background: WOOD,
            border: `2px solid ${WOOD_EDGE}`,
            boxShadow:
              "0 10px 22px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,225,170,0.35)",
          }}
        >
          <IronCorners size={20} />
        </div>
        {puzzle.options.map((code, i) => {
          const home = cardHome(i);
          const away =
            drag?.idx === i || fly?.idx === i || (placed && i === correctIdx);
          const isWrong = wrong.includes(i);
          // The button stays mounted while its card is being dragged (it
          // holds the pointer capture); it just shows an empty slot.
          return (
            <button
              key={i}
              type="button"
              aria-label={`Option ${OPTION_LETTERS[i]}: ${code}${isWrong ? ", not this one" : ""}`}
              aria-disabled={isWrong || busy}
              onPointerDown={(e) => onPointerDown(e, i)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onLostPointerCapture={(e) => {
                // e.g. the browser took over the gesture: never leave a drag stuck
                if (dragRef.current?.pointerId === e.pointerId)
                  onPointerCancel();
              }}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !busy && !isWrong) {
                  e.preventDefault();
                  resolve(i);
                }
              }}
              style={{
                position: "absolute",
                left: home.x,
                top: home.y,
                padding: 0,
                border: "none",
                background: "none",
                touchAction: "none",
                cursor: isWrong || busy ? "default" : "grab",
                pointerEvents: "auto",
              }}
            >
              <div
                key={hint?.idx === i ? hint.key : 0}
                style={{
                  animation:
                    hint?.idx === i ? "lg-nudge 500ms ease-in-out" : undefined,
                }}
              >
                {away ? (
                  <div
                    style={{
                      width: CARD_W,
                      height: CARD_H,
                      boxSizing: "border-box",
                      borderRadius: 10,
                      border: "2px dashed rgba(60,30,10,0.45)",
                      background: "rgba(40,22,8,0.35)",
                    }}
                  />
                ) : (
                  <Card code={code} letter={OPTION_LETTERS[i]} dim={isWrong} />
                )}
              </div>
            </button>
          );
        })}
        {hint && (
          <div
            key={hint.key}
            role="status"
            onAnimationEnd={() => setHint(null)}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: TRAY.top - 26,
              textAlign: "center",
              pointerEvents: "none",
              animation: "lg-toast 1600ms ease-out both",
            }}
          >
            <span
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                background: "rgba(20,12,4,0.85)",
                color: "#ffe9b8",
                fontSize: 12.5,
                fontWeight: 800,
                border: "1px solid rgba(255,220,160,0.5)",
              }}
            >
              Drag the lantern to the ?
            </span>
          </div>
        )}
      </div>

      {/* ---- the card being dragged / flying back ---- */}
      {drag && (
        <div
          style={{
            position: "absolute",
            left: drag.pos.x,
            top: drag.pos.y,
            zIndex: 30,
            transform: "scale(1.08) rotate(-3deg)",
            filter: "drop-shadow(0 14px 16px rgba(0,0,0,0.55))",
            pointerEvents: "none",
          }}
        >
          <Card
            code={puzzle.options[drag.idx]}
            letter={OPTION_LETTERS[drag.idx]}
          />
        </div>
      )}
      {fly && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: fly.pos.x,
            top: fly.pos.y,
            zIndex: 30,
            pointerEvents: "none",
            transition: fly.moving
              ? `left ${RETURN_MS}ms cubic-bezier(0.3,0.7,0.3,1), top ${RETURN_MS}ms cubic-bezier(0.3,0.7,0.3,1)`
              : "none",
            filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.5))",
          }}
        >
          <div
            style={{
              animation:
                fly.cross && !fly.moving
                  ? "lg-shake 420ms ease-in-out"
                  : undefined,
            }}
          >
            <Card
              code={puzzle.options[fly.idx]}
              letter={OPTION_LETTERS[fly.idx]}
              cross={fly.cross}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Card({
  code,
  letter,
  dim = false,
  cross = false,
}: {
  code: Puzzle["answer"];
  letter: string;
  dim?: boolean;
  cross?: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: CARD_W,
        height: CARD_H,
        borderRadius: 10,
        background: WOOD_DARK,
        border: `2px solid ${cross ? "#ff5a4e" : WOOD_EDGE}`,
        boxShadow: cross
          ? "0 0 16px rgba(255,80,70,0.8)"
          : "inset 0 2px 0 rgba(255,225,170,0.25)",
        boxSizing: "border-box",
        opacity: dim ? 0.45 : 1,
        filter: dim ? "grayscale(0.7)" : undefined,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: (CARD_W - 4 - CARD_TILE) / 2,
          top: 5,
        }}
      >
        <LanternTile code={code} size={CARD_TILE} radius={7} />
      </div>
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 3,
          transform: "translateX(-50%)",
          minWidth: 30,
          height: 20,
          borderRadius: 6,
          background: PARCHMENT,
          border: `1.5px solid ${WOOD_EDGE}`,
          color: INK,
          fontFamily: TEXT_DISPLAY,
          fontWeight: 800,
          fontSize: 14,
          lineHeight: "18px",
          textAlign: "center",
          boxShadow: "0 2px 3px rgba(0,0,0,0.4)",
        }}
      >
        {letter}
      </div>
      {(cross || dim) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: 14,
          }}
        >
          <span
            style={{
              width: cross ? 44 : 30,
              height: cross ? 44 : 30,
              borderRadius: "50%",
              background: "#e5483c",
              border: "2.5px solid #fff",
              color: "#fff",
              fontSize: cross ? 26 : 17,
              fontWeight: 900,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 3px 8px rgba(0,0,0,0.5)",
              animation: cross
                ? "lg-pop 300ms var(--ease-pop) both"
                : undefined,
            }}
          >
            ✕
          </span>
        </div>
      )}
    </div>
  );
}

function Sparkles({ size }: { size: number }) {
  return (
    <div
      aria-hidden
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: size / 2 - 4,
              top: size / 2 - 4,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: i % 2 ? "#fff3b0" : "#7dff95",
              boxShadow: "0 0 8px #fff",
              ["--dx" as string]: `${Math.cos(a) * size * 0.62}px`,
              ["--dy" as string]: `${Math.sin(a) * size * 0.62}px`,
              animation: "lg-spark 700ms ease-out both",
            }}
          />
        );
      })}
    </div>
  );
}
