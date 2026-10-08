"use client";

import { ASSETS, START_CARD_TEXT } from "../config";
import { RiverBackdrop } from "./RiverBackdrop";

const SAFE_AREA_TOP = 44;

// Title screen, styled like Signal Watch's: a wooden title sign, a parchment
// instruction card and a glossy green Play button over Twin Current's river.
export function StartScreen({ onPlay }: { onPlay: () => void }) {
  return (
    <>
      <RiverBackdrop />
      <div style={{ position: "absolute", top: SAFE_AREA_TOP + 18, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, zIndex: 5 }}>
        <div style={{ position: "relative", width: 350, animation: "bubble-pop 500ms var(--ease-pop) both" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.titlePlank} alt="" style={{ width: 350, height: "auto", display: "block", filter: "drop-shadow(0 8px 14px rgba(40,20,0,0.35))" }} />
          <h1 style={titleTextStyle}>Twin Current</h1>
        </div>
        <div style={parchmentStyle}>{START_CARD_TEXT}</div>
      </div>
      <button type="button" className="tap-scale" onClick={onPlay} style={{ ...playButtonStyle, position: "absolute", bottom: 46, left: "50%", marginLeft: -110, width: 220, zIndex: 5 }}>
        Play
      </button>
    </>
  );
}

// Cream lettering with a dark-brown outline and drop, matching the painted
// Signal Watch sign.
const titleTextStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  margin: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  paddingBottom: 6,
  fontFamily: "var(--font-display), var(--font-body), system-ui",
  fontSize: 40,
  fontWeight: 800,
  letterSpacing: 0.3,
  color: "#fff4dc",
  WebkitTextStroke: "2px #4a2508",
  paintOrder: "stroke fill",
  textShadow: "0 3px 0 #4a2508, 0 5px 8px rgba(30,12,0,0.55)",
  transform: "rotate(-2deg)",
};

const parchmentStyle: React.CSSProperties = {
  maxWidth: 260,
  background: "linear-gradient(180deg, #fbf1d9 0%, #f1dfb8 100%)",
  border: "2px solid #c9a265",
  borderRadius: 10,
  padding: "10px 16px",
  color: "#3b2a14",
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.45,
  textAlign: "center",
  boxShadow: "0 8px 18px rgba(60,35,10,0.35), inset 0 0 12px rgba(160,110,40,0.18)",
  animation: "bubble-pop 500ms var(--ease-pop) 150ms both",
};

const playButtonStyle: React.CSSProperties = {
  minHeight: 58,
  border: "3px solid #3f8f1f",
  borderRadius: 999,
  background: "linear-gradient(180deg, #a6e45a 0%, #6fc232 48%, #4fa524 52%, #5cb52b 100%)",
  color: "#ffffff",
  fontFamily: "var(--font-display), var(--font-body), system-ui",
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: 0.5,
  textShadow: "0 2px 0 #3a7d18, 0 3px 6px rgba(0,0,0,0.3)",
  cursor: "pointer",
  boxShadow: "inset 0 3px 0 rgba(255,255,255,0.45), 0 6px 0 #2f6f14, 0 12px 20px rgba(0,0,0,0.35)",
};
