"use client";

import { ASSETS, PLAY_AREA } from "../config";

// The design's painted river (Real-ESRGAN upscaled), with the current
// animated on top. The flow layers are clipped by a mask of the water
// pixels, so rocks, lily pads and plants never move. `surge` speeds the
// current up for the between-round "gates open, stream flows" beat.

function svgTile(width: number, height: number, body: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>${body}</svg>`)}")`;
}

// Short curved highlight strokes, like light catching ripples.
const TILE_A = { w: 120, h: 44 };
const TEXTURE_A = svgTile(
  TILE_A.w,
  TILE_A.h,
  `<g fill='none' stroke='white' stroke-linecap='round'>
    <path d='M8 10 q10 -4 20 0' stroke-width='1.8' opacity='0.8'/>
    <path d='M58 28 q12 -5 24 0' stroke-width='1.6' opacity='0.65'/>
    <path d='M94 14 q8 -3 16 0' stroke-width='1.3' opacity='0.75'/>
    <path d='M30 38 q7 -3 14 0' stroke-width='1.1' opacity='0.55'/>
  </g>`
);
const TILE_B = { w: 170, h: 60 };
const TEXTURE_B = svgTile(
  TILE_B.w,
  TILE_B.h,
  `<g fill='none' stroke='#e8fbff' stroke-linecap='round'>
    <path d='M14 18 q18 -6 36 0' stroke-width='2.2' opacity='0.5'/>
    <path d='M96 42 q20 -7 40 0' stroke-width='2.4' opacity='0.45'/>
    <path d='M120 10 q10 -3 20 0' stroke-width='1.5' opacity='0.55'/>
  </g>`
);

const GLINTS = [
  { x: 60, y: 450, d: 0 },
  { x: 300, y: 430, d: 0.8 },
  { x: 90, y: 560, d: 1.6 },
  { x: 330, y: 520, d: 0.4 },
  { x: 40, y: 640, d: 1.2 },
  { x: 300, y: 620, d: 2 },
  { x: 160, y: 470, d: 0.6 },
  { x: 260, y: 680, d: 2.4 },
];

// Small clouds drifting through the strip of sky at the very top only.
const CLOUDS = [
  { y: 38, s: 0.75, dur: 80, delay: -10, o: 0.95 },
  { y: 70, s: 0.55, dur: 105, delay: -60, o: 0.9 },
  { y: 52, s: 0.9, dur: 92, delay: -35, o: 0.85 },
  { y: 86, s: 0.45, dur: 130, delay: -90, o: 0.8 },
];

// Waterfall streaks: thin vertical lines of varied length and brightness.
const FALL_TILE_A = { w: 18, h: 64 };
const FALL_TEXTURE_A = svgTile(
  FALL_TILE_A.w,
  FALL_TILE_A.h,
  `<g stroke='white' stroke-linecap='round'>
    <line x1='3' y1='2' x2='3' y2='38' stroke-width='1.6' opacity='0.85'/>
    <line x1='9' y1='22' x2='9' y2='62' stroke-width='1.1' opacity='0.55'/>
    <line x1='14' y1='6' x2='14' y2='28' stroke-width='1.8' opacity='0.9'/>
    <line x1='14' y1='40' x2='14' y2='58' stroke-width='1.1' opacity='0.5'/>
  </g>`
);
const FALL_TILE_B = { w: 11, h: 90 };
const FALL_TEXTURE_B = svgTile(
  FALL_TILE_B.w,
  FALL_TILE_B.h,
  `<g stroke='#e8f6ff' stroke-linecap='round'>
    <line x1='2' y1='10' x2='2' y2='70' stroke-width='1' opacity='0.6'/>
    <line x1='7' y1='50' x2='7' y2='88' stroke-width='1.3' opacity='0.75'/>
    <line x1='7' y1='2' x2='7' y2='20' stroke-width='0.9' opacity='0.5'/>
  </g>`
);

// Mist where the two waterfall curtains meet the river.
const MIST = [
  { x: 72, y: 246, w: 120, d: 0 },
  { x: 300, y: 246, w: 100, d: 0.9 },
];

