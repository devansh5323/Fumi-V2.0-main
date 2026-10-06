"use client";

const STAR_POSITIONS: [number, number, number, number][] = [
  // x%, y%, size, delay(s)
  [12, 10, 2, 0],
  [80, 6, 3, 0.4],
  [88, 22, 2, 1.1],
  [6, 34, 2, 0.7],
  [92, 44, 2, 1.6],
  [18, 55, 3, 0.2],
  [70, 62, 2, 1.3],
  [40, 8, 2, 0.9],
  [55, 30, 2, 1.8],
  [30, 70, 2, 0.5],
];

// A reusable dark cosmic backdrop: two soft glow blobs for depth + a light
// scattering of twinkling stars. Layer this behind any screen's content for
// visual consistency with the FUMI brand's ambient look.
export function Ambient({ tint = "violet" }: { tint?: "violet" | "forest" }) {
  const glowA = tint === "forest" ? "rgba(46,140,90,0.25)" : "rgba(155,92,255,0.28)";
  const glowB = tint === "forest" ? "rgba(20,60,45,0.4)" : "rgba(124,58,237,0.18)";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden>
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "70%",
          height: "50%",
          background: `radial-gradient(circle, ${glowA}, transparent 70%)`,
          filter: "blur(20px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-15%",
          right: "-15%",
          width: "60%",
          height: "45%",
          background: `radial-gradient(circle, ${glowB}, transparent 70%)`,
          filter: "blur(24px)",
        }}
      />
      {STAR_POSITIONS.map(([x, y, size, delay], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${x}%`,
            top: `${y}%`,
            width: size,
            height: size,
            borderRadius: "50%",
            background: "#ffffff",
            opacity: 0.6,
            animation: `twinkle ${2.4 + (i % 3) * 0.6}s ease-in-out ${delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
