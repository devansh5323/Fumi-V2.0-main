"use client";

import type { SignalType } from "../types";
import { ASSETS, PLAY_AREA, TOWERS } from "../config";
import { SignalEffect } from "./SignalEffect";

// The design's "Signal Types" strip: one looping example per signal type on
// the middle tower, with a tap/ignore verdict underneath.
const EXAMPLES: { type: SignalType; label: string; correct: boolean }[] = [
  { type: "three-rings", label: "Three Rings", correct: true },
  { type: "two-rings", label: "Two Rings", correct: false },
  { type: "one-ring", label: "One Flash", correct: false },
  { type: "sunlight", label: "Sunlight", correct: false },
  { type: "bubbles", label: "Bubbles", correct: false },
  { type: "fish-splash", label: "Fish", correct: false },
  { type: "leaves", label: "Leaves", correct: false },
  { type: "blue-spark", label: "Blue Spark", correct: false },
];

// Window onto the background around the middle tower (play-area px).
const VIEW = { x: 113, y: 352, width: 164, height: 210 };
const TILE_W = 78;
const TILE_H = Math.round((TILE_W * VIEW.height) / VIEW.width);
const SCALE = TILE_W / VIEW.width;

export function SignalTypesGuide() {
  const tower = TOWERS[1];
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(4, ${TILE_W}px)`, gap: 7, justifyContent: "center" }}>
      {EXAMPLES.map((ex) => (
        <div key={ex.type} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              position: "relative",
              width: TILE_W,
              height: TILE_H,
              borderRadius: 9,
              overflow: "hidden",
              backgroundImage: `url(${ASSETS.background})`,
              backgroundSize: `${PLAY_AREA.width * SCALE}px ${PLAY_AREA.height * SCALE}px`,
              backgroundPosition: `${-VIEW.x * SCALE}px ${-VIEW.y * SCALE}px`,
              boxShadow: ex.correct ? "0 0 0 2px #4cc35a, 0 6px 14px rgba(0,0,0,0.35)" : "0 0 0 1px rgba(255,255,255,0.35), 0 6px 14px rgba(0,0,0,0.35)",
            }}
          >
            <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.width} ${VIEW.height}`} width={TILE_W} height={TILE_H} style={{ position: "absolute", inset: 0, overflow: "hidden" }} aria-hidden>
              <SignalEffect tower={tower} type={ex.type} loop idPrefix={`guide-${ex.type}`} />
            </svg>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 5px",
              borderRadius: 7,
              background: ex.correct ? "#dcf5d6" : "#fde3e3",
              border: ex.correct ? "1.5px solid #4cc35a" : "1px solid #f3c1c1",
              color: "#1d2433",
              fontSize: 9.5,
              fontWeight: 700,
              lineHeight: 1.15,
            }}
          >
            <span
              aria-hidden
              style={{
                flexShrink: 0,
                width: 15,
                height: 15,
                borderRadius: "50%",
                background: ex.correct ? "#3fb34f" : "#e84a4a",
                color: "#fff",
                fontSize: 9,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {ex.correct ? "✓" : "✕"}
            </span>
            <span>
              {ex.label}
              <br />
              <span style={{ fontWeight: 600, opacity: 0.75 }}>{ex.correct ? "Tap!" : "Ignore"}</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
