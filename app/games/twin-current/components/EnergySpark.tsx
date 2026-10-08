"use client";

import type { Ref } from "react";
import type { CargoSymbol } from "../types";
import { ASSETS, PREVIEW_GLOW, SPARK_RADIUS, SYMBOL_COLOR } from "../config";

// preview  — target lit in its symbol's colour (no symbol yet)
// idle     — the plain bubble every ball looks like while moving
// picked   — selected by the child (white ring), symbol still hidden
// revealed — selected and showing its glowing symbol badge
// wrong    — selected but not one of ours (step 4): greyed bubble with a ✕
// gone     — routed through a gate (or a wrong ball fading out)
export type SparkLook = "idle" | "preview" | "picked" | "revealed" | "wrong" | "gone";

type EnergySparkProps = {
  ref?: Ref<HTMLDivElement>;
  tailRef?: Ref<HTMLDivElement>;
  x: number;
  y: number;
  cargo: CargoSymbol;
  targetSlot: number | null; // which target this is (preview glow colour)
  look: SparkLook;
  dragging: boolean;
  interactive: boolean;
  animateMoves: boolean;
  // While flowing, the motion loop writes `transform` directly each frame,
  // so React must not set it.
  freeMove?: boolean;
  ariaLabel?: string;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (e: React.PointerEvent<HTMLDivElement>) => void;
};

const SIZE = SPARK_RADIUS * 2;
const fill: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" };

const SPARKLES = [
  { x: -8, y: -6, s: 7, d: 0 },
  { x: 40, y: 2, s: 6, d: 0.3 },
  { x: 34, y: 38, s: 5, d: 0.6 },
  { x: -4, y: 34, s: 5, d: 0.9 },
];

export function EnergySpark({
  ref,
  tailRef,
  x,
  y,
  cargo,
  targetSlot,
  look,
  dragging,
  interactive,
  animateMoves,
  freeMove = false,
  ariaLabel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: EnergySparkProps) {
  const color = look === "preview" ? PREVIEW_GLOW[targetSlot ?? 0] : SYMBOL_COLOR[cargo];
  const lit = look === "preview" || look === "revealed";
  const gone = look === "gone";

  return (
    <div
      ref={ref}
      data-tc-ball=""
      role={interactive ? "button" : undefined}
      aria-label={interactive ? (ariaLabel ?? "energy ball") : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: SIZE,
        height: SIZE,
        ...(freeMove ? {} : { transform: `translate(${x - SPARK_RADIUS}px, ${y - SPARK_RADIUS}px)` }),
        transition: animateMoves && !dragging ? "transform 420ms cubic-bezier(0.22,1,0.36,1), opacity 380ms ease" : "opacity 380ms ease",
        opacity: gone ? 0 : 1,
        zIndex: dragging ? 35 : 15,
        cursor: interactive ? (dragging ? "grabbing" : "pointer") : "default",
        touchAction: "none",
        pointerEvents: interactive ? "auto" : "none",
      }}
    >
      {/* Generous invisible tap area — the balls are small and moving. */}
      {interactive && <div aria-hidden style={{ position: "absolute", inset: -12, borderRadius: "50%" }} />}

      {/* Motion trail — rotated/stretched each frame by the motion loop. */}
      <div
        ref={tailRef}
        aria-hidden
        style={{
          position: "absolute",
          left: SPARK_RADIUS,
          top: SPARK_RADIUS - 6,
          width: 0,
          height: 12,
          borderRadius: 6,
          transformOrigin: "0 50%",
          background: "linear-gradient(90deg, rgba(255,255,255,0.7), rgba(200,240,255,0))",
          boxShadow: "0 0 6px rgba(255,255,255,0.5)",
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      {/* Glow halo in the symbol's colour */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: look === "preview" ? -22 : -16,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color} 32%, ${color}88 52%, ${color}00 72%)`,
          opacity: lit ? 1 : 0,
          transition: "opacity 420ms ease",
          animation: lit ? "glow-pulse 1.2s ease-in-out infinite" : undefined,
        }}
      />
      {lit &&
        SPARKLES.map((s, i) => (
          <svg
            key={i}
            width={s.s * 2}
            height={s.s * 2}
            viewBox="-1 -1 2 2"
            style={{ position: "absolute", left: s.x, top: s.y, pointerEvents: "none", animation: `twinkle 1.4s ease-in-out ${s.d}s infinite` }}
            aria-hidden
          >
            <path d="M0 -1 Q0 0 1 0 Q0 0 0 1 Q0 0 -1 0 Q0 0 0 -1 Z" fill="#ffffff" />
          </svg>
        ))}

      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          transform: `scale(${dragging ? 1.15 : gone ? 0.3 : 1})`,
          transition: "transform 240ms var(--ease-pop)",
        }}
      >
        {/* Soft contact shadow (a gradient, not a filter — keeps rendering cheap) */}
        <div aria-hidden style={{ position: "absolute", left: "8%", right: "8%", top: "72%", height: "40%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(0,40,80,0.35), rgba(0,40,80,0) 70%)" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ASSETS.ball} alt="" draggable={false} style={{ ...fill, opacity: look === "revealed" ? 0 : 1, transition: "opacity 300ms ease" }} />
        {/* Preview: the bubble tinted to the symbol colour */}
        <div
          aria-hidden
          style={{
            ...fill,
            borderRadius: "50%",
            background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${color} 40%, ${color} 72%, rgba(0,0,0,0.2) 100%)`,
            boxShadow: `0 0 0 2px #ffffff, 0 0 14px 4px ${color}`,
            opacity: look === "preview" ? 1 : 0,
            transition: "opacity 420ms ease",
          }}
        />
        {/* Revealed: the symbol badge */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ASSETS.symbol(cargo)} alt="" draggable={false} style={{ ...fill, opacity: look === "revealed" ? 1 : 0, transform: look === "revealed" ? "scale(1)" : "scale(0.4)", transition: "opacity 300ms ease, transform 380ms var(--ease-pop)" }} />
        {look === "wrong" && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "rgba(90,100,120,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: SPARK_RADIUS * 1.1,
              fontWeight: 900,
              textShadow: "0 1px 3px rgba(0,0,0,0.5)",
              animation: "bubble-pop 260ms var(--ease-pop) both",
            }}
          >
            ✕
          </div>
        )}
        {look === "picked" && <div aria-hidden style={{ position: "absolute", inset: -4, borderRadius: "50%", border: "3px solid #ffffff", boxShadow: "0 0 12px 3px rgba(255,255,255,0.9)", animation: "bubble-pop 220ms var(--ease-pop) both" }} />}
      </div>
    </div>
  );
}
