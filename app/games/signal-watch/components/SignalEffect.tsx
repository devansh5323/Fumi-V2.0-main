"use client";

import type { SignalType, TowerDef } from "../types";
import { THEME_COLOR } from "../config";

type SignalEffectProps = {
  tower: TowerDef;
  type: SignalType;
  // Example tiles loop their animation; live signals play it once.
  loop?: boolean;
  // Unique per rendered instance, so SVG filter ids never collide.
  idPrefix: string;
};

const RING_RADII: Record<"three-rings" | "two-rings" | "one-ring", number[]> = {
  "three-rings": [20, 34, 48],
  "two-rings": [24, 40],
  "one-ring": [32],
};

// An arc over the top of the gem, open underneath — the "radio wave" rings
// from the design. Slightly wider than tall.
function arcPath(cx: number, cy: number, r: number): string {
  const rx = r * 1.22;
  const ry = r;
  const a0 = (200 * Math.PI) / 180;
  const a1 = (340 * Math.PI) / 180;
  const x0 = cx + rx * Math.cos(a0);
  const y0 = cy - ry * Math.sin(a0);
  const x1 = cx + rx * Math.cos(a1);
  const y1 = cy - ry * Math.sin(a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${rx} ${ry} 0 1 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

function originStyle(x: number, y: number): React.CSSProperties {
  return { transformBox: "view-box", transformOrigin: `${x}px ${y}px` };
}

const LEAVES = [
  { dx: -46, dy: -10, r: 20, d: 0 },
  { dx: -20, dy: -36, r: 140, d: 0.08 },
  { dx: 10, dy: -20, r: 80, d: 0.16 },
  { dx: 34, dy: -44, r: 210, d: 0.04 },
  { dx: 48, dy: -6, r: 300, d: 0.12 },
];

const BUBBLES = [
  { dx: -30, r: 8, d: 0 },
  { dx: -12, r: 5.5, d: 0.16 },
  { dx: 6, r: 9.5, d: 0.06 },
  { dx: 24, r: 6.5, d: 0.26 },
  { dx: 38, r: 5, d: 0.1 },
  { dx: -40, r: 5, d: 0.34 },
  { dx: 14, r: 4.5, d: 0.42 },
  { dx: -4, r: 6, d: 0.5 },
];

const DROPLETS = [
  { dx: -22, dy: -26 },
  { dx: -10, dy: -38 },
  { dx: 4, dy: -36 },
  { dx: 18, dy: -24 },
  { dx: 26, dy: -10 },
  { dx: -30, dy: -10 },
  { dx: -2, dy: -46 },
];

// Zigzag bolts radiating from the gem for the harmless blue spark.
const BOLTS = [0, 72, 144, 216, 288].map((deg) => {
  const a = (deg * Math.PI) / 180;
  const p = (r: number, off: number) => {
    const aa = a + off;
    return `${(Math.cos(aa) * r).toFixed(1)} ${(Math.sin(aa) * r).toFixed(1)}`;
  };
  return `M${p(8, 0)} L${p(17, 0.35)} L${p(24, -0.2)} L${p(34, 0.25)}`;
});

function hexPath(cx: number, cy: number, r: number): string {
  return (
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i;
      return `${i === 0 ? "M" : "L"}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
    }).join(" ") + " Z"
  );
}

export function SignalEffect({ tower, type, loop = false, idPrefix }: SignalEffectProps) {
  const c = THEME_COLOR[tower.theme];
  const { x, y } = tower.gem;
  const base = tower.base;
  const blurId = `${idPrefix}-blur`;
  const iter = loop ? "infinite" : "1";
  const isRings = type === "three-rings" || type === "two-rings" || type === "one-ring";
  const isWater = type === "bubbles" || type === "fish-splash";

  return (
    <g aria-hidden>
      <defs>
        <filter id={blurId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <radialGradient id={`${idPrefix}-flare`}>
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="35%" stopColor={c.light} stopOpacity="0.7" />
          <stop offset="100%" stopColor={c.core} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${idPrefix}-sun`}>
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="30%" stopColor="#fff6d6" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffe9a8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Gem flare on every tower event, so a lit gem alone never gives the answer away. */}
      <circle
        cx={x}
        cy={y}
        r={isWater ? 16 : 22}
        fill={`url(#${idPrefix}-flare)`}
        style={{ ...originStyle(x, y), animation: "sw-gem-flare 900ms ease-in-out infinite" }}
      />

      {isRings &&
        RING_RADII[type].map((r, i) => (
          <g key={r} style={{ ...originStyle(x, y), animation: `sw-ring-in 320ms var(--ease-pop) ${i * 70}ms both` }}>
            <path d={arcPath(x, y, r)} fill="none" stroke={c.core} strokeWidth={9} strokeLinecap="round" opacity={0.55} filter={`url(#${blurId})`} />
            <path d={arcPath(x, y, r)} fill="none" stroke={c.core} strokeWidth={4.5} strokeLinecap="round" />
            <path d={arcPath(x, y, r)} fill="none" stroke={c.light} strokeWidth={1.8} strokeLinecap="round" />
          </g>
        ))}

      {/* Water ripples under ring pulses — shared by the real signal and the ring decoys. */}
      {isRings &&
        [0, 1, 2].map((i) => (
          <ellipse
            key={`rip${i}`}
            cx={base.x}
            cy={base.y}
            rx={34}
            ry={9}
            fill="none"
            stroke={c.light}
            strokeWidth={1.6}
            style={{ ...originStyle(base.x, base.y), animation: `sw-ripple 1400ms ease-out ${i * 300}ms ${iter}`, opacity: 0 }}
          />
        ))}

      {type === "sunlight" && (
        // Reflected sunlight: warm glare with crossing rays, bokeh and a glint on the water.
        <g style={{ ...originStyle(x, y), animation: `sw-glare 900ms ease-out ${loop ? "infinite alternate" : "both"}` }}>
          <circle cx={x + 6} cy={y - 6} r={38} fill={`url(#${idPrefix}-sun)`} />
          {[20, 70, 125, 160].map((deg, i) => {
            const a = (deg * Math.PI) / 180;
            const len = i % 2 === 0 ? 58 : 36;
            return (
              <line
                key={deg}
                x1={x + 6 - Math.cos(a) * len}
                y1={y - 6 - Math.sin(a) * len}
                x2={x + 6 + Math.cos(a) * len}
                y2={y - 6 + Math.sin(a) * len}
                stroke="#fffbe8"
                strokeWidth={i % 2 === 0 ? 1.8 : 1.1}
                strokeLinecap="round"
                opacity={0.85}
              />
            );
          })}
          {[
            [-26, 22, 6],
            [-40, 36, 4],
            [22, -30, 5],
          ].map(([dx, dy, r], i) => (
            <path key={i} d={hexPath(x + dx, y + dy, r)} fill="#fff3c4" opacity={0.45} />
          ))}
          {[-18, 0, 16].map((dx, i) => (
            <line key={`g${i}`} x1={base.x + dx - 8} y1={base.y + 4 + i * 3} x2={base.x + dx + 8} y2={base.y + 4 + i * 3} stroke="#fffbe8" strokeWidth={1.6} strokeLinecap="round" opacity={0.9} />
          ))}
        </g>
      )}

      {type === "bubbles" &&
        BUBBLES.map((b, i) => (
          <g key={i} style={{ animation: `sw-bubble-rise 1100ms ease-out ${b.d}s ${iter} both` }}>
            <circle cx={base.x + b.dx} cy={base.y - 4} r={b.r} fill="rgba(210,240,255,0.3)" stroke="#f2fbff" strokeWidth={1.8} />
            <circle cx={base.x + b.dx - b.r * 0.35} cy={base.y - 4 - b.r * 0.35} r={b.r * 0.3} fill="#ffffff" opacity={0.85} />
          </g>
        ))}

      {type === "fish-splash" && (
        <>
          <g transform={`translate(${base.x + 4} ${base.y - 2})`}>
            <g style={{ animation: `sw-fish-leap 700ms ease-in-out ${iter} both` }}>
              <g transform="scale(1.6)">
                <path d="M-12 0 C-6 -7 6 -7 11 0 C6 7 -6 7 -12 0 Z" fill="#ff9a3c" stroke="#b5561a" strokeWidth={0.8} />
                <path d="M11 0 L19 -6 L18 6 Z" fill="#ff7a1f" />
                <path d="M-2 -5 L3 -10 L5 -4 Z" fill="#ff7a1f" />
                <circle cx={-6} cy={-1.5} r={1.4} fill="#2a1a0a" />
              </g>
            </g>
          </g>
          {DROPLETS.map((dr, i) => (
            <circle
              key={i}
              cx={base.x - 18}
              cy={base.y}
              r={3}
              fill="#e6f8ff"
              style={{ ["--dx" as string]: `${dr.dx}px`, ["--dy" as string]: `${dr.dy}px`, animation: `sw-droplet 500ms ease-out ${0.55 + i * 0.02}s ${iter} both` }}
            />
          ))}
          <ellipse
            cx={base.x - 18}
            cy={base.y + 2}
            rx={28}
            ry={8}
            fill="none"
            stroke="#e6f8ff"
            strokeWidth={2.2}
            style={{ ...originStyle(base.x - 18, base.y + 2), animation: `sw-ripple 900ms ease-out 0.55s ${iter}`, opacity: 0 }}
          />
        </>
      )}

      {type === "leaves" && (
        <>
          <path
            d={`M${x - 60} ${y + 4} Q${x - 10} ${y - 60} ${x + 58} ${y - 22}`}
            fill="none"
            stroke="#ffe6a3"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray="6 8"
            opacity={0.85}
            filter={`url(#${blurId})`}
          />
          <path d={`M${x - 60} ${y + 4} Q${x - 10} ${y - 60} ${x + 58} ${y - 22}`} fill="none" stroke="#fff4cf" strokeWidth={1.4} strokeLinecap="round" opacity={0.9} />
          {LEAVES.map((l, i) => (
            <g key={i} style={{ animation: `sw-leaf-drift 1100ms ease-in-out ${l.d}s ${loop ? "infinite" : "1"} both` }}>
              <path
                d="M0 -6 C5 -4 6 3 0 7 C-6 3 -5 -4 0 -6 Z"
                transform={`translate(${x + l.dx} ${y + l.dy}) rotate(${l.r})`}
                fill={i % 2 === 0 ? "#f5c542" : "#e9a628"}
                stroke="#a86b12"
                strokeWidth={0.6}
              />
            </g>
          ))}
        </>
      )}

      {type === "blue-spark" && (
        <g transform={`translate(${x} ${y})`}>
          <g style={{ animation: `sw-flash 360ms ease-out ${loop ? "infinite alternate" : "3 alternate"}` }}>
            {BOLTS.map((d, i) => (
              <g key={i}>
                <path d={d} fill="none" stroke="#5cc8ff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" opacity={0.45} filter={`url(#${blurId})`} />
                <path d={d} fill="none" stroke="#dff6ff" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ))}
            <circle r={6} fill="#bfeaff" filter={`url(#${blurId})`} />
            <circle r={3} fill="#ffffff" />
          </g>
        </g>
      )}
    </g>
  );
}
