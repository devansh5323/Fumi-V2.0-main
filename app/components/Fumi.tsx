"use client";

import { useId } from "react";

export type FumiMood = "happy" | "thinking" | "waving";

type FumiProps = {
  mood?: FumiMood;
  size?: number;
  tailWag?: boolean;
  animate?: boolean;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// A small, self-contained fox-like character — white/lavender fur, purple
// hoodie with a paw-print chest patch, matching the FUMI brand mascot.
// Built fresh for this app; not a reuse of any other project's mascot art.
export function Fumi({ mood = "happy", size = 120, tailWag = false, animate = true }: FumiProps) {
  const uid = useId();
  const bodyGradId = `fumi-body-${uid}`;
  const hoodieGradId = `fumi-hoodie-${uid}`;
  const shouldAnimate = animate && !prefersReducedMotion();

  const eyesClosed = mood === "happy";
  const oneArmUp = mood === "waving";
  const headTilt = mood === "thinking" ? -6 : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden
      style={{
        display: "block",
        overflow: "visible",
        animation: shouldAnimate ? "float-y 3.2s ease-in-out infinite" : undefined,
      }}
    >
      <defs>
        <linearGradient id={bodyGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e4defc" />
        </linearGradient>
        <linearGradient id={hoodieGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9b5cff" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>

      <g transform={`rotate(${headTilt} 100 95)`}>
        {/* tail */}
        <path
          d="M148 130 C176 122 184 96 168 78 C178 96 172 116 150 124 Z"
          fill={`url(#${bodyGradId})`}
          stroke="#c9c0f5"
          strokeWidth="2"
          style={{
            transformOrigin: "158px 104px",
            animation: shouldAnimate && tailWag ? "fumi-tail-wag 0.5s ease-in-out infinite" : undefined,
          }}
        />

        {/* back paw (non-waving arm) */}
        <ellipse cx="66" cy="150" rx="14" ry="10" fill={`url(#${bodyGradId})`} stroke="#c9c0f5" strokeWidth="1.5" />

        {/* body + hoodie */}
        <path
          d="M62 190 C48 190 40 172 44 154 C40 130 52 108 100 108 C148 108 160 130 156 154 C160 172 152 190 138 190 Z"
          fill={`url(#${hoodieGradId})`}
        />
        <circle cx="100" cy="150" r="10" fill="none" stroke="#e4defc" strokeWidth="3" />
        <path d="M94 150 L100 156 L112 142" fill="none" stroke="#e4defc" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M76 112 Q70 128 74 142" fill="none" stroke="#6425c9" strokeWidth="3" strokeLinecap="round" />
        <path d="M124 112 Q130 128 126 142" fill="none" stroke="#6425c9" strokeWidth="3" strokeLinecap="round" />

        {/* waving / resting arm */}
        {oneArmUp ? (
          <g style={{ transformOrigin: "140px 118px", animation: shouldAnimate ? "fumi-wave 0.6s ease-in-out infinite" : undefined }}>
            <ellipse cx="140" cy="100" rx="12" ry="18" fill={`url(#${bodyGradId})`} stroke="#c9c0f5" strokeWidth="1.5" />
          </g>
        ) : (
          <ellipse cx="136" cy="150" rx="14" ry="10" fill={`url(#${bodyGradId})`} stroke="#c9c0f5" strokeWidth="1.5" />
        )}

        {/* ears */}
        <path d="M56 62 L44 20 L82 50 Z" fill={`url(#${bodyGradId})`} stroke="#c9c0f5" strokeWidth="2" strokeLinejoin="round" />
        <path d="M60 56 L52 30 L74 48 Z" fill="#f3c9e6" />
        <path d="M144 62 L156 20 L118 50 Z" fill={`url(#${bodyGradId})`} stroke="#c9c0f5" strokeWidth="2" strokeLinejoin="round" />
        <path d="M140 56 L148 30 L126 48 Z" fill="#f3c9e6" />

        {/* head */}
        <ellipse cx="100" cy="80" rx="52" ry="46" fill={`url(#${bodyGradId})`} stroke="#c9c0f5" strokeWidth="2" />

        {/* face */}
        {eyesClosed ? (
          <>
            <path d="M72 78 Q80 68 88 78" fill="none" stroke="#2b2540" strokeWidth="4" strokeLinecap="round" />
            <path d="M112 78 Q120 68 128 78" fill="none" stroke="#2b2540" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="80" cy="78" r="6" fill="#2b2540" />
            <circle cx="120" cy="78" r="6" fill="#2b2540" />
          </>
        )}
        <ellipse cx="100" cy="94" rx="5" ry="3.5" fill="#2b2540" />
        <path d="M92 100 Q100 106 108 100" fill="none" stroke="#2b2540" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="66" cy="92" rx="7" ry="4.5" fill="#f7cfe6" opacity="0.7" />
        <ellipse cx="134" cy="92" rx="7" ry="4.5" fill="#f7cfe6" opacity="0.7" />
      </g>
    </svg>
  );
}
