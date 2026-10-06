"use client";

import { ASSETS, PLAY_AREA } from "../config";
import { RiverLife } from "./RiverLife";

// The painted river scene, brought to life with layers that only touch what
// should move: crisp vector clouds drift across the sky, streaks pour down
// the waterfalls and the river current flows toward the viewer. The
// waterfall and river layers are clipped by masks generated from the
// background (white = water), so towers, rocks and flowers never shimmer.

function svgTile(width: number, height: number, body: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>${body}</svg>`)}")`;
}

// Waterfall streaks: thin vertical lines of varied length and brightness.
const FALL_TILE_A = { w: 18, h: 64 };
const FALL_TEXTURE_A = svgTile(
  FALL_TILE_A.w,
  FALL_TILE_A.h,
  `<g stroke='white' stroke-linecap='round'>
    <line x1='3' y1='2' x2='3' y2='38' stroke-width='1.4' opacity='0.7'/>
    <line x1='9' y1='22' x2='9' y2='62' stroke-width='1' opacity='0.45'/>
    <line x1='14' y1='6' x2='14' y2='28' stroke-width='1.6' opacity='0.8'/>
    <line x1='14' y1='40' x2='14' y2='58' stroke-width='1' opacity='0.4'/>
  </g>`
);
const FALL_TILE_B = { w: 11, h: 90 };
const FALL_TEXTURE_B = svgTile(
  FALL_TILE_B.w,
  FALL_TILE_B.h,
  `<g stroke='#e8f6ff' stroke-linecap='round'>
    <line x1='2' y1='10' x2='2' y2='70' stroke-width='0.9' opacity='0.5'/>
    <line x1='7' y1='50' x2='7' y2='88' stroke-width='1.2' opacity='0.65'/>
    <line x1='7' y1='2' x2='7' y2='20' stroke-width='0.8' opacity='0.4'/>
  </g>`
);

// River current: short curved highlight strokes, like light on ripples.
const RIVER_TILE_A = { w: 120, h: 40 };
const RIVER_TEXTURE_A = svgTile(
  RIVER_TILE_A.w,
  RIVER_TILE_A.h,
  `<g fill='none' stroke='white' stroke-linecap='round'>
    <path d='M8 10 q10 -4 20 0' stroke-width='1.6' opacity='0.75'/>
    <path d='M58 26 q12 -5 24 0' stroke-width='1.4' opacity='0.6'/>
    <path d='M94 13 q8 -3 16 0' stroke-width='1.2' opacity='0.7'/>
    <path d='M30 34 q7 -3 14 0' stroke-width='1' opacity='0.5'/>
  </g>`
);
const RIVER_TILE_B = { w: 170, h: 56 };
const RIVER_TEXTURE_B = svgTile(
  RIVER_TILE_B.w,
  RIVER_TILE_B.h,
  `<g fill='none' stroke='#d8f4ff' stroke-linecap='round'>
    <path d='M14 18 q18 -6 36 0' stroke-width='2' opacity='0.45'/>
    <path d='M96 40 q20 -7 40 0' stroke-width='2.2' opacity='0.4'/>
    <path d='M120 10 q10 -3 20 0' stroke-width='1.4' opacity='0.5'/>
  </g>`
);

// Mist where a fall visibly lands in open water. The three main falls land
// behind the towers, so they get none (it would haze over the gems).
const MIST = [
  { x: 372, y: 402, r: 18, d: 0.4 },
  { x: 268, y: 482, r: 22, d: 0.6 },
];

// Glints on the river surface.
const GLINTS = [
  { x: 40, y: 572, d: 0 },
  { x: 120, y: 590, d: 0.7 },
  { x: 168, y: 566, d: 1.4 },
  { x: 236, y: 584, d: 0.3 },
  { x: 300, y: 568, d: 1.1 },
  { x: 352, y: 596, d: 1.8 },
  { x: 86, y: 620, d: 2.2 },
  { x: 214, y: 628, d: 0.9 },
  { x: 274, y: 612, d: 1.6 },
  { x: 150, y: 650, d: 2.6 },
];

type CloudSpec = { y: number; scale: number; duration: number; delay: number; opacity: number };
const CLOUDS: CloudSpec[] = [
  { y: 52, scale: 1.0, duration: 70, delay: -12, opacity: 0.95 },
  { y: 118, scale: 0.7, duration: 95, delay: -60, opacity: 0.85 },
  { y: 176, scale: 1.25, duration: 82, delay: -40, opacity: 0.9 },
  { y: 236, scale: 0.85, duration: 110, delay: -85, opacity: 0.8 },
  { y: 88, scale: 0.55, duration: 125, delay: -20, opacity: 0.75 },
  { y: 208, scale: 0.6, duration: 140, delay: -105, opacity: 0.7 },
];

