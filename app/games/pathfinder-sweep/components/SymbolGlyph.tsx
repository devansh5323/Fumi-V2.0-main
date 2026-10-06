"use client";

import { useId } from "react";
import type { MarkVariant, SymbolDefinition } from "../types";

type SymbolGlyphProps = {
  symbol: SymbolDefinition;
  rotationDeg?: number;
  mirrored?: boolean;
  markVariant?: MarkVariant;
  markShiftDeg?: number;
  size?: number;
  strokeWidth?: number;
};

type PathSpec = { d: string; transform?: string; opacity?: number };

// Idle-state rendering must never branch on isTarget/similarity — every
// symbol always renders in this same carved-gold style regardless of
// context. Post-tap feedback (the neon glow ring / "✕") is layered on by
// HexTile, not here.
//
// Carved-gold-on-stone look: each path draws three times — a dark recessed
// "groove" shadow beneath, the gold-gradient metal on top, and a thin
// bright highlight offset toward the light — simulating a beveled engraving
// (per the style guide's "forest symbols" reference) without raster assets
// or SVG filters.
export function SymbolGlyph({
  symbol,
  rotationDeg = 0,
  mirrored = false,
  markVariant = "canonical",
  markShiftDeg = 0,
  size = 40,
  strokeWidth = 6,
}: SymbolGlyphProps) {
  const uid = useId();
  const gradId = `symbol-gold-${uid}`;
  const [vx, vy, vw, vh] = symbol.viewBox.split(" ").map(Number);
  const cx = vx + vw / 2;
  const cy = vy + vh / 2;
  const rigidTransform = `translate(${cx} ${cy}) rotate(${rotationDeg}) scale(${mirrored ? -1 : 1} 1) translate(${-cx} ${-cy})`;

  const paths: PathSpec[] = symbol.corePaths.map((d) => ({ d }));
  if (markVariant !== "removed") {
    paths.push({ d: symbol.markPath, transform: markVariant === "shifted" ? `rotate(${markShiftDeg} ${cx} ${cy})` : undefined });
  }
  if (markVariant === "duplicated") {
    paths.push({ d: symbol.markPath, transform: `rotate(30 ${cx} ${cy}) translate(5 -4)`, opacity: 0.8 });
  }

  return (
    <svg viewBox={symbol.viewBox} width={size} height={size} aria-hidden style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF0C2" />
          <stop offset="45%" stopColor="#F0A63C" />
          <stop offset="100%" stopColor="#9A5F1E" />
        </linearGradient>
      </defs>
      <g transform={rigidTransform} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g stroke="#3A2712" strokeWidth={strokeWidth + 2.5} opacity={0.55} transform="translate(0, 1.4)">
          {paths.map((p, i) => (
            <path key={i} d={p.d} transform={p.transform} opacity={p.opacity} />
          ))}
        </g>
        <g stroke={`url(#${gradId})`} strokeWidth={strokeWidth}>
          {paths.map((p, i) => (
            <path key={i} d={p.d} transform={p.transform} opacity={p.opacity} />
          ))}
        </g>
        <g stroke="#FFF6E0" strokeWidth={Math.max(1, strokeWidth * 0.3)} opacity={0.6} transform="translate(-0.6, -0.6)">
          {paths.map((p, i) => (
            <path key={i} d={p.d} transform={p.transform} opacity={p.opacity} />
          ))}
        </g>
      </g>
    </svg>
  );
}
