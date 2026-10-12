"use client";

import type { CellKind, PieceSymbol } from "../types";
import { ASSETS, PIECE_ART, PIECE_NAMES } from "../config";

// Shared look, from the design reference: bright waterfall valley, sandstone
// board frame, wooden tray, blue stone buttons, navy display type.

export const NAVY = "#123a7a";
export const TEXT_DISPLAY = "var(--font-display), var(--font-body), system-ui";
export const SAND = "linear-gradient(180deg, #ecd9a8 0%, #d6bd85 100%)";
export const SAND_EDGE = "#a8894f";
export const WOOD = "linear-gradient(180deg, #8f5a2c 0%, #6e4220 55%, #5a3418 100%)";
export const WOOD_EDGE = "#3f230d";

export function RiverBackdrop({ dim = 0 }: { dim?: number }) {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#5fb6e6" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ASSETS.background} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      {/* drifting sparkles on the water */}
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${(i * 41 + 7) % 95}%`,
            top: `${30 + ((i * 29) % 65)}%`,
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#ffffff",
            boxShadow: "0 0 8px 2px rgba(190,240,255,0.9)",
            animation: `rr-sparkle ${3 + (i % 4)}s ease-in-out ${i * 0.5}s infinite`,
          }}
        />
      ))}
      {dim > 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(6,30,60,${dim})`, transition: "background 400ms ease" }} />}
    </div>
  );
}

export function TileImg({ kind, size }: { kind: CellKind; size: number }) {
  const label = kind === "S" ? "Start" : kind === "E" ? "End" : kind === "X" ? "Boulder" : "Empty space";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={ASSETS.tiles[kind]} alt={label} draggable={false} style={{ width: size, height: size, display: "block", pointerEvents: "none", userSelect: "none" }} />
  );
}

export function PieceImg({ symbol, size, style }: { symbol: PieceSymbol; size: number; style?: React.CSSProperties }) {
  const art = PIECE_ART[symbol];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={art.src}
      alt={`River piece: ${PIECE_NAMES[symbol]}`}
      draggable={false}
      style={{ width: size, height: size, display: "block", pointerEvents: "none", userSelect: "none", transform: art.flip ? "scaleX(-1)" : undefined, filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.3))", ...style }}
    />
  );
}

