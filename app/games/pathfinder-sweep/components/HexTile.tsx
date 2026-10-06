"use client";

import { useId } from "react";
import type { SymbolDefinition, TilePosition, TileStimulus } from "../types";
import { SymbolGlyph } from "./SymbolGlyph";

export type HexTileVisualState = "idle" | "correct" | "inert";

type HexTileProps = {
  tile: TileStimulus;
  position: TilePosition;
  symbol: SymbolDefinition;
  visualState: HexTileVisualState;
  interactive: boolean;
  onTap: (tileId: string) => void;
};

export const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

// The mossy stone fill never changes by state — see distractorFactory.ts's
// "never color alone" rule. Only a neon glow ring (green = correct, red =
// wrong) plus an icon (✕) or floating "+1" signal feedback, matching the
// style guide's hex tile reference sheet. Plain neutral gray (old weathered
// rock), pushed noticeably lighter than earlier attempts — the dark
// noise/shadow layers below crush a darker base into looking the same as
// the previous tint, so this needs real headroom to read as gray at a glance.
export const STONE_FILL = "radial-gradient(circle at 32% 28%, #d4d4d8, #9a9a9f 55%, #55555a 100%)";

export const BEVEL_SHADOW =
  "inset 0 2px 4px rgba(255,255,255,0.22), inset 0 -4px 7px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(0,0,0,0.25)";

// Always-on light rim + dark contact shadow — present in every state, not
// just correct/wrong — so a tile's edge is distinguishable regardless of
// what part of the background photo sits behind it.
export const BASE_OUTLINE = ", 0 0 0 1.5px rgba(255,233,176,0.55), 0 0 0 3px rgba(0,0,0,0.35)";

const GLOW_RING_BY_STATE: Record<HexTileVisualState, string> = {
  idle: "",
  correct: ", 0 0 0 3px rgba(61,220,132,0.9), 0 0 20px 6px rgba(61,220,132,0.55)",
  inert: ", 0 0 0 3px rgba(226,73,63,0.9), 0 0 20px 6px rgba(226,73,63,0.55)",
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// A procedural rock texture (SVG feTurbulence) blended over the flat
// gradient fill — without this a hex reads as smooth plastic/glass, not
// stone. Two layers, like real rock: coarse low-frequency noise for big
// mineral blotches/patches, plus fine high-frequency noise for surface
// grain on top. `seed` is derived from the tile id so neighboring tiles
// don't all share the identical pattern.
export function StoneGrain({ seed = 0 }: { seed?: number }) {
  const uid = useId();
  const coarseId = `stone-coarse-${uid}`;
  const fineId = `stone-fine-${uid}`;
  return (
    <>
      <svg
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          mixBlendMode: "overlay",
          opacity: 0.5,
          pointerEvents: "none",
        }}
      >
        <defs>
          <filter id={coarseId}>
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="4" seed={seed} stitchTiles="stitch" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 1.6 1.6 0 -0.3" />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter={`url(#${coarseId})`} />
      </svg>
      <svg
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          mixBlendMode: "overlay",
          opacity: 0.45,
          pointerEvents: "none",
        }}
      >
        <defs>
          <filter id={fineId}>
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed + 11} stitchTiles="stitch" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 1 1 0 0" />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter={`url(#${fineId})`} />
      </svg>
    </>
  );
}

const CRACK_VARIANTS = [
  ["M18 12 L34 30 L27 48", "M76 22 L64 38"],
  ["M20 62 L36 50 L33 32", "M70 60 L82 72"],
  ["M50 8 L44 26 L58 40", "M14 70 L28 60"],
];

