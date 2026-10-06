"use client";

// Constant, UNSCORED river noise: drifting leaves, jumping fish, rising
// bubbles and stray ripples, all looping on their own clocks. Rendered
// inside the river mask (see LivingScene) so it never covers flowers or
// rocks. "high" activity (ages 11–16) adds more of everything.

type Activity = "normal" | "high";

const LEAVES = [
  { y: 586, dur: 16, delay: -2, rot: 20, s: 1 },
  { y: 618, dur: 21, delay: -9, rot: 140, s: 0.85 },
  { y: 652, dur: 18, delay: -14, rot: 260, s: 1.1 },
  { y: 600, dur: 24, delay: -5, rot: 80, s: 0.75, high: true },
  { y: 668, dur: 19, delay: -11, rot: 300, s: 0.9, high: true },
];

const FISH = [
  { x: 120, y: 630, dur: 7.5, delay: -1, flip: false },
  { x: 268, y: 604, dur: 9, delay: -5, flip: true },
  { x: 60, y: 662, dur: 11, delay: -8, flip: false, high: true },
  { x: 330, y: 650, dur: 8.5, delay: -3, flip: true, high: true },
];

const BUBBLE_SPOTS = [
  { x: 96, y: 600, dur: 3.2, delay: -0.5 },
  { x: 238, y: 640, dur: 3.8, delay: -2 },
  { x: 312, y: 592, dur: 2.9, delay: -1.2 },
  { x: 160, y: 668, dur: 3.5, delay: -2.6, high: true },
  { x: 36, y: 624, dur: 3.1, delay: -0.9, high: true },
];

const RIPPLES = [
  { x: 150, y: 596, dur: 4.2, delay: -1 },
  { x: 290, y: 640, dur: 5, delay: -3 },
  { x: 70, y: 646, dur: 4.6, delay: -2.2 },
  { x: 228, y: 670, dur: 3.8, delay: -0.4, high: true },
  { x: 360, y: 610, dur: 4.4, delay: -2.8, high: true },
];

export function RiverLife({ activity }: { activity: Activity }) {
  const keep = <T extends { high?: boolean }>(items: T[]) => items.filter((i) => activity === "high" || !i.high);
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {keep(RIPPLES).map((r, i) => (
        <div
          key={`r${i}`}
          style={{
            position: "absolute",
            left: r.x - 22,
            top: r.y - 6,
            width: 44,
            height: 12,
            borderRadius: "50%",
            border: "1.5px solid rgba(235,250,255,0.7)",
            animation: `sw-ambient-ripple ${r.dur}s ease-out ${r.delay}s infinite`,
          }}
        />
      ))}

      {keep(BUBBLE_SPOTS).map((b, i) => (
        <div key={`b${i}`} style={{ position: "absolute", left: b.x, top: b.y }}>
          {[0, 1, 2].map((k) => (
            <div
              key={k}
              style={{
                position: "absolute",
                left: k * 6 - 6,
                top: 0,
                width: 5 - k,
                height: 5 - k,
                borderRadius: "50%",
                border: "1px solid rgba(235,250,255,0.9)",
                background: "rgba(255,255,255,0.15)",
                animation: `sw-ambient-bubble ${b.dur}s ease-out ${b.delay + k * 0.35}s infinite`,
              }}
            />
          ))}
        </div>
      ))}

      {keep(FISH).map((f, i) => (
        <div key={`f${i}`} style={{ position: "absolute", left: f.x, top: f.y, transform: f.flip ? "scaleX(-1)" : undefined }}>
          <svg width="40" height="40" viewBox="-20 -30 40 40" style={{ overflow: "visible", animation: `sw-ambient-fish ${f.dur}s ease-in-out ${f.delay}s infinite` }}>
            <path d="M-8 0 C-4 -5 4 -5 7 0 C4 5 -4 5 -8 0 Z" fill="#ffb15c" stroke="#b5641f" strokeWidth={0.7} />
            <path d="M7 0 L13 -4 L12 4 Z" fill="#ff8c33" />
          </svg>
          <div
            style={{
              position: "absolute",
              left: -14,
              top: 4,
              width: 28,
              height: 8,
              borderRadius: "50%",
              border: "1.5px solid rgba(235,250,255,0.8)",
              animation: `sw-ambient-fish-ripple ${f.dur}s ease-out ${f.delay}s infinite`,
            }}
          />
        </div>
      ))}

      {keep(LEAVES).map((l, i) => (
        <div
          key={`l${i}`}
          style={{
            position: "absolute",
            left: 0,
            top: l.y,
            animation: `sw-ambient-leaf ${l.dur}s linear ${l.delay}s infinite`,
          }}
        >
          <svg width={18 * l.s} height={18 * l.s} viewBox="-9 -9 18 18" style={{ animation: `sw-ambient-leaf-spin ${l.dur / 3}s ease-in-out infinite alternate` }}>
            <path d="M0 -7 C6 -5 7 4 0 8 C-7 4 -6 -5 0 -7 Z" transform={`rotate(${l.rot})`} fill="#7fb24a" stroke="#4d7a28" strokeWidth={0.8} />
            <path d="M0 -6 L0 7" transform={`rotate(${l.rot})`} stroke="#4d7a28" strokeWidth={0.6} />
          </svg>
        </div>
      ))}
    </div>
  );
}
