import type { AgeBand, DecoyType, SignalEvent, StagePlan } from "../types";
import {
  AGE_BAND_CONFIG,
  BLOCK_COUNT,
  DECOYS_PER_BLOCK,
  MIN_EVENT_SPACING_MS,
  PRACTICE_EVENTS,
  PRACTICE_GAP_MS,
  PRACTICE_VISIBLE_MS,
  STAGE_LEAD_IN_MS,
  STAGE_TAIL_MS,
  TARGETS_PER_BLOCK,
  TOWERS,
  type BlockSpec,
} from "../config";
import { createRng, randInt, randRange, type Rng } from "./rng";

// At most this many events on screen at once (always on different towers).
const MAX_CONCURRENT = 2;
// Decoys never start this close to a real signal's onset, so the real
// signal is never masked by a simultaneous pop elsewhere.
const TARGET_ONSET_CLEARANCE_MS = 350;

function pickWeighted(weights: Record<DecoyType, number>, rng: Rng): DecoyType {
  const entries = Object.entries(weights) as [DecoyType, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [type, w] of entries) {
    r -= w;
    if (r <= 0) return type;
  }
  return entries[entries.length - 1][0];
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function buildPractice(): StagePlan {
  const rng = createRng("practice");
  let t = STAGE_LEAD_IN_MS;
  const events: SignalEvent[] = PRACTICE_EVENTS.map((e, i) => {
    const startMs = Math.round(t + (i === 0 ? 0 : randRange(rng, PRACTICE_GAP_MS)));
    t = startMs + PRACTICE_VISIBLE_MS;
    return { eventId: `p-e${i}`, stageIndex: 0, isPractice: true, tower: e.tower, type: e.type, startMs, durationMs: PRACTICE_VISIBLE_MS };
  });
  return { stageIndex: 0, isPractice: true, blockNumber: null, label: "Practice", banner: "Practice — 5 signals", events, totalMs: t + STAGE_TAIL_MS };
}

function buildBlock(stageIndex: number, blockNumber: number, spec: BlockSpec, sessionSeed: string): StagePlan {
  const rng = createRng(`${sessionSeed}-block${blockNumber}`);
  const d = spec.visibleMs;
  const events: SignalEvent[] = [];

  // Real signals: onset-to-onset gaps jittered within targetGapMs.
  let onset = STAGE_LEAD_IN_MS;
  let lastTower = -1;
  for (let k = 0; k < TARGETS_PER_BLOCK; k++) {
    const u = Math.pow(rng(), spec.gapSkew);
    const gap = spec.targetGapMs[0] + (spec.targetGapMs[1] - spec.targetGapMs[0]) * u;
    onset += k === 0 ? gap * 0.6 : gap;
    let tower = randInt(rng, TOWERS.length);
    if (tower === lastTower && rng() < 0.6) tower = (tower + 1 + randInt(rng, TOWERS.length - 1)) % TOWERS.length;
    lastTower = tower;
    events.push({ eventId: `b${blockNumber}-t${k}`, stageIndex, isPractice: false, tower, type: "three-rings", startMs: Math.round(onset), durationMs: d });
  }
  const targetOnsets = events.map((e) => e.startMs);
  let blockEnd = events[events.length - 1].startMs + d + STAGE_TAIL_MS;

  // Decoys: random slots anywhere in the block, subject to tower spacing,
  // concurrency and target-onset clearance. If a block is too crowded, it
  // grows a little at the end rather than dropping decoys.
  let lastDecoy: DecoyType | null = null;
  for (let k = 0; k < DECOYS_PER_BLOCK; k++) {
    let placed = false;
    for (let attempt = 0; attempt < 400 && !placed; attempt++) {
      const start = Math.round(randRange(rng, [STAGE_LEAD_IN_MS, blockEnd - STAGE_TAIL_MS]));
      const end = start + d;
      const tower = randInt(rng, TOWERS.length);
      if (targetOnsets.some((t) => Math.abs(t - start) < TARGET_ONSET_CLEARANCE_MS)) continue;
      const towerBusy = events.some((e) => e.tower === tower && overlaps(start - MIN_EVENT_SPACING_MS, end + MIN_EVENT_SPACING_MS, e.startMs, e.startMs + e.durationMs));
      if (towerBusy) continue;
      const concurrent = events.filter((e) => overlaps(start, end, e.startMs, e.startMs + e.durationMs)).length;
      if (concurrent >= MAX_CONCURRENT) continue;
      let type = pickWeighted(spec.decoyWeights, rng);
      if (type === lastDecoy) type = pickWeighted(spec.decoyWeights, rng);
      lastDecoy = type;
      events.push({ eventId: `b${blockNumber}-d${k}`, stageIndex, isPractice: false, tower, type, startMs: start, durationMs: d });
      placed = true;
    }
    if (!placed) {
      blockEnd += d + MIN_EVENT_SPACING_MS;
      k--;
    }
  }

  events.sort((a, b) => a.startMs - b.startMs);
  const lastEnd = Math.max(...events.map((e) => e.startMs + e.durationMs));
  return {
    stageIndex,
    isPractice: false,
    blockNumber,
    label: `Block ${blockNumber}/${BLOCK_COUNT}`,
    banner: blockNumber === 1 ? "Block 1 — now it counts!" : `Block ${blockNumber} of ${BLOCK_COUNT}`,
    events,
    totalMs: lastEnd + STAGE_TAIL_MS,
  };
}

// Practice (5 fixed events) then the scored vigilance blocks.
export function buildSession(ageBand: AgeBand, sessionSeed: string): StagePlan[] {
  const cfg = AGE_BAND_CONFIG[ageBand];
  return [buildPractice(), ...cfg.blocks.map((spec, i) => buildBlock(i + 1, i + 1, spec, sessionSeed))];
}

// The event a tap on `tower` at `atMs` should be judged against: the one
// showing on that tower, or one that ended there within `graceMs`. Events on
// one tower are always spaced wider than the grace, so there's at most one.
export function eventOnTower(events: SignalEvent[], tower: number, atMs: number, graceMs: number): SignalEvent | null {
  for (const e of events) {
    if (e.tower === tower && atMs >= e.startMs && atMs < e.startMs + e.durationMs + graceMs) return e;
    if (e.startMs > atMs) break;
  }
  return null;
}

// A real signal currently live (or within grace) on any tower.
export function liveTarget(events: SignalEvent[], atMs: number, graceMs: number): SignalEvent | null {
  for (const e of events) {
    if (e.type === "three-rings" && atMs >= e.startMs && atMs < e.startMs + e.durationMs + graceMs) return e;
    if (e.startMs > atMs) break;
  }
  return null;
}