function Cloud({ s }: { s: number }) {
  return (
    <svg width={170 * s} height={70 * s} viewBox="0 0 170 70" aria-hidden style={{ display: "block" }}>
      <g fill="#ffffff">
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

// A texture strip one tile taller than the screen, slid down by exactly one
// tile per loop so the motion is seamless. Only `transform` animates.
function FlowStrip({ texture, tile, duration, opacity, drift }: { texture: string; tile: { w: number; h: number }; duration: number; opacity: number; drift: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <div style={{ position: "absolute", inset: 0, animation: `tc-flow-side ${drift}s linear infinite`, ["--tc-tile-w" as string]: `${tile.w}px` }}>
        <div
          style={{
            position: "absolute",
            left: -tile.w,
            right: 0,
            top: -tile.h,
            bottom: 0,
            backgroundImage: texture,
            backgroundSize: `${tile.w}px ${tile.h}px`,
            animation: `tc-flow-down ${duration}s linear infinite`,
            ["--tc-tile" as string]: `${tile.h}px`,
            willChange: "transform",
          }}
        />
      </div>
    </div>
  );
}

function FallStrip({ texture, tile, duration, opacity }: { texture: string; tile: { w: number; h: number }; duration: number; opacity: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: -tile.h,
          bottom: 0,
          backgroundImage: texture,
          backgroundSize: `${tile.w}px ${tile.h}px`,
          animation: `tc-flow-down ${duration}s linear infinite`,
          ["--tc-tile" as string]: `${tile.h}px`,
          willChange: "transform",
        }}
      />
    </div>
  );
}

export function RiverBackdrop({ surge = false, dim = 0 }: { surge?: boolean; dim?: number }) {
  const speed = surge ? 0.3 : 1;
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${ASSETS.background})`, backgroundSize: `${PLAY_AREA.width}px ${PLAY_AREA.height}px` }} />
      <div style={{ position: "absolute", inset: 0, WebkitMaskImage: "linear-gradient(180deg, #000 0, #000 92px, transparent 118px)", maskImage: "linear-gradient(180deg, #000 0, #000 92px, transparent 118px)" }}>
        {CLOUDS.map((c, i) => (
          <div key={i} style={{ position: "absolute", left: 0, top: c.y, opacity: c.o, animation: `tc-cloud-drift ${c.dur}s linear ${c.delay}s infinite`, willChange: "transform" }}>
            <Cloud s={c.s} />
          </div>
        ))}
      </div>
      {/* Waterfall: streaks pour down the two curtains (clipped to the falls mask) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          WebkitMaskImage: `url(${ASSETS.fallsMask})`,
          maskImage: `url(${ASSETS.fallsMask})`,
          WebkitMaskSize: `${PLAY_AREA.width}px ${PLAY_AREA.height}px`,
          maskSize: `${PLAY_AREA.width}px ${PLAY_AREA.height}px`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
        }}
      >
        <FallStrip texture={FALL_TEXTURE_A} tile={FALL_TILE_A} duration={0.5} opacity={0.85} />
        <FallStrip texture={FALL_TEXTURE_B} tile={FALL_TILE_B} duration={0.75} opacity={0.7} />
      </div>
      {MIST.map((m, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: m.x - m.w / 2,
            top: m.y - 14,
            width: m.w,
            height: 28,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(255,255,255,0.85), rgba(235,248,255,0) 70%)",
            animation: `tc-mist 2.4s ease-in-out ${m.d}s infinite`,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          inset: 0,
          WebkitMaskImage: `url(${ASSETS.riverMask})`,
          maskImage: `url(${ASSETS.riverMask})`,
          WebkitMaskSize: `${PLAY_AREA.width}px ${PLAY_AREA.height}px`,
          maskSize: `${PLAY_AREA.width}px ${PLAY_AREA.height}px`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
        }}
      >
        <FlowStrip texture={TEXTURE_A} tile={TILE_A} duration={2.8 * speed} opacity={surge ? 0.75 : 0.55} drift={13} />
        <FlowStrip texture={TEXTURE_B} tile={TILE_B} duration={4.4 * speed} opacity={surge ? 0.6 : 0.42} drift={19} />
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
              boxShadow: "0 0 6px 2px rgba(255,255,255,0.85)",
              animation: `twinkle 2.4s ease-in-out ${g.d}s infinite`,
            }}
          />
        ))}
      </div>
      {dim > 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(8,20,34,${dim})` }} />}
    </div>
  );
}
