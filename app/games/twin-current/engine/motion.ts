import type { MotionTrack, Point } from "../types";
import { PLAY_AREA, SPARK_FIELD, SPARK_RADIUS, riverEdgesAt } from "../config";
import { randRange, type Rng } from "./rng";

const FRAME_MS = 1000 / 30;
const BANK_MARGIN = 8;
const EASE_IN = 0.08; // fraction of the motion spent speeding up
const SETTLE = 0.16; // fraction spent slowing to a stop and spreading out
const MIN_REST_GAP = SPARK_RADIUS * 2.3; // centre distance once stopped — every spark stays grabbable

// Inside the painted river's water edges at height y, inset by a spark.
export function xBoundsAt(y: number): [number, number] {
  const [l, r] = riverEdgesAt(y);
  const inset = SPARK_RADIUS + BANK_MARGIN;
  return [Math.max(l + inset, inset), Math.min(r - inset, PLAY_AREA.width - inset)];
}

const Y_MIN = SPARK_FIELD.yMin + SPARK_RADIUS;
const Y_MAX = SPARK_FIELD.yMax - SPARK_RADIUS;

function clampToRiver(p: Point): Point {
  const y = Math.min(Y_MAX, Math.max(Y_MIN, p.y));
  const [x0, x1] = xBoundsAt(y);
  return { x: Math.min(x1, Math.max(x0, p.x)), y };
}

export function sampleStartPositions(count: number, rng: Rng): Point[] {
  const out: Point[] = [];
  let minGap = SPARK_RADIUS * 3;
  while (out.length < count) {
    let placed = false;
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const y = randRange(rng, [Y_MIN, Y_MAX]);
      const x = randRange(rng, xBoundsAt(y));
      if (out.every((p) => Math.hypot(p.x - x, p.y - y) >= minGap)) {
        out.push({ x, y });
        placed = true;
      }
    }
    if (!placed) minGap *= 0.9;
  }
  return out;
}

export type MotionParams = {
  start: Point[];
  targetIndices: number[];
  speedPxPerSec: number;
  durationMs: number;
  separation: number;
  crossingPull: number;
  rng: Rng;
};

// Deterministic steering simulation, precomputed at 30fps so playback is a
// pure function of elapsed time (and pausing is trivial). Each spark wanders
// with a constant speed and a randomly drifting heading, turning away from
// the banks. `separation` keeps sparks apart (fewer close crossings, for the
// younger band); `crossingPull` steers targets toward the nearest decoy so
// their paths cross more (older band). In the final SETTLE stretch everyone
// slows to a stop and spreads out so no two resting sparks overlap.
export function simulateMotion({ start, targetIndices, speedPxPerSec, durationMs, separation, crossingPull, rng }: MotionParams): MotionTrack {
  const n = start.length;
  const steps = Math.ceil(durationMs / FRAME_MS);
  const dt = FRAME_MS / 1000;
  const isTarget = new Set(targetIndices);

  let pos = start.map((p) => ({ ...p }));
  const heading = start.map(() => randRange(rng, [0, Math.PI * 2]));
  const frames: Point[][] = [pos.map((p) => ({ x: p.x, y: p.y }))];

  for (let step = 1; step <= steps; step++) {
    const t = step / steps;
    const speedFactor = t < EASE_IN ? t / EASE_IN : t > 1 - SETTLE ? Math.max(0, (1 - t) / SETTLE) : 1;
    const settling = t > 1 - SETTLE;
    const speed = speedPxPerSec * speedFactor;

    const next = pos.map((p, i) => {
      heading[i] += (rng() - 0.5) * 0.45;
      let fx = Math.cos(heading[i]);
      let fy = Math.sin(heading[i]);

      // Banks and field edges: steer back toward the middle when close.
      const [x0, x1] = xBoundsAt(p.y);
      const edge = 40;
      if (p.x - x0 < edge) fx += (1 - (p.x - x0) / edge) * 1.6;
      if (x1 - p.x < edge) fx -= (1 - (x1 - p.x) / edge) * 1.6;
      if (p.y - Y_MIN < edge) fy += (1 - (p.y - Y_MIN) / edge) * 1.6;
      if (Y_MAX - p.y < edge) fy -= (1 - (Y_MAX - p.y) / edge) * 1.6;

      // Separation from neighbours.
      const sepRadius = SPARK_RADIUS * 3;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const dx = p.x - pos[j].x;
        const dy = p.y - pos[j].y;
        const d = Math.hypot(dx, dy) || 0.001;
        if (d < sepRadius) {
          const push = separation * (1 - d / sepRadius) * 1.4;
          fx += (dx / d) * push;
          fy += (dy / d) * push;
        }
      }

      // Targets drift toward the nearest decoy so their paths cross.
      if (crossingPull > 0 && isTarget.has(i) && !settling) {
        let best = -1;
        let bestD = Infinity;
        for (let j = 0; j < n; j++) {
          if (isTarget.has(j)) continue;
          const d = Math.hypot(pos[j].x - p.x, pos[j].y - p.y);
          if (d < bestD) {
            bestD = d;
            best = j;
          }
        }
        if (best >= 0 && bestD > SPARK_RADIUS * 1.5) {
          fx += ((pos[best].x - p.x) / bestD) * crossingPull * 0.6;
          fy += ((pos[best].y - p.y) / bestD) * crossingPull * 0.6;
        }
      }

      heading[i] = Math.atan2(fy, fx);
      return clampToRiver({ x: p.x + Math.cos(heading[i]) * speed * dt, y: p.y + Math.sin(heading[i]) * speed * dt });
    });

    if (settling) relaxApart(next, 0.18);
    if (step === steps) {
      for (let k = 0; k < 40; k++) relaxApart(next, 0.5);
    }
    pos = next;
    frames.push(pos.map((p) => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 })));
  }

  return { frameMs: FRAME_MS, frames };
}

// Nudges any pair closer than MIN_REST_GAP apart by `strength` of the
// overlap, in place.
function relaxApart(points: Point[], strength: number) {
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      const d = Math.hypot(dx, dy) || 0.001;
      if (d >= MIN_REST_GAP) continue;
      const shift = ((MIN_REST_GAP - d) / 2) * strength;
      points[i] = clampToRiver({ x: points[i].x - (dx / d) * shift, y: points[i].y - (dy / d) * shift });
      points[j] = clampToRiver({ x: points[j].x + (dx / d) * shift, y: points[j].y + (dy / d) * shift });
    }
  }
}

export function sampleTrack(track: MotionTrack, elapsedMs: number): Point[] {
  const { frames, frameMs } = track;
  const f = Math.min(frames.length - 1, Math.max(0, elapsedMs / frameMs));
  const a = Math.floor(f);
  const b = Math.min(frames.length - 1, a + 1);
  const t = f - a;
  return frames[a].map((p, i) => ({ x: p.x + (frames[b][i].x - p.x) * t, y: p.y + (frames[b][i].y - p.y) * t }));
}
