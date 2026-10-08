"use client";

import type { CargoSymbol } from "../types";
import { ASSETS, SYMBOL_NAME } from "../config";

export const SYMBOL_LABEL = SYMBOL_NAME;

// One of the design's round symbol badges.
export function SymbolIcon({ symbol, size }: { symbol: CargoSymbol; size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={ASSETS.symbol(symbol)} alt="" aria-hidden draggable={false} style={{ width: size, height: size, objectFit: "contain", display: "block", pointerEvents: "none" }} />
  );
}
