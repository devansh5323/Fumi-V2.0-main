"use client";

import type { Ref } from "react";
import type { CargoSymbol, TargetGlow } from "../types";
import { ASSETS, SPARK_RADIUS } from "../config";
import { SymbolIcon } from "./SymbolIcon";

export const GLOW_COLOR: Record<TargetGlow, string> = {
  green: "#3DDC84",
  purple: "#B45CFF",
  gold: "#FFC93C",
};

export type SparkVisualState = "idle" | "selected" | "absorbed" | "fizzled";

type EnergySparkProps = {
  ref?: Ref<HTMLDivElement>;
  x: number;
  y: number;
  glow: TargetGlow | null;
  glowVisible: boolean;
  cargo: CargoSymbol | null;
  cargoVisible: boolean;
  visualState: SparkVisualState;
  dragging: boolean;
  interactive: boolean;
  animateMoves: boolean;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (e: React.PointerEvent<HTMLDivElement>) => void;
};

const SIZE = SPARK_RADIUS * 2;

const imgStyle: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" };

// Every ball is the design's blue ball once the preview ends. During the
// preview a target cross-fades to its glowing green/purple/yellow ball and
// shows its symbol — so nothing distinguishes a target while it moves.
export function EnergySpark({
  ref,
  x,
  y,
  glow,
  glowVisible,
  cargo,
  cargoVisible,
  visualState,
  dragging,
  interactive,
  animateMoves,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: EnergySparkProps) {
  const lit = glowVisible && glow !== null;
  const glowColor = glow ? GLOW_COLOR[glow] : null;
  const gone = visualState === "absorbed" || visualState === "fizzled";
  const scale = dragging ? 1.15 : gone ? 0.3 : 1;

  return (
    <div
      ref={ref}
      role={interactive ? "button" : undefined}
      aria-label={interactive ? "energy spark" : undefined}
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
        transform: `translate(${x - SPARK_RADIUS}px, ${y - SPARK_RADIUS}px)`,
        transition: animateMoves && !dragging ? "transform 320ms cubic-bezier(0.22,1,0.36,1), opacity 320ms ease" : "opacity 320ms ease",
        opacity: gone ? 0 : 1,
        zIndex: dragging ? 35 : 15,
        cursor: interactive ? (dragging ? "grabbing" : "grab") : "default",
        touchAction: "none",
        pointerEvents: interactive ? "auto" : "none",
      }}
    >
      {/* Soft glow halo in the target's colour (preview only). */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -10,
          borderRadius: "50%",
          background: glowColor ? `radial-gradient(circle, ${glowColor}cc 35%, ${glowColor}00 72%)` : "none",
          opacity: lit ? 1 : 0,
          transition: "opacity 450ms ease",
          animation: lit ? "glow-pulse 1.2s ease-in-out infinite" : undefined,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          transform: `scale(${scale})`,
          transition: "transform 220ms var(--ease-pop), filter 200ms ease",
          filter:
            visualState === "selected"
              ? "drop-shadow(0 0 0 #fff) drop-shadow(0 0 8px rgba(255,255,255,0.95))"
              : visualState === "fizzled"
                ? "hue-rotate(160deg) saturate(1.6)"
                : "drop-shadow(0 4px 5px rgba(0,30,60,0.45))",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ASSETS.ball.neutral} alt="" draggable={false} style={imgStyle} />
        {glow && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ASSETS.ball[glow]} alt="" draggable={false} style={{ ...imgStyle, opacity: lit ? 1 : 0, transition: "opacity 450ms ease" }} />
        )}
        {visualState === "selected" && <div style={{ position: "absolute", inset: -3, borderRadius: "50%", border: "3px solid #ffffff" }} />}
        {cargo && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: cargoVisible ? 1 : 0,
              transition: "opacity 400ms ease",
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.45))",
            }}
          >
            <SymbolIcon symbol={cargo} size={26} />
          </div>
        )}
      </div>
    </div>
  );
}