// "RIVER RELAY" pill: one dot per round — ticked when done, gold = current.
export function ProgressPill({ total, done, current, practice }: { total: number; done: number; current: number | null; practice: boolean }) {
  return (
    <div role="progressbar" aria-label="Rounds completed" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} style={{ position: "relative", width: 250, height: 46, borderRadius: 999, background: "linear-gradient(180deg, #2b5f95 0%, #1c4372 100%)", border: "2px solid #8fc3ea", boxShadow: "inset 0 2px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(0,30,70,0.45)" }}>
      <div style={{ position: "absolute", left: "50%", top: -9, transform: "translateX(-50%)", padding: "1px 12px", borderRadius: 8, background: "linear-gradient(180deg, #2f6aa3 0%, #1f4a7c 100%)", border: "1.5px solid #8fc3ea", color: "#e8f5ff", fontSize: 10.5, fontWeight: 800, letterSpacing: 1.6, whiteSpace: "nowrap" }}>{practice ? "PRACTICE" : "RIVER RELAY"}</div>
      <div style={{ position: "absolute", left: 22, right: 22, top: 24, height: 3, borderRadius: 2, background: "rgba(160,205,240,0.55)" }} />
      <div style={{ position: "absolute", left: 14, right: 14, top: 13, display: "flex", justifyContent: "space-between" }}>
        {Array.from({ length: total }, (_, i) => {
          const isDone = i < done;
          const isCur = current === i;
          return (
            <div
              key={i}
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 900,
                color: "#fff",
                background: isDone ? "radial-gradient(circle at 40% 35%, #6fd0ff 0%, #2a8fd6 70%)" : isCur ? "radial-gradient(circle at 40% 35%, #fff4b0 0%, #ffc531 55%, #e59a0c 100%)" : "#1a3558",
                border: `2px solid ${isDone ? "#cdeeff" : isCur ? "#fff1b8" : "#5b82ab"}`,
                boxShadow: isCur ? "0 0 12px rgba(255,200,60,0.9)" : isDone ? "0 0 6px rgba(110,200,255,0.7)" : "inset 0 1px 3px rgba(0,0,0,0.6)",
                animation: isCur ? "glow-pulse 1.6s ease-in-out infinite" : undefined,
              }}
            >
              {isDone ? "✓" : isCur ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Lives: same hearts as Lantern Grid (a lost heart pops and greys out).
export function Hearts({ lives, total, size = 17 }: { lives: number; total: number; size?: number }) {
  return (
    <div role="img" aria-label={`${lives} of ${total} lives left`} style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: total }, (_, i) => {
        const full = i < lives;
        return (
          <span key={`${i}-${full}`} style={{ fontSize: size, lineHeight: 1, filter: full ? "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" : "grayscale(1)", opacity: full ? 1 : 0.3, animation: full ? undefined : "lg-heart-lose 700ms ease-out both" }}>
            ❤️
          </span>
        );
      })}
    </div>
  );
}

export function ImageButton({ src, label, onClick, width = 46, height = 43 }: { src: string; label: string; onClick: () => void; width?: number; height?: number }) {
  return (
    <button type="button" className="tap-scale" aria-label={label} onClick={onClick} style={{ width, height, padding: 0, border: "none", background: "none", cursor: "pointer", filter: "drop-shadow(0 3px 5px rgba(0,30,70,0.45))" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={{ width, height }} />
    </button>
  );
}

// The reference's golden "SEND FLOW" pill.
export function SendFlowButton({ onClick, enabled, glow }: { onClick: () => void; enabled: boolean; glow: boolean }) {
  return (
    <button
      type="button"
      className={enabled ? "tap-scale" : undefined}
      aria-label="Send Flow"
      aria-disabled={!enabled}
      onClick={onClick}
      style={{ width: 224, height: 60, padding: 0, border: "none", background: "none", cursor: enabled ? "pointer" : "default", filter: enabled ? "drop-shadow(0 5px 8px rgba(0,30,70,0.45))" : "grayscale(0.85) brightness(0.9) opacity(0.75)", animation: enabled && glow ? "rr-cta-pulse 1.3s ease-in-out infinite" : undefined }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ASSETS.sendFlow} alt="" style={{ width: 224, height: 60, objectFit: "contain" }} />
    </button>
  );
}

export const ctaStyle: React.CSSProperties = {
  minHeight: 54,
  border: "3px solid #c98a0c",
  borderRadius: 999,
  background: "linear-gradient(180deg, #ffe89a 0%, #ffd23f 48%, #f5b81b 52%, #ffc93a 100%)",
  color: NAVY,
  fontFamily: TEXT_DISPLAY,
  fontSize: 21,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "inset 0 3px 0 rgba(255,255,255,0.6), 0 6px 0 #b77a08, 0 12px 20px rgba(0,30,70,0.35)",
};

export const secondaryStyle: React.CSSProperties = {
  minHeight: 46,
  border: "2px solid #8fc3ea",
  borderRadius: 999,
  background: "linear-gradient(180deg, #2b5f95 0%, #1c4372 100%)",
  color: "#eaf6ff",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
};

export const bubbleStyle: React.CSSProperties = {
  position: "relative",
  background: "#ffffff",
  border: "2.5px solid #8fc3ea",
  borderRadius: 16,
  padding: "10px 14px",
  color: NAVY,
  fontSize: 14.5,
  fontWeight: 700,
  lineHeight: 1.38,
  boxShadow: "0 8px 18px rgba(0,30,70,0.3)",
};