// A couple of fissure lines per tile, cycling through a handful of fixed
// patterns (by tile id). Each crack is a dark groove paired with a slightly
// offset light highlight — the same carved-bevel trick as SymbolGlyph's
// gold relief — so it reads as an actual fracture in the rock, not a drawn
// line on top of it.
export function StoneCracks({ variant }: { variant: number }) {
  const paths = CRACK_VARIANTS[variant % CRACK_VARIANTS.length];
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      {paths.map((d, i) => (
        <g key={i}>
          <path d={d} stroke="rgba(255,255,255,0.16)" strokeWidth={1.8} fill="none" strokeLinecap="round" transform="translate(0.7, 0.7)" />
          <path d={d} stroke="rgba(0,0,0,0.6)" strokeWidth={1.4} fill="none" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}

export function HexTile({ tile, position, symbol, visualState, interactive, onTap }: HexTileProps) {
  const glyphSize = Math.round(position.tileSizePx * 0.62);
  const tileHash = hashString(tile.tileId);
  const animation =
    visualState === "correct"
      ? "tile-glow 600ms ease-out forwards"
      : visualState === "inert"
        ? "shake-x 220ms ease-in-out, tile-dissolve 450ms ease-in 220ms forwards"
        : undefined;

  return (
    <button
      type="button"
      aria-label="forest marker tile"
      disabled={!interactive || visualState === "inert"}
      onClick={() => onTap(tile.tileId)}
      style={{
        position: "absolute",
        left: position.x - position.tileSizePx / 2,
        top: position.y - position.tileSizePx / 2,
        width: position.tileSizePx,
        height: position.tileSizePx,
        padding: 0,
        border: "none",
        background: "none",
        cursor: interactive ? "pointer" : "default",
        transform: `rotate(${position.placementTiltDeg}deg)`,
        touchAction: "manipulation",
        overflow: "visible",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          clipPath: HEX_CLIP,
          background: STONE_FILL,
          // No transparent idle border: the light STONE_FILL would show
          // through the border strip, which the grain overlays (positioned
          // to the padding box) don't cover, leaving pale bars on the sides.
          border: visualState === "correct" ? "3px solid #3DDC84" : "none",
          boxShadow: BEVEL_SHADOW + BASE_OUTLINE + GLOW_RING_BY_STATE[visualState],
          transition: "box-shadow 150ms ease, border-color 150ms ease",
          filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.6)) drop-shadow(0 0 10px rgba(0,0,0,0.5))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation,
          overflow: "hidden",
        }}
      >
        <StoneGrain seed={tileHash % 8} />
        <StoneCracks variant={tileHash % CRACK_VARIANTS.length} />

        {/* Mossy corner accent — purely decorative flavor, never a
            correctness signal (that's the glow ring above). */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: -position.tileSizePx * 0.08,
            bottom: -position.tileSizePx * 0.08,
            width: position.tileSizePx * 0.45,
            height: position.tileSizePx * 0.45,
            background: "radial-gradient(circle, rgba(107,168,85,0.5), rgba(107,168,85,0) 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Cancel the tile's cosmetic "resting on uneven ground" tilt so the
            symbol's own semantic rotation (the actual stimulus parameter) is
            never confused with decorative placement rotation. */}
        <div style={{ transform: `rotate(${-position.placementTiltDeg}deg)`, position: "relative" }}>
          <SymbolGlyph
            symbol={symbol}
            rotationDeg={tile.symbolRotationDeg}
            mirrored={tile.mirrored}
            markVariant={tile.markVariant}
            markShiftDeg={tile.markShiftDeg}
            size={glyphSize}
            strokeWidth={Math.max(3, glyphSize * 0.09)}
          />
          {visualState === "inert" && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: glyphSize * 0.9,
                fontWeight: 900,
                color: "#FF6B5E",
                textShadow: "0 0 10px rgba(226,73,63,0.9), 0 2px 6px rgba(0,0,0,0.5)",
                animation: "bubble-pop 180ms var(--ease-pop) both",
              }}
            >
              ✕
            </div>
          )}
        </div>
      </div>

      {visualState === "correct" && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -10,
            left: "50%",
            transform: `translateX(-50%) rotate(${-position.placementTiltDeg}deg)`,
            fontSize: 13,
            fontWeight: 900,
            color: "#FFD27A",
            background: "rgba(20,14,6,0.85)",
            padding: "2px 7px",
            borderRadius: 999,
            whiteSpace: "nowrap",
            animation: "float-up-fade 700ms ease-out both",
            pointerEvents: "none",
          }}
        >
          +1
        </div>
      )}
    </button>
  );
}
