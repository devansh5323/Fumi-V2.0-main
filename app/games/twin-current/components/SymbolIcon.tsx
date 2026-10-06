"use client";

import type { CargoSymbol } from "../types";
import { ASSETS } from "../config";

export const SYMBOL_LABEL: Record<CargoSymbol, string> = {
  star: "star",
  moon: "moon",
  heart: "heart",
  leaf: "leaf",
  sun: "sun",
  swirl: "swirl",
  butterfly: "butterfly",
  snowflake: "snowflake",
};

// One of the design's 8 coloured symbols (shown on target balls during the
// preview, and on the rule card).
export function SymbolIcon({ symbol, size }: { symbol: CargoSymbol; size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={ASSETS.symbol(symbol)} alt="" aria-hidden draggable={false} style={{ width: size, height: size, objectFit: "contain", display: "block", pointerEvents: "none" }} />
  );
}
