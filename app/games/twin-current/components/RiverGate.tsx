"use client";

import type { CargoSymbol, Rect } from "../types";
import { ASSETS } from "../config";
import { SYMBOL_LABEL } from "./SymbolIcon";

export type GateState = "closed" | "open" | "reject";

type RiverGateProps = {
  symbol: CargoSymbol;
  rect: Rect;
  state: GateState;
  visible: boolean;
  highlighted: boolean; // a spark is being dragged over it / is selected
  onClick?: () => void;
};

// The design's neutral stone-and-wood gate. Its symbol is carved in plain
// grey — never a target colour — so only the rule card says which spark
// goes where. Opening lifts the panel like a sluice gate.
export function RiverGate({ symbol, rect, state, visible, highlighted, onClick }: RiverGateProps) {
  const open = state === "open";
  return (
    <button
      type="button"
      aria-label={`${SYMBOL_LABEL[symbol]} gate`}
      onClick={onClick}
      disabled={!visible || !onClick}
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        padding: 0,
        border: "none",
        background: "none",
        cursor: onClick ? "pointer" : "default",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(-18px) scale(0.92)",
        transition: "opacity 380ms ease, transform 420ms var(--ease-spring)",
        pointerEvents: visible ? "auto" : "none",
        animation: state === "reject" ? "shake-x 260ms ease-in-out 2" : undefined,
        zIndex: 12,
      }}
    >
      {/* Water rushing through once the gate lifts */}
      <div
        style={{
          position: "absolute",
          left: "16%",
          right: "16%",
          top: "22%",
          bottom: "6%",
          borderRadius: "40% 40% 6px 6px",
          background: "linear-gradient(180deg, rgba(225,252,255,0.95), rgba(90,200,240,0.9))",
          boxShadow: "0 0 18px rgba(150,235,255,0.9)",
          opacity: open ? 1 : 0,
          transition: "opacity 300ms ease 150ms",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ASSETS.gate(symbol)}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          transformOrigin: "50% 0%",
          transform: open ? "translateY(-38%) scaleY(0.5)" : "none",
          transition: "transform 450ms var(--ease-spring), opacity 450ms ease, filter 150ms ease",
          filter: highlighted
            ? "drop-shadow(0 0 6px #ffffff) drop-shadow(0 0 12px rgba(255,255,255,0.85))"
            : state === "reject"
              ? "drop-shadow(0 0 8px rgba(226,73,63,0.95))"
              : "drop-shadow(0 6px 8px rgba(0,30,40,0.45))",
        }}
      />
    </button>
  );
}
