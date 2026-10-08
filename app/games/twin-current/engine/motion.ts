import type { MotionTrack, Point } from "../types";
import { SPARK_RADIUS } from "../config";
import { isWater, nearestWater } from "./waterMap";
import { randRange, type Rng } from "./rng";

const FRAME_MS = 1000 / 30;
const EASE_IN = 0.06; // fraction of the motion spent speeding up
const SETTLE = 0.08; // final fraction: slow to a stop and spread out (selection window ending)
const MIN_REST_GAP = SPARK_RADIUS * 2.3; // centre distance once stopped — every ball stays tappable

// The river splits around a chain of islands into two channels — the
// "twin current". Balls ride the current up and down their channel, each at
// its own speed and turning at its own points, so they overtake and cross
// one another constantly.
const DIVIDER_X = 190; // the island chain's centre line
const TOP_TURN: [number, number] = [295, 345];
const BOTTOM_TURN: [number, number] = [620, 672];

// Alternates channels so both carry balls.
export function sampleStartPositions(count: number, rng: Rng): Point[] {
  const out: Point[] = [];
  let minGap = SPARK_RADIUS * 3;
  while (out.length < count) {
    let placed = false;
    const left = out.length % 2 === 0;
    for (let attempt = 0; attempt < 400 && !placed; attempt++) {
      const x = left ? randRange(rng, [5, DIVIDER_X]) : randRange(rng, [DIVIDER_X, 385]);
      const y = randRange(rng, [295, 675]);
      if (!isWater(x, y)) continue;
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
// pure function of elapsed time (and pausing is trivial). Each ball rides
// the channel current at its own speed (so balls overtake one another),
// wanders a little, and steers away from land using the baked water map.
// `separation` keeps balls apart (fewer close crossings, younger band);
// `crossingPull` steers targets toward the nearest decoy (more crossings,
// older band). In the final SETTLE stretch everyone slows to a stop and
// spreads out so no two resting balls overlap.
export function simulateMotion({ start, targetIndices, speedPxPerSec, durationMs, separation, crossingPull, rng }: MotionParams): MotionTrack {
  const n = start.length;
  const steps = Math.ceil(durationMs / FRAME_MS);
  const dt = FRAME_MS / 1000;
  const isTarget = new Set(targetIndices);

  let pos = start.map((p) => ({ ...p }));
  const speedMul = start.map(() => randRange(rng, [0.75, 1.3]));
  // Vertical direction each ball currently rides (+1 down, -1 up) and the
  // heights where it next turns around.
  const dir = start.map((p) => (p.x < DIVIDER_X ? 1 : -1));
  const topTurn = start.map(() => randRange(rng, TOP_TURN));
  const bottomTurn = start.map(() => randRange(rng, BOTTOM_TURN));
  const heading = start.map((_, i) => (dir[i] > 0 ? Math.PI / 2 : -Math.PI / 2));
  const wobble = start.map(() => randRange(rng, [0, Math.PI * 2]));
  const frames: Point[][] = [pos.map((p) => ({ x: p.x, y: p.y }))];

  for (let step = 1; step <= steps; step++) {
    const t = step / steps;
    const speedFactor = t < EASE_IN ? t / EASE_IN : t > 1 - SETTLE ? Math.max(0, (1 - t) / SETTLE) : 1;
    const settling = t > 1 - SETTLE;

    const next = pos.map((p, i) => {
      if (p.y > bottomTurn[i] && dir[i] > 0) {
        dir[i] = -1;
        bottomTurn[i] = randRange(rng, BOTTOM_TURN);
      }
      if (p.y < topTurn[i] && dir[i] < 0) {
        dir[i] = 1;
        topTurn[i] = randRange(rng, TOP_TURN);
      }

      wobble[i] += 0.07 + rng() * 0.05;
      let fx = Math.sin(wobble[i]) * 0.55 + (rng() - 0.5) * 0.5;
      let fy = dir[i] * 1.2;

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

      // Smoothly turn toward the desired direction.
      const want = Math.atan2(fy, fx);
      let dA = want - heading[i];
      while (dA > Math.PI) dA -= Math.PI * 2;
      while (dA < -Math.PI) dA += Math.PI * 2;
      heading[i] += dA * 0.25;

      const speed = speedPxPerSec * speedMul[i] * speedFactor;
      // Steer around land: try the heading, then progressively wider turns.
      for (const turn of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, Math.PI]) {
        const a = heading[i] + turn;
        const nx = p.x + Math.cos(a) * speed * dt;
        const ny = p.y + Math.sin(a) * speed * dt;
        if (isWater(nx, ny)) {
          heading[i] = a;
          return { x: nx, y: ny };
        }
      }
      return nearestWater(p.x, p.y);
    });

    if (settling) relaxApart(next, 0.18);
    if (step === steps) {
      for (let k = 0; k < 60; k++) relaxApart(next, 0.5);
      separateAlongChannel(next);
    }
    pos = next;
    frames.push(pos.map((p) => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 })));
  }

  return { frameMs: FRAME_MS, frames };
}

// Nudges any pair closer than MIN_REST_GAP apart by `strength` of the
// overlap, keeping every ball in the water.
function relaxApart(points: Point[], strength: number) {
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      const d = Math.hypot(dx, dy) || 0.001;
      if (d >= MIN_REST_GAP) continue;
      const shift = ((MIN_REST_GAP - d) / 2) * strength;
      points[i] = nearestWater(points[i].x - (dx / d) * shift, points[i].y - (dy / d) * shift);
      points[j] = nearestWater(points[j].x + (dx / d) * shift, points[j].y + (dy / d) * shift);
    }
  }
}

// Final pass for narrow stretches, where sideways nudges can't help: slide
// any ball still touching another up or down the channel to the nearest
// free water spot.
function separateAlongChannel(points: Point[]) {
  const clear = (q: Point, self: number) => points.every((o, j) => j === self || Math.hypot(o.x - q.x, o.y - q.y) >= MIN_REST_GAP);
  for (let i = 0; i < points.length; i++) {
    if (clear(points[i], i)) continue;
    let moved = false;
    for (let dist = 4; dist <= 220 && !moved; dist += 4) {
      for (const dy of [dist, -dist]) {
        for (const dx of [0, 10, -10, 20, -20]) {
          const q = { x: points[i].x + dx, y: points[i].y + dy };
          if (isWater(q.x, q.y) && clear(q, i)) {
            points[i] = q;
            moved = true;
            break;
          }
        }
        if (moved) break;
      }
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
