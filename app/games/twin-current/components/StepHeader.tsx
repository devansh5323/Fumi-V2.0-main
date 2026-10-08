"use client";

import { PRACTICE_ROUNDS, SAFE_AREA_TOP, SCORED_ROUNDS } from "../config";

type StepHeaderProps = {
  step: number;
  title: string;
  subtitle: string;
  paused: boolean;
  onTogglePause: () => void;
  isPractice: boolean;
  roundLabel: string;
  scoredRoundsDone: number;
  practiceRoundsDone: number;
};

const srOnly: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
};

const glass: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(40,92,160,0.88) 0%, rgba(28,70,130,0.88) 100%)",
  border: "1.5px solid rgba(255,255,255,0.55)",
  boxShadow: "0 6px 16px rgba(10,40,80,0.35)",
  color: "#ffffff",
};

// The top bar: round pause button, the round progress bar (4 segments in
// How to Play, 12 in the scored rounds). There is no timer. Step text is
// screen-reader only.
export function StepHeader({ step, title, subtitle, paused, onTogglePause, isPractice, roundLabel, scoredRoundsDone, practiceRoundsDone }: StepHeaderProps) {
  // How to Play counts its own 4 rounds; the real game then counts 16.
  const segments = isPractice ? PRACTICE_ROUNDS.length : SCORED_ROUNDS;
  const done = isPractice ? practiceRoundsDone : scoredRoundsDone;
  return (
    <div style={{ position: "absolute", top: SAFE_AREA_TOP, left: 10, right: 10, zIndex: 25, display: "flex", alignItems: "center", gap: 8 }}>
      {/* The step text is announced to screen readers only — no visible text panel. */}
      <div key={step} role="status" style={srOnly}>
        {`Step ${step}: ${title}. ${subtitle} ${roundLabel}.`}
      </div>

      <button
        type="button"
        className="tap-scale"
        onClick={onTogglePause}
        aria-label={paused ? "Resume" : "Pause"}
        style={{ ...glass, flexShrink: 0, width: 36, height: 36, borderRadius: "50%", padding: 0, fontSize: 13, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {paused ? "▶" : "❚❚"}
      </button>

      <div
        role="progressbar"
        aria-label={isPractice ? "How to Play progress" : "Quest progress"}
        aria-valuemin={0}
        aria-valuemax={segments}
        aria-valuenow={done}
        style={{ ...glass, flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: isPractice ? 5 : 3, padding: "0 12px", height: 32, borderRadius: 999 }}
      >
        {Array.from({ length: segments }, (_, i) => (
          <div key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: i < done ? (isPractice ? "#ffe08a" : "#ffd75a") : "rgba(255,255,255,0.3)", boxShadow: i < done ? "0 0 6px rgba(255,215,90,0.8)" : "inset 0 0 0 1px rgba(255,255,255,0.35)", transition: "background 300ms ease" }} />
        ))}
      </div>

    </div>
  );
}
