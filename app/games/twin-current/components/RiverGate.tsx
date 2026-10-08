"use client";

import type { CargoSymbol, Rect } from "../types";
import { ASSETS, SYMBOL_NAME, type GateArt } from "../config";

export type GateState = "closed" | "open" | "reject";

type RiverGateProps = {
  symbol: CargoSymbol;
  rect: Rect & { art: GateArt };
  positionLabel: string; // "Left" | "Middle" | "Right"
  state: GateState;
  visible: boolean;
  highlighted: boolean;
};

// The design's stone archway (gold or purple). The round's symbol badge
// sits on the keystone, covering the art's own symbol, so any symbol set
// works. The portal brightens when a ball passes through.
export function RiverGate({ symbol, rect, positionLabel, state, visible, highlighted }: RiverGateProps) {
  const open = state === "open";
  const badge = rect.width * 0.27;
  return (
    <div
      aria-label={`${positionLabel} gate, ${SYMBOL_NAME[symbol]}`}
      role="img"
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.85)",
        transition: "opacity 380ms ease, transform 460ms var(--ease-spring)",
        pointerEvents: "none",
        animation: state === "reject" ? "shake-x 260ms ease-in-out 2" : undefined,
        zIndex: 12,
      }}
    >
      {/* Highlight / reject glow behind the arch (a gradient, not a filter) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "-12%",
          borderRadius: "45%",
          background: highlighted ? "radial-gradient(ellipse, rgba(255,255,255,0.85), rgba(255,255,255,0) 68%)" : "radial-gradient(ellipse, rgba(226,73,63,0.8), rgba(226,73,63,0) 68%)",
          opacity: highlighted || state === "reject" ? 1 : 0,
          transition: "opacity 150ms ease",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ASSETS.gate[rect.art]}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
      {/* Portal flare when a ball goes through */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "30%",
          right: "30%",
          top: "36%",
          bottom: "4%",
          borderRadius: "50% 50% 8px 8px",
          background: "radial-gradient(ellipse at 50% 70%, rgba(255,255,255,0.95), rgba(255,255,255,0) 70%)",
          opacity: open ? 1 : 0,
          transition: "opacity 260ms ease",
        }}
      />
      <div style={{ position: "absolute", left: (rect.width - badge) / 2, top: rect.height * 0.065, width: badge, height: badge }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ASSETS.symbol(symbol)} alt="" style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}
