"use client";

import type { CargoSymbol, RouteRule } from "../types";
import { RULE_CARD_TOP, SYMBOL_NAME } from "../config";
import { gateFor } from "../engine/rules";
import { SymbolIcon } from "./SymbolIcon";

type RuleCardProps = {
  rule: RouteRule;
  categories: CargoSymbol[];
  gateOrder: CargoSymbol[]; // left -> right
  visible: boolean;
  changed: boolean;
};

function positionName(index: number, count: number): string {
  if (index === 0) return "Left";
  if (index === count - 1) return "Right";
  return "Middle";
}

// The mockup's white rule pill: "☀ Sun → Left Gate  ☾ Moon → Right Gate".
export function RuleCard({ rule, categories, gateOrder, visible, changed }: RuleCardProps) {
  const rows = categories.map((sym) => {
    const gate = gateFor(sym, rule, categories);
    return { sym, side: positionName(gateOrder.indexOf(gate), gateOrder.length) };
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        top: RULE_CARD_TOP,
        display: "flex",
        justifyContent: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-8px)",
        transition: "opacity 300ms ease, transform 380ms var(--ease-spring)",
        pointerEvents: "none",
        zIndex: 20,
      }}
    >
      <div
        style={{
          position: "relative",
          background: "rgba(255,255,255,0.97)",
          border: changed ? "2.5px solid #F0A63C" : "2px solid rgba(255,255,255,1)",
          borderRadius: 999,
          padding: "6px 10px",
          boxShadow: "0 8px 20px rgba(10,40,80,0.3)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "4px 12px",
          animation: changed && visible ? "tc-card-flip 520ms var(--ease-spring) both" : undefined,
        }}
      >
        {changed && (
          <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: "#F0A63C", color: "#2a1a04", fontSize: 9.5, fontWeight: 900, letterSpacing: 0.5, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>
            NEW RULE
          </div>
        )}
        {rows.map(({ sym, side }) => (
          <div key={sym} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <SymbolIcon symbol={sym} size={26} />
            <span style={{ fontSize: 12.5, fontWeight: 800, color: "#1d3f6e", whiteSpace: "nowrap" }}>
              {SYMBOL_NAME[sym]} → {side} Gate
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
