"use client";

import { useCallback, useState } from "react";
import { ASSETS, FUMI_PERCH, GREETING_HOLD_MS } from "../config";
import { Typewriter } from "../../../components/Typewriter";

type FumiGuideProps = {
  speech: string;
  // Called once the line has finished typing and been held on screen.
  onDone: () => void;
};

// Fumi appears above the towers only to introduce the tutorial: her line
// types out letter by letter in a speech bubble, stays up briefly, then she
// and the bubble fade away before the tutorial begins.
export function FumiGuide({ speech, onDone }: FumiGuideProps) {
  const size = 74;
  const [leaving, setLeaving] = useState(false);

  const handleTyped = useCallback(() => {
    setTimeout(() => setLeaving(true), GREETING_HOLD_MS);
    setTimeout(onDone, GREETING_HOLD_MS + 350);
  }, [onDone]);

  return (
    <div
      style={{
        position: "absolute",
        left: FUMI_PERCH.x - size / 2,
        top: FUMI_PERCH.y - size / 2,
        width: size,
        height: size,
        pointerEvents: "none",
        zIndex: 18,
        opacity: leaving ? 0 : 1,
        transform: leaving ? "scale(0.85)" : "scale(1)",
        transition: "opacity 320ms ease, transform 320ms ease",
        animation: "bubble-pop 360ms var(--ease-pop) both",
      }}
    >
      <div
        role="status"
        style={{
          position: "absolute",
          left: "50%",
          bottom: size + 10,
          width: 230,
          marginLeft: -115,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            background: "#ffffff",
            color: "#1d2433",
            borderRadius: 16,
            padding: "9px 14px",
            fontSize: 13.5,
            fontWeight: 700,
            lineHeight: 1.35,
            textAlign: "center",
            minHeight: 56,
            boxShadow: "0 8px 20px rgba(10,30,60,0.35)",
          }}
        >
          <Typewriter text={speech} onDone={handleTyped} speedMultiplier={1.1} />
          {/* tail pointing down at Fumi */}
          <div style={{ position: "absolute", left: "50%", bottom: -7, width: 14, height: 14, marginLeft: -7, background: "#ffffff", transform: "rotate(45deg)" }} />
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, animation: "float-y 3.2s ease-in-out infinite" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ASSETS.fumi} alt="Fumi" style={{ width: size, height: "auto", display: "block" }} />
      </div>
    </div>
  );
}
