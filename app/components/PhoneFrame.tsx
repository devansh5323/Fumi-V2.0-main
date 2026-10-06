"use client";

const SCREEN_WIDTH = 390;
const SCREEN_HEIGHT = 700;
const BEZEL = 14;
const RADIUS = 44;

type PhoneFrameProps = {
  children: React.ReactNode;
};

// Presentational device mockup — wraps the mobile-first app so it reads as a
// real product screen when viewed in a wide desktop browser, rather than a
// box floating in empty space.
export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div
      style={{
        position: "relative",
        width: SCREEN_WIDTH + BEZEL * 2,
        borderRadius: RADIUS,
        padding: BEZEL,
        background: "linear-gradient(160deg, #2a2a35, #0a0a10)",
        boxShadow: "0 50px 100px -20px rgba(0,0,0,0.7), 0 0 0 1.5px rgba(255,255,255,0.08) inset, 0 0 60px rgba(124,58,237,0.15)",
      }}
    >
      {/* side buttons */}
      <div style={{ position: "absolute", left: -3, top: 120, width: 3, height: 32, borderRadius: 2, background: "#050508" }} />
      <div style={{ position: "absolute", left: -3, top: 165, width: 3, height: 56, borderRadius: 2, background: "#050508" }} />
      <div style={{ position: "absolute", right: -3, top: 150, width: 3, height: 70, borderRadius: 2, background: "#050508" }} />

      <div
        style={{
          position: "relative",
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          borderRadius: RADIUS - BEZEL + 4,
          overflow: "hidden",
          background: "#000",
        }}
      >
        {children}
        {/* dynamic island */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 96,
            height: 26,
            borderRadius: 16,
            background: "#000",
            zIndex: 200,
          }}
        />
      </div>

      {/* home indicator */}
      <div
        style={{
          position: "absolute",
          bottom: BEZEL + 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 120,
          height: 4,
          borderRadius: 2,
          background: "rgba(255,255,255,0.35)",
          zIndex: 200,
        }}
      />
    </div>
  );
}

export const PHONE_SCREEN_SIZE = { width: SCREEN_WIDTH, height: SCREEN_HEIGHT };
