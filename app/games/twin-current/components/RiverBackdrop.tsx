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
  { x: 150, y: 150, d: 0 },
  { x: 250, y: 260, d: 0.8 },
  { x: 120, y: 330, d: 1.6 },
  { x: 300, y: 420, d: 0.4 },
  { x: 200, y: 480, d: 1.2 },
  { x: 140, y: 560, d: 2 },
  { x: 260, y: 640, d: 0.6 },
  { x: 180, y: 220, d: 2.4 },
];

// A texture strip one tile taller than the screen, slid down by exactly one
// tile per loop so the motion is seamless. Only `transform` animates.
function FlowStrip({ texture, tile, duration, opacity, drift }: { texture: string; tile: { w: number; h: number }; duration: number; opacity: number; drift: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, opacity, mixBlendMode: "screen" }}>
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

export function RiverBackdrop({ surge = false, dim = 0 }: { surge?: boolean; dim?: number }) {
  const speed = surge ? 0.3 : 1;
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${ASSETS.background})`, backgroundSize: `${PLAY_AREA.width}px ${PLAY_AREA.height}px` }} />
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
