"use client";

import { PLAY_AREA } from "../config";
import { regionCenter } from "../engine/scatterLayout";

type FireflyCueProps = {
  regionId: number | null;
  active: boolean;
};

const DIRECTIONAL_OFFSETS: [number, number][] = [
  [-16, -10],
  [12, -16],
  [-8, 14],
  [18, 8],
  [2, -22],
];

const AMBIENT_OFFSETS: [number, number][] = [
  [-100, -60],
  [90, -80],
  [-70, 50],
  [100, 60],
  [0, -100],
  [-30, 90],
];

export function FireflyCue({ regionId, active }: FireflyCueProps) {
  if (!active) return null;

  const isNeutral = regionId === null;
  const center = isNeutral
    ? { x: PLAY_AREA.width / 2, y: PLAY_AREA.height / 2 }
    : regionCenter(regionId, PLAY_AREA);
  const offsets = isNeutral ? AMBIENT_OFFSETS : DIRECTIONAL_OFFSETS;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 20 }} aria-hidden>
      {offsets.map(([dx, dy], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: center.x + dx,
            top: center.y + dy,
            width: isNeutral ? 5 : 8,
            height: isNeutral ? 5 : 8,
            borderRadius: "50%",
            background: isNeutral ? "#C4B5FD" : "#F0E68C",
            boxShadow: isNeutral ? "0 0 8px rgba(196,181,253,0.8)" : "0 0 14px rgba(240,230,140,0.95)",
            animation: `firefly-flash ${isNeutral ? 240 : 200}ms ease-out ${i * 20}ms both`,
          }}
        />
      ))}
    </div>
  );
}
