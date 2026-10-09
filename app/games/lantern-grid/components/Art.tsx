"use client";

import type { LanternCode } from "../types";
import { ASSETS, LANTERNS, LIVES } from "../config";

// Shared look, from the design reference: a night grove, warm wood frames
// with iron corners, parchment panels, glowing amber / blue lanterns.

export const WOOD = "linear-gradient(180deg, #c48a4a 0%, #9a6331 45%, #74461f 100%)";
export const WOOD_DARK = "linear-gradient(180deg, #5a3517 0%, #3e2410 100%)";
export const WOOD_EDGE = "#3d2209";
export const PARCHMENT = "linear-gradient(180deg, #f8e8c6 0%, #edd5a6 100%)";
export const INK = "#3b2410";
export const TEXT_DISPLAY = "var(--font-display), var(--font-body), system-ui";
export const GLOW = { amber: "rgba(255,176,46,0.85)", blue: "rgba(84,170,255,0.85)" } as const;

export function GroveBackdrop({ dim = 0 }: { dim?: number }) {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0a0f24" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ASSETS.background} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      {/* fireflies */}
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${(i * 37 + 11) % 96}%`,
            top: `${(i * 53 + 17) % 88}%`,
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: i % 3 ? "#ffd37a" : "#9fd2ff",
            boxShadow: `0 0 8px 2px ${i % 3 ? "rgba(255,200,90,0.8)" : "rgba(120,190,255,0.8)"}`,
            animation: `lg-firefly ${5 + (i % 4)}s ease-in-out ${i * 0.7}s infinite`,
          }}
        />
      ))}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 40%, rgba(4,6,18,0.55) 100%)` }} />
      {dim > 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(6,8,20,${dim})`, transition: "background 500ms ease" }} />}
    </div>
  );
}

// "LANTERN GRID" style wooden plank.
export function Plank({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        padding: "4px 16px",
        borderRadius: 7,
        background: WOOD,
        border: `2px solid ${WOOD_EDGE}`,
        boxShadow: "inset 0 2px 0 rgba(255,225,170,0.4), 0 4px 8px rgba(0,0,0,0.5)",
        ...style,
      }}
    >
      <div style={{ padding: "1px 12px", borderRadius: 4, background: PARCHMENT, color: INK, fontFamily: TEXT_DISPLAY, fontWeight: 800, fontSize: 15, letterSpacing: 0.6, whiteSpace: "nowrap", textAlign: "center" }}>{children}</div>
    </div>
  );
}

// Parchment in a wooden frame with nail heads.
export function Parchment({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ position: "relative", background: WOOD, border: `2px solid ${WOOD_EDGE}`, borderRadius: 12, padding: 5, boxShadow: "0 8px 18px rgba(0,0,0,0.55), inset 0 2px 0 rgba(255,225,170,0.35)", ...style }}>
      <div style={{ position: "relative", height: "100%", background: PARCHMENT, borderRadius: 8, boxShadow: "inset 0 0 14px rgba(140,90,30,0.35)" }}>{children}</div>
      {[
        { left: 3, top: 3 },
        { right: 3, top: 3 },
        { left: 3, bottom: 3 },
        { right: 3, bottom: 3 },
      ].map((pos, i) => (
        <span key={i} style={{ position: "absolute", width: 5, height: 5, borderRadius: "50%", background: "#d9c391", boxShadow: "0 1px 0 rgba(0,0,0,0.5)", ...pos }} />
      ))}
    </div>
  );
}

// Iron corner brackets with rivets (board + tray frames).
export function IronCorners({ size = 24 }: { size?: number }) {
  const corner = (rot: number, pos: React.CSSProperties) => (
    <svg width={size} height={size} viewBox="0 0 26 26" style={{ position: "absolute", ...pos, transform: `rotate(${rot}deg)`, pointerEvents: "none" }} aria-hidden>
      <path d="M2 2 H24 V8 H8 V24 H2 Z" fill="#8a8f98" stroke="#3a3d44" strokeWidth={1.5} />
      <circle cx={5} cy={5} r={1.8} fill="#e0e3e8" />
      <circle cx={18} cy={5} r={1.4} fill="#e0e3e8" />
      <circle cx={5} cy={18} r={1.4} fill="#e0e3e8" />
    </svg>
  );
  return (
    <>
      {corner(0, { left: -4, top: -4 })}
      {corner(90, { right: -4, top: -4 })}
      {corner(270, { left: -4, bottom: -4 })}
      {corner(180, { right: -4, bottom: -4 })}
    </>
  );
}

// A lantern on its dark slate tile (art cut from the reference).
export function LanternTile({ code, size, glow = false, radius = 8, style }: { code: LanternCode; size: number; glow?: boolean; radius?: number; style?: React.CSSProperties }) {
  const l = LANTERNS[code];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={l.src}
      alt={l.name}
      draggable={false}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        display: "block",
        boxShadow: glow ? `0 0 ${size * 0.18}px ${GLOW[l.colour]}` : "inset 0 0 0 1px rgba(0,0,0,0.6)",
        userSelect: "none",
        WebkitUserDrag: "none",
        pointerEvents: "none",
        ...style,
      } as React.CSSProperties}
    />
  );
}

export function Hearts({ lives, size = 18 }: { lives: number; size?: number }) {
  return (
    <div role="img" aria-label={`${lives} of ${LIVES} lives left`} style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: LIVES }, (_, i) => {
        const full = i < lives;
        return (
          <span
            key={`${i}-${full}`}
            style={{
              fontSize: size,
              lineHeight: 1,
              filter: full ? "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" : "grayscale(1)",
              opacity: full ? 1 : 0.3,
              animation: full ? undefined : "lg-heart-lose 700ms ease-out both",
            }}
          >
            ❤️
          </span>
        );
      })}
    </div>
  );
}

// The lantern progression bar: one slot per puzzle, lit with that puzzle's
// answer lantern (colour, glow and symbol) once it is solved.
export function ProgressBar({ lit, width }: { lit: (LanternCode | null)[]; width: number }) {
  const slotW = (width - 46 - 8 - (lit.length - 1) * 2.5) / lit.length;
  const solved = lit.filter(Boolean).length;
  return (
    <div role="progressbar" aria-label="Lanterns lit" aria-valuemin={0} aria-valuemax={lit.length} aria-valuenow={solved} style={{ position: "relative", width, height: 40 }}>
      <div style={{ position: "absolute", left: 18, right: 0, top: 4, bottom: 4, borderRadius: 999, background: WOOD, border: `2px solid ${WOOD_EDGE}`, boxShadow: "inset 0 2px 0 rgba(255,225,170,0.35), 0 4px 10px rgba(0,0,0,0.55)" }}>
        <div style={{ position: "absolute", left: 26, right: 5, top: 4, bottom: 4, borderRadius: 999, background: "#1e1610", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.8)", display: "flex", alignItems: "center", gap: 2.5, padding: "0 3px" }}>
          {lit.map((code, i) => (
            <div key={i} style={{ width: slotW, height: 22, borderRadius: 5, overflow: "hidden", background: code ? undefined : "linear-gradient(180deg, #3a3029 0%, #2a221c 100%)", boxShadow: code ? `0 0 7px ${GLOW[LANTERNS[code].colour]}` : "inset 0 1px 2px rgba(0,0,0,0.7)", flexShrink: 0 }}>
              {code && <LanternTile code={code} size={slotW} radius={0} style={{ height: 22, objectFit: "cover", objectPosition: "50% 45%", transform: "scale(1.5)", animation: "lg-pop 420ms var(--ease-pop) both" }} />}
            </div>
          ))}
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ASSETS.progressLantern} alt="" style={{ position: "absolute", left: 0, top: -6, width: 38, height: "auto", filter: solved ? "drop-shadow(0 0 8px rgba(255,190,80,0.9))" : "saturate(0.7) brightness(0.85)" }} />
    </div>
  );
}

export function ImageButton({ src, label, onClick, size = 40, disabled }: { src: string; label: string; onClick: () => void; size?: number; disabled?: boolean }) {
  return (
    <button type="button" className="tap-scale" aria-label={label} onClick={onClick} disabled={disabled} style={{ width: size, height: size, padding: 0, border: "none", background: "none", cursor: disabled ? "default" : "pointer", filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.5))" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={{ width: size, height: size }} />
    </button>
  );
}

export const playButtonStyle: React.CSSProperties = {
  minHeight: 54,
  border: "3px solid #3f8f1f",
  borderRadius: 999,
  background: "linear-gradient(180deg, #a6e45a 0%, #6fc232 48%, #4fa524 52%, #5cb52b 100%)",
  color: "#ffffff",
  fontFamily: TEXT_DISPLAY,
  fontSize: 22,
  fontWeight: 800,
  textShadow: "0 2px 0 #3a7d18, 0 3px 6px rgba(0,0,0,0.3)",
  cursor: "pointer",
  boxShadow: "inset 0 3px 0 rgba(255,255,255,0.45), 0 6px 0 #2f6f14, 0 12px 20px rgba(0,0,0,0.35)",
};

export const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 46,
  border: "2px solid rgba(255,230,190,0.8)",
  borderRadius: 999,
  background: "rgba(40,24,10,0.7)",
  color: "#fff4dc",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
};

export const speechStyle: React.CSSProperties = {
  position: "relative",
  background: "#fffaf0",
  border: "2px solid #c9a265",
  borderRadius: 16,
  padding: "12px 16px",
  color: INK,
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1.4,
  textAlign: "center",
  boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
};
