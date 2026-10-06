"use client";

import { ASSETS, RAFT } from "../config";

// Fumi watches from a small raft bobbing on the river. She stays calm
// through every decoy and only reacts (a happy hop) to genuine relay
// activations — `cheerKey` changes once per detected real signal.
export function FumiRaft({ cheerKey }: { cheerKey: number }) {
  const width = 104;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: RAFT.x - width / 2,
        top: RAFT.y - 58,
        width,
        height: 84,
        pointerEvents: "none",
        zIndex: 8,
        animation: "sw-raft-bob 3.4s ease-in-out infinite",
      }}
    >
      {/* Ripple ring around the raft */}
      <div
        style={{
          position: "absolute",
          left: -8,
          right: -8,
          bottom: -4,
          height: 22,
          borderRadius: "50%",
          border: "1.5px solid rgba(230,248,255,0.55)",
          animation: "sw-raft-ripple 3.4s ease-out infinite",
        }}
      />
      {/* Raft: lashed logs */}
      <svg width={width} height={30} viewBox="0 0 104 30" style={{ position: "absolute", left: 0, bottom: 0 }}>
        <ellipse cx="52" cy="24" rx="50" ry="6" fill="rgba(10,30,50,0.35)" />
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <rect x={8 + i * 18} y={4} width={17} height={20} rx={7} fill={i % 2 ? "#9a6a3a" : "#a8763f"} stroke="#5e3b1c" strokeWidth={1} />
            <ellipse cx={16.5 + i * 18} cy={6} rx={6.5} ry={2} fill="#c9965c" opacity={0.7} />
          </g>
        ))}
        <rect x="6" y="9" width="92" height="3" rx="1.5" fill="#6b4520" />
        <rect x="6" y="17" width="92" height="3" rx="1.5" fill="#6b4520" />
      </svg>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={cheerKey}
        src={ASSETS.fumi}
        alt=""
        style={{
          position: "absolute",
          left: (width - 62) / 2,
          bottom: 14,
          width: 62,
          height: "auto",
          filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.35))",
          animation: cheerKey > 0 ? "sw-fumi-hop 600ms var(--ease-pop) both" : undefined,
        }}
      />
    </div>
  );
}
