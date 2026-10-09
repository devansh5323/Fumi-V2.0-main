"use client";

import { Ambient } from "./Ambient";

export type GameEntry = {
  id: string;
  title: string;
  tagline: string;
  skills: string;
  art: string; // image path under /public
  artPosition?: string; // CSS background-position for the thumbnail crop
  accent: string;
};

type GamePickerProps = {
  games: GameEntry[];
  onPick: (id: string) => void;
};

// The shell's home screen inside the phone frame: one card per game.
export function GamePicker({ games, onPick }: GamePickerProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(180deg, var(--color-deep-purple) 0%, var(--color-midnight) 100%)",
        color: "var(--color-soft)",
      }}
    >
      <Ambient tint="violet" />
      {/* The list scrolls; the background and ambient sparkles stay put. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflowY: "auto",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          display: "flex",
          flexDirection: "column",
          padding: "72px 22px 32px",
          gap: 14,
        }}
      >
        <div
          style={{
            position: "relative",
            flexShrink: 0,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display), system-ui",
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: 2,
            }}
          >
            FUMI
          </div>
          <div style={{ fontSize: 13, color: "var(--color-lavender)" }}>
            Pick a quest to play
          </div>
        </div>

        {games.map((g) => (
          <button
            key={g.id}
            type="button"
            className="tap-scale"
            onClick={() => onPick(g.id)}
            style={{
              position: "relative",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: 14,
              borderRadius: 20,
              border: `1px solid ${g.accent}55`,
              background: "rgba(255,255,255,0.06)",
              boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
              color: "inherit",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: 72,
                height: 72,
                borderRadius: 16,
                backgroundImage: `url(${g.art})`,
                backgroundSize: "cover",
                backgroundPosition: g.artPosition ?? "center",
                boxShadow: `0 0 0 2px ${g.accent}66`,
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                minWidth: 0,
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 800 }}>{g.title}</div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--color-lavender)",
                  lineHeight: 1.4,
                }}
              >
                {g.tagline}
              </div>
              <div style={{ fontSize: 11, color: g.accent, fontWeight: 700 }}>
                {g.skills}
              </div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 20, color: g.accent }}>
              ›
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
