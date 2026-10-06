"use client";

import { HUD_HEIGHT, SAFE_AREA_TOP, SCORED_ROUNDS, START_ENERGY } from "../config";

type TwinHudProps = {
  label: string;
  isPractice: boolean;
  scoredRoundsDone: number;
  energy: number;
  paused: boolean;
  onTogglePause: () => void;
};

const pill: React.CSSProperties = {
  background: "rgba(10,8,20,0.78)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  color: "var(--color-soft)",
  whiteSpace: "nowrap",
};

// Pause, round label, a segmented progress meter (one segment per scored
// round) and the river's energy level.
export function TwinHud({ label, isPractice, scoredRoundsDone, energy, paused, onTogglePause }: TwinHudProps) {
  const energyPct = Math.max(0, Math.min(1, energy / START_ENERGY));
  const lowEnergy = energyPct <= 0.3;

  return (
    <div
      style={{
        position: "absolute",
        top: SAFE_AREA_TOP,
        left: 0,
        right: 0,
        height: HUD_HEIGHT,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 14px",
        zIndex: 25,
      }}
    >
      <button
        type="button"
        className="tap-scale"
        onClick={onTogglePause}
        aria-label={paused ? "Resume" : "Pause"}
        style={{
          ...pill,
          flexShrink: 0,
          width: 30,
          height: 30,
          padding: 0,
          fontSize: 13,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {paused ? "▶" : "⏸"}
      </button>

      <div style={{ ...pill, padding: "6px 10px", color: isPractice ? "#F0C572" : "var(--color-soft)" }}>{label}</div>

      <div
        role="progressbar"
        aria-label="Quest progress"
        aria-valuemin={0}
        aria-valuemax={SCORED_ROUNDS}
        aria-valuenow={scoredRoundsDone}
        style={{ ...pill, flex: 1, minWidth: 0, display: "flex", gap: 2, padding: "7px 8px" }}
      >
        {Array.from({ length: SCORED_ROUNDS }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: i < scoredRoundsDone ? "linear-gradient(90deg, #4fd3e6, #9bf0ff)" : "rgba(255,255,255,0.14)",
              transition: "background 300ms ease",
            }}
          />
        ))}
      </div>

      <div style={{ ...pill, display: "flex", alignItems: "center", gap: 5, padding: "5px 9px" }} aria-label={`Energy ${energy}`}>
        <span style={{ fontSize: 12 }}>⚡</span>
        <div style={{ width: 38, height: 7, borderRadius: 4, background: "rgba(255,255,255,0.14)", overflow: "hidden" }}>
          <div
            style={{
              width: `${energyPct * 100}%`,
              height: "100%",
              background: lowEnergy ? "#FF9D9D" : "linear-gradient(90deg, #F0A63C, #FFD27A)",
              transition: "width 400ms ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}
