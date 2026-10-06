"use client";

import { HUD_HEIGHT, SAFE_AREA_TOP, THEME_COLOR, TOWERS } from "../config";

type SignalHudProps = {
  label: string;
  isPractice: boolean;
  // Route progress: genuine relay activations so far / total real signals.
  activations: number;
  totalActivations: number;
  paused: boolean;
  onTogglePause: () => void;
};

// Navy, rounded chips matching the design's caption boxes.
const chip: React.CSSProperties = {
  background: "rgba(16,30,56,0.82)",
  border: "1px solid rgba(190,215,255,0.28)",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 800,
  color: "#ffffff",
  whiteSpace: "nowrap",
  boxShadow: "0 4px 12px rgba(10,20,40,0.35)",
};

// The relay route: a line that lights up a little with every real signal
// the child catches, passing the three tower colours along the way.
export function SignalHud({ label, isPractice, activations, totalActivations, paused, onTogglePause }: SignalHudProps) {
  const progress = totalActivations === 0 ? 0 : Math.min(1, activations / totalActivations);

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
        style={{ ...chip, flexShrink: 0, width: 32, height: 32, padding: 0, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {paused ? "▶" : "⏸"}
      </button>

      <div style={{ ...chip, padding: "7px 10px", color: isPractice ? "#ffd27a" : "#ffffff" }}>{label}</div>

      <div
        role="progressbar"
        aria-label="Relay route"
        aria-valuemin={0}
        aria-valuemax={totalActivations}
        aria-valuenow={activations}
        style={{ ...chip, flex: 1, minWidth: 0, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}
      >
        <span style={{ fontSize: 11, opacity: 0.85 }}>Route</span>
        <div style={{ position: "relative", flex: 1, height: 14 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 6, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.18)" }} />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 5,
              height: 5,
              width: `${progress * 100}%`,
              borderRadius: 3,
              background: "linear-gradient(90deg, #3d8bff, #d35cff, #ffb52e)",
              boxShadow: "0 0 8px rgba(255,255,255,0.55)",
              transition: "width 450ms ease",
            }}
          />
          {/* Tower nodes at the start, middle and end of the route */}
          {TOWERS.map((t, i) => {
            const at = i / (TOWERS.length - 1);
            const lit = progress >= at && (activations > 0 || i === 0);
            return (
              <div
                key={t.id}
                style={{
                  position: "absolute",
                  left: `calc(${at * 100}% - 6px)`,
                  top: 1,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: lit ? THEME_COLOR[t.theme].core : "rgba(30,45,75,1)",
                  border: `2px solid ${lit ? THEME_COLOR[t.theme].light : "rgba(255,255,255,0.35)"}`,
                  boxShadow: lit ? `0 0 8px ${THEME_COLOR[t.theme].glow}` : "none",
                  transition: "background 300ms ease, box-shadow 300ms ease",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
