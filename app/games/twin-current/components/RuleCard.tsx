"use client";

import type { CargoSymbol, RouteRule } from "../types";
import { ASSETS, RULE_CARD_RECT } from "../config";
import { ruleMapping } from "../engine/rules";
import { SymbolIcon } from "./SymbolIcon";

type RuleCardProps = {
  rule: RouteRule;
  categories: CargoSymbol[];
  visible: boolean;
  changed: boolean;
};

// The active routing rule, spelled out as explicit "ball with symbol ->
// gate with symbol" pairs so a child never has to work out what MATCH or
// SWAP means. Parchment styling to sit with the design's wood and stone.
export function RuleCard({ rule, categories, visible, changed }: RuleCardProps) {
  const pairs = ruleMapping(rule, categories);

  return (
    <div
      style={{
        position: "absolute",
        left: RULE_CARD_RECT.x + RULE_CARD_RECT.width / 2,
        top: RULE_CARD_RECT.y,
        transform: `translateX(-50%) ${visible ? "translateY(0)" : "translateY(-10px)"}`,
        opacity: visible ? 1 : 0,
        transition: "opacity 300ms ease, transform 380ms var(--ease-spring)",
        pointerEvents: "none",
        zIndex: 14,
      }}
    >
      {changed && visible && (
        <div
          style={{
            position: "absolute",
            top: -12,
            right: -10,
            background: "#F0A63C",
            color: "#2a1a04",
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 0.4,
            padding: "2px 7px",
            borderRadius: 999,
            boxShadow: "0 3px 8px rgba(0,0,0,0.4)",
            animation: "bubble-pop 300ms var(--ease-pop) both",
            zIndex: 1,
          }}
        >
          NEW RULE
        </div>
      )}
      <div
        style={{
          minWidth: RULE_CARD_RECT.width,
          background: "linear-gradient(180deg, #fbf1d9 0%, #f1dfb8 100%)",
          border: changed ? "2px solid #F0A63C" : "2px solid #c9a265",
          borderRadius: 12,
          padding: "5px 8px 6px",
          boxShadow: "0 8px 18px rgba(40,25,5,0.4)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          animation: changed && visible ? "tc-card-flip 520ms var(--ease-spring) both" : undefined,
        }}
      >
        <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: 1.2, color: "#5b4a2a" }}>
          RULE · {rule === "match" ? "MATCH" : "SWAP"}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {pairs.map(({ from, to }) => (
            <div key={from} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ position: "relative", width: 26, height: 26 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ASSETS.ball.neutral} alt="" style={{ position: "absolute", inset: 0, width: 26, height: 26 }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <SymbolIcon symbol={from} size={16} />
                </div>
              </div>
              <span style={{ color: "#5b4a2a", fontWeight: 900, fontSize: 13 }}>→</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ASSETS.gate(to)} alt="" style={{ width: 25, height: 27, objectFit: "contain" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