function Cloud({ spec, id }: { spec: CloudSpec; id: number }) {
  const w = 170 * spec.scale;
  const h = 70 * spec.scale;
  const gradId = `sw-cloud-grad-${id}`;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 170 70"
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        top: spec.y,
        opacity: spec.opacity,
        filter: "drop-shadow(0 6px 10px rgba(80,90,150,0.18))",
        animation: `sw-cloud-drift ${spec.duration}s linear ${spec.delay}s infinite`,
        willChange: "transform",
      }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#fbf3f4" />
          <stop offset="100%" stopColor="#e3def0" />
        </linearGradient>
      </defs>
      <g fill={`url(#${gradId})`}>
        <ellipse cx="85" cy="54" rx="80" ry="15" />
        <circle cx="48" cy="44" r="22" />
        <circle cx="80" cy="34" r="30" />
        <circle cx="116" cy="40" r="24" />
        <circle cx="140" cy="50" r="15" />
        <circle cx="26" cy="53" r="13" />
      </g>
    </svg>
  );
}

function maskStyle(src: string): React.CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskSize: `${PLAY_AREA.width}px ${PLAY_AREA.height}px`,
    maskSize: `${PLAY_AREA.width}px ${PLAY_AREA.height}px`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    pointerEvents: "none",
  };
}

// A texture strip one tile taller than the screen, slid down by exactly one
// tile per loop so the motion is seamless. Only `transform` animates.
function FlowStrip({ texture, tile, duration, opacity, blend = "screen", drift }: { texture: string; tile: { w: number; h: number }; duration: number; opacity: number; blend?: React.CSSProperties["mixBlendMode"]; drift?: number }) {
  const strip = (
    <div
      style={{
        position: "absolute",
        left: drift ? -tile.w : 0,
        right: 0,
        top: -tile.h,
        bottom: 0,
        backgroundImage: texture,
        backgroundSize: `${tile.w}px ${tile.h}px`,
        animation: `sw-flow-down ${duration}s linear infinite`,
        ["--sw-tile" as string]: `${tile.h}px`,
        willChange: "transform",
      }}
    />
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity, mixBlendMode: blend }}>
      {drift ? (
        <div style={{ position: "absolute", inset: 0, animation: `sw-flow-side ${drift}s linear infinite`, ["--sw-tile-w" as string]: `${tile.w}px` }}>{strip}</div>
      ) : (
        strip
      )}
    </div>
  );
}

export function LivingScene({ dim = 0, activity = "normal" }: { dim?: number; activity?: "normal" | "high" }) {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${ASSETS.background})`,
          backgroundSize: `${PLAY_AREA.width}px ${PLAY_AREA.height}px`,
        }}
      />

      {/* Clouds — fade out before they reach the mountains. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          WebkitMaskImage: "linear-gradient(180deg, #000 0px, #000 230px, transparent 300px)",
          maskImage: "linear-gradient(180deg, #000 0px, #000 230px, transparent 300px)",
        }}
      >
        {CLOUDS.map((c, i) => (
          <Cloud key={i} spec={c} id={i} />
        ))}
      </div>

      {/* Waterfalls pouring */}
      <div style={maskStyle(ASSETS.fallsMask)}>
        <FlowStrip texture={FALL_TEXTURE_A} tile={FALL_TILE_A} duration={0.55} opacity={0.8} />
        <FlowStrip texture={FALL_TEXTURE_B} tile={FALL_TILE_B} duration={0.8} opacity={0.65} />
      </div>
      {MIST.map((m, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: m.x - m.r,
            top: m.y - m.r * 0.6,
            width: m.r * 2,
            height: m.r * 1.2,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(255,255,255,0.75), rgba(230,244,255,0) 70%)",
            animation: `sw-mist 2.4s ease-in-out ${m.d}s infinite`,
          }}
        />
      ))}

      {/* River current */}
      <div style={maskStyle(ASSETS.riverMask)}>
        <FlowStrip texture={RIVER_TEXTURE_A} tile={RIVER_TILE_A} duration={3.2} opacity={0.55} drift={11} />
        <FlowStrip texture={RIVER_TEXTURE_B} tile={RIVER_TILE_B} duration={5} opacity={0.45} drift={17} />
        <RiverLife activity={activity} />
        {GLINTS.map((g, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: g.x - 3,
              top: g.y - 3,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#ffffff",
              boxShadow: "0 0 6px 2px rgba(255,255,255,0.8)",
              animation: `twinkle 2.2s ease-in-out ${g.d}s infinite`,
            }}
          />
        ))}
      </div>

      {dim > 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(8,16,34,${dim})` }} />}
    </div>
  );
}
