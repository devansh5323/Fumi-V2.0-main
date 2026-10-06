"use client";

import { Fumi, type FumiMood } from "../../../components/Fumi";

type FumiCompanionProps = {
  mood?: FumiMood;
  size?: number;
  line?: string | null;
  left?: number;
  top?: number;
  bottom?: number;
  tailWag?: boolean;
};

export function FumiCompanion({ mood = "happy", size = 96, line, left, top, bottom, tailWag }: FumiCompanionProps) {
  // Only pin absolutely when the caller actually supplies a position — used
  // as a floating overlay during gameplay (left/bottom passed) vs. inline
  // in normal document flow (e.g. the summary screen), which needs real
  // flow-height so it doesn't overlap whatever renders after it.
  const isPositioned = left !== undefined || top !== undefined || bottom !== undefined;

  return (
    <div
      style={{
        position: isPositioned ? "absolute" : "relative",
        left,
        top,
        bottom,
        zIndex: 24,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 6,
        // Fumi is purely reactive/decorative here — never itself tappable —
        // and must never block taps on a hex tile that happens to render
        // underneath this corner.
        pointerEvents: "none",
      }}
    >
      {line && (
        <div
          style={{
            position: "relative",
            maxWidth: 220,
            background: "rgba(246,245,255,0.96)",
            color: "var(--color-ink)",
            borderRadius: 16,
            padding: "8px 12px",
            fontFamily: "var(--font-body), system-ui",
            fontWeight: 700,
            fontSize: 13,
            lineHeight: 1.35,
            boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            animation: "bubble-pop 260ms var(--ease-pop) both",
          }}
        >
          {line}
          <div
            style={{
              position: "absolute",
              bottom: -6,
              left: 24,
              width: 12,
              height: 12,
              background: "rgba(246,245,255,0.96)",
              transform: "rotate(45deg)",
            }}
          />
        </div>
      )}
      <Fumi mood={mood} size={size} animate tailWag={tailWag} />
    </div>
  );
}
