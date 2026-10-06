"use client";

import type { SymbolDefinition } from "../types";
import { PLAY_AREA, REFERENCE_BADGE_PINNED, REFERENCE_BADGE_PREVIEW_SIZE } from "../config";
import { SymbolGlyph } from "./SymbolGlyph";
import { BEVEL_SHADOW, HEX_CLIP, STONE_FILL, StoneCracks, StoneGrain } from "./HexTile";

export type ReferenceBadgePhase = "preview" | "pinned";

type ReferenceBadgeProps = {
  symbol: SymbolDefinition;
  phase: ReferenceBadgePhase;
};

const PINNED_LEFT = PLAY_AREA.width - REFERENCE_BADGE_PINNED.size - 14;
const PREVIEW_LEFT = PLAY_AREA.width / 2 - REFERENCE_BADGE_PREVIEW_SIZE / 2;
const PREVIEW_TOP = PLAY_AREA.height * 0.34 - REFERENCE_BADGE_PREVIEW_SIZE / 2;

// The style guide's "reference tile frame" — an ornate gold-ringed hex,
// larger and more decorated than a regular search tile since this is the
// one symbol the child must hold in mind and match against. Crystal accents
// only appear at preview size; at the small pinned size they'd just be
// visual noise.
export function ReferenceBadge({ symbol, phase }: ReferenceBadgeProps) {
  const isPreview = phase === "preview";
  const size = isPreview ? REFERENCE_BADGE_PREVIEW_SIZE : REFERENCE_BADGE_PINNED.size;
  const ringWidth = isPreview ? 6 : 3;

  return (
    <div
      style={{
        position: "absolute",
        top: isPreview ? PREVIEW_TOP : REFERENCE_BADGE_PINNED.top,
        left: isPreview ? PREVIEW_LEFT : PINNED_LEFT,
        width: size,
        height: size,
        transition:
          "top 400ms cubic-bezier(0.22,1,0.36,1), left 400ms cubic-bezier(0.22,1,0.36,1), width 400ms cubic-bezier(0.22,1,0.36,1), height 400ms cubic-bezier(0.22,1,0.36,1)",
        zIndex: 30,
        filter: isPreview ? "drop-shadow(0 20px 50px rgba(0,0,0,0.5))" : "drop-shadow(0 6px 14px rgba(0,0,0,0.4))",
      }}
    >
      <div style={{ position: "absolute", inset: 0, clipPath: HEX_CLIP, background: "linear-gradient(160deg, #ffe9b0, #f0a63c 45%, #8b5a1e 100%)" }} />

      <div
        style={{
          position: "absolute",
          inset: ringWidth,
          clipPath: HEX_CLIP,
          background: STONE_FILL,
          boxShadow: BEVEL_SHADOW,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <StoneGrain seed={3} />
        <StoneCracks variant={1} />
        <SymbolGlyph symbol={symbol} size={isPreview ? 86 : 38} strokeWidth={isPreview ? 7 : 5} />
      </div>

      {isPreview && (
        <>
          <Crystal side="left" />
          <Crystal side="right" />
        </>
      )}
    </div>
  );
}

function Crystal({ side }: { side: "left" | "right" }) {
  const sidePosition: React.CSSProperties = side === "left" ? { left: -10 } : { right: -10 };
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: "38%",
        ...sidePosition,
        width: 14,
        height: 22,
        background: "linear-gradient(160deg, #d8c4ff, #9b5cff 60%, #6425c9)",
        clipPath: "polygon(50% 0%, 100% 35%, 78% 100%, 22% 100%, 0% 35%)",
        boxShadow: "0 0 10px rgba(155,92,255,0.8)",
        animation: "glow-pulse 2.4s ease-in-out infinite",
      }}
    />
  );
}
