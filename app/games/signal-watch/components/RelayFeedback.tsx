"use client";

import type { TowerDef } from "../types";
import { THEME_COLOR } from "../config";

// A detected real signal fires a beam of energy from that tower's gem to
// the next tower in the relay (blue -> purple -> gold -> blue).
export function RelayBeam({ from, to, id }: { from: TowerDef; to: TowerDef; id: string }) {
  const c = THEME_COLOR[from.theme];
  const gradId = `${id}-beam`;
  const midX = (from.gem.x + to.gem.x) / 2;
  const arcY = Math.min(from.gem.y, to.gem.y) - 70;
  const d = `M${from.gem.x} ${from.gem.y} Q${midX} ${arcY} ${to.gem.x} ${to.gem.y}`;
  return (
    <g aria-hidden>
      <defs>
        <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1={from.gem.x} y1={from.gem.y} x2={to.gem.x} y2={to.gem.y}>
          <stop offset="0%" stopColor={c.light} />
          <stop offset="100%" stopColor={THEME_COLOR[to.theme].light} />
        </linearGradient>
        <filter id={`${id}-glow`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <g style={{ animation: "sw-beam-fade 900ms ease-out both" }}>
        <path d={d} fill="none" stroke={`url(#${gradId})`} strokeWidth={9} strokeLinecap="round" opacity={0.6} filter={`url(#${id}-glow)`} pathLength={100} strokeDasharray="100" style={{ animation: "sw-beam-draw 420ms ease-out both" }} />
        <path d={d} fill="none" stroke="#ffffff" strokeWidth={2.4} strokeLinecap="round" pathLength={100} strokeDasharray="100" style={{ animation: "sw-beam-draw 420ms ease-out both" }} />
      </g>
      {/* Arrival burst at the receiving tower */}
      <circle
        cx={to.gem.x}
        cy={to.gem.y}
        r={20}
        fill={THEME_COLOR[to.theme].light}
        opacity={0}
        style={{ transformBox: "view-box", transformOrigin: `${to.gem.x}px ${to.gem.y}px`, animation: "sw-beam-arrive 600ms ease-out 380ms both" }}
      />
    </g>
  );
}

// A false alarm: a very short, soft puff of mist at the tapped tower — no
// cross, no words, no sound of failure.
export function MistPuff({ tower }: { tower: TowerDef }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: tower.gem.x - 34,
        top: tower.gem.y - 24,
        width: 68,
        height: 48,
        pointerEvents: "none",
        zIndex: 12,
      }}
    >
      {[
        { l: 2, t: 12, s: 36, d: 0 },
        { l: 22, t: 0, s: 40, d: 40 },
        { l: 34, t: 16, s: 34, d: 80 },
      ].map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.l,
            top: p.t,
            width: p.s,
            height: p.s,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(248,250,255,1) 0%, rgba(214,224,238,0.85) 40%, rgba(200,212,230,0) 72%)",
            animation: `sw-mist-puff 520ms ease-out ${p.d}ms both`,
          }}
        />
      ))}
    </div>
  );
}
