"use client";

import { ASSETS, PLAY_AREA } from "../config";

// Shared mine artwork and "wood / parchment / plank" building blocks, in
// the style of the design reference: a dark blue-violet cave, timber
// supports, glowing lanterns and blue crystals, rails underfoot; warm
// parchment panels framed in wood with iron corner brackets.

export const WOOD = "linear-gradient(180deg, #b47a3f 0%, #8d5a2b 45%, #6e421d 100%)";
export const WOOD_EDGE = "#4a2a10";
export const PARCHMENT = "linear-gradient(180deg, #f7e7c4 0%, #ecd6a8 100%)";
export const INK = "#3a230f";
export const TEXT_DISPLAY = "var(--font-display), var(--font-body), system-ui";

export function MineBackdrop({ dim = 0 }: { dim?: number }) {
  const W = PLAY_AREA.width;
  const H = PLAY_AREA.height;
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0e1024" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="mw-cave" cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#2a3170" />
            <stop offset="55%" stopColor="#171a3d" />
            <stop offset="100%" stopColor="#0b0c1c" />
          </radialGradient>
          <linearGradient id="mw-beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5a3415" />
            <stop offset="50%" stopColor="#8a5527" />
            <stop offset="100%" stopColor="#5a3415" />
          </linearGradient>
          <linearGradient id="mw-beam-h" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9a6430" />
            <stop offset="100%" stopColor="#5a3415" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#mw-cave)" />
        {/* rock boulders in the walls */}
        {[
          [20, 120, 60, 44], [370, 90, 55, 40], [10, 330, 48, 70], [385, 300, 50, 60], [30, 520, 70, 52], [360, 540, 64, 50],
          [120, 30, 70, 30], [270, 26, 80, 30], [60, 660, 80, 40], [330, 670, 90, 40], [200, 690, 120, 30],
        ].map(([x, y, rx, ry], i) => (
          <g key={i}>
            <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#252a5a" />
            <ellipse cx={x - rx * 0.2} cy={y - ry * 0.3} rx={rx * 0.55} ry={ry * 0.4} fill="#343b78" opacity={0.7} />
          </g>
        ))}
        {/* timber supports */}
        <rect x={0} y={0} width={18} height={H} fill="url(#mw-beam)" />
        <rect x={W - 18} y={0} width={18} height={H} fill="url(#mw-beam)" />
        <rect x={0} y={22} width={W} height={20} fill="url(#mw-beam-h)" />
        <path d={`M18 42 L70 42 L18 96 Z`} fill="#6e421d" />
        <path d={`M${W - 18} 42 L${W - 70} 42 L${W - 18} 96 Z`} fill="#6e421d" />
        {/* rails underfoot */}
        <g opacity={0.9}>
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={i} x={20 + i * 44} y={H - 26} width={30} height={10} rx={2} fill="#6e421d" />
          ))}
          <rect x={0} y={H - 30} width={W} height={4} fill="#8e96a3" />
          <rect x={0} y={H - 14} width={W} height={4} fill="#8e96a3" />
        </g>
      </svg>
      {/* painted props cut from the design reference */}
      <Prop src={ASSETS.lantern} left={W - 46} top={150} width={40} />
      <Prop src={ASSETS.lantern2} left={4} top={470} width={36} />
      <Prop src={ASSETS.crystalLeft} left={-4} top={210} width={36} />
      <Prop src={ASSETS.crystalRight} left={W - 36} top={420} width={40} />
      {dim > 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(8,8,20,${dim})` }} />}
    </div>
  );
}

function Prop({ src, left, top, width }: { src: string; left: number; top: number; width: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" style={{ position: "absolute", left, top, width, height: "auto", pointerEvents: "none" }} />
  );
}

// A small wooden plank label, like the reference's "ROUND 1" tab.
export function Plank({ children, width = 124 }: { children: React.ReactNode; width?: number }) {
  return (
    <div
      style={{
        width,
        height: 28,
        borderRadius: 6,
        background: WOOD,
        border: `2px solid ${WOOD_EDGE}`,
        boxShadow: "inset 0 2px 0 rgba(255,220,170,0.35), 0 3px 6px rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ padding: "1px 12px", borderRadius: 4, background: PARCHMENT, color: INK, fontFamily: TEXT_DISPLAY, fontWeight: 800, fontSize: 12.5, letterSpacing: 0.5 }}>{children}</div>
    </div>
  );
}

// Parchment panel inside a wooden frame (banners, Found panel, cards).
export function WoodFramePanel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        position: "relative",
        background: WOOD,
        border: `2px solid ${WOOD_EDGE}`,
        borderRadius: 12,
        padding: 5,
        boxShadow: "0 8px 18px rgba(0,0,0,0.55), inset 0 2px 0 rgba(255,220,170,0.3)",
        ...style,
      }}
    >
      <div style={{ position: "relative", height: "100%", background: PARCHMENT, borderRadius: 8, boxShadow: "inset 0 0 14px rgba(140,90,30,0.35)" }}>{children}</div>
      {[
        { left: 3, top: 3 },
        { right: 3, top: 3 },
        { left: 3, bottom: 3 },
        { right: 3, bottom: 3 },
      ].map((pos, i) => (
        <span key={i} style={{ position: "absolute", width: 5, height: 5, borderRadius: "50%", background: "#d7c08d", boxShadow: "0 1px 0 rgba(0,0,0,0.5)", ...pos }} />
      ))}
    </div>
  );
}

// Iron corner brackets for the grid frame.
export function IronCorners() {
  const corner = (rot: number, pos: React.CSSProperties) => (
    <svg width={26} height={26} viewBox="0 0 26 26" style={{ position: "absolute", ...pos, transform: `rotate(${rot}deg)` }} aria-hidden>
      <path d="M2 2 H24 V8 H8 V24 H2 Z" fill="#7d8592" stroke="#3a3f47" strokeWidth={1.5} />
      <circle cx={5} cy={5} r={1.8} fill="#d5dae2" />
      <circle cx={18} cy={5} r={1.4} fill="#d5dae2" />
      <circle cx={5} cy={18} r={1.4} fill="#d5dae2" />
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

// Fumi riding a wooden minecart (replaces the reference's mascot).
// motion: "float" (default, gentle drift), "bounce" (celebrating) or "still".
export function FumiCart({ size = 112, motion = "float" }: { size?: number; motion?: "float" | "bounce" | "still" }) {
  const s = size / 112;
  return (
    <div aria-hidden style={{ position: "relative", width: size, height: size * 1.02, animation: motion === "bounce" ? "mw-cheer 900ms ease-in-out infinite" : motion === "float" ? "float-y 3.2s ease-in-out infinite" : undefined }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ASSETS.fumi} alt="Fumi" style={{ position: "absolute", left: 18 * s, top: 0, width: 78 * s, height: "auto", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))" }} />
      <svg width={size} height={56 * s} viewBox="0 0 112 56" style={{ position: "absolute", left: 0, top: 58 * s }}>
        <path d="M4 6 L108 6 L100 40 L12 40 Z" fill="#9a6430" stroke="#4a2a10" strokeWidth={3} />
        <path d="M8 16 L104 16 M10 27 L102 27" stroke="#6e421d" strokeWidth={2.5} />
        <rect x={2} y={2} width={108} height={8} rx={2} fill="#7d8592" stroke="#3a3f47" strokeWidth={2} />
        <rect x={4} y={10} width={7} height={30} fill="#7d8592" />
        <rect x={101} y={10} width={7} height={30} fill="#7d8592" />
        {[18, 40, 72, 94].map((x) => (
          <circle key={x} cx={x} cy={6} r={1.8} fill="#d5dae2" />
        ))}
        {[28, 84].map((x) => (
          <g key={x}>
            <circle cx={x} cy={44} r={10} fill="#3a3f47" />
            <circle cx={x} cy={44} r={4} fill="#9aa0aa" />
          </g>
        ))}
      </svg>
    </div>
  );
}

// A tiny minecart icon for the progress strip (gold = found).
export function MiniCart({ full }: { full: boolean }) {
  return (
    <svg width={16} height={14} viewBox="0 0 16 14" aria-hidden>
      <path d="M1 2 H15 L13 9 H3 Z" fill={full ? "#ffd23a" : "#8a909a"} stroke={full ? "#a8740a" : "#4a4f57"} strokeWidth={1.2} />
      {full && <path d="M3 3.2 H13" stroke="#fff3b0" strokeWidth={1} />}
      <circle cx={5} cy={11.5} r={1.8} fill="#3a3f47" />
      <circle cx={11} cy={11.5} r={1.8} fill="#3a3f47" />
    </svg>
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
  minHeight: 48,
  border: "2px solid rgba(255,230,190,0.8)",
  borderRadius: 999,
  background: "rgba(40,24,10,0.65)",
  color: "#fff4dc",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
};
