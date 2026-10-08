import type { AgeBand, DecoyType, SignalEvent, SignalType, StagePlan } from "../types";
import { AGE_BAND_CONFIG, REAL_SIGNALS, SIGNAL_GAP_MS, SPEED_PHASES, STAGE_LEAD_IN_MS, STAGE_TAIL_MS, TOTAL_SIGNALS, TOWERS } from "../config";
import { createRng, randInt, shuffle, type Rng } from "./rng";

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

// 1-based speed phase for 1-based signal number n.
export function phaseOf(n: number): number {
  return SPEED_PHASES.findIndex((p) => n >= p.firstSignal && n <= p.lastSignal) + 1;
}

// The whole game as one continuous run: 100 signals (70 real, 30 decoys) in
// a shuffled order, one at a time, never twice in a row on the same tower,
// each visible until SIGNAL_GAP_MS before the next. The pace follows
// SPEED_PHASES (1150 → 900 → 750 → 600 ms between signals).
export function buildSession(ageBand: AgeBand, sessionSeed: string): StagePlan[] {
  const cfg = AGE_BAND_CONFIG[ageBand];
  const rng = createRng(`${sessionSeed}-run`);
  const isReal = shuffle(
    Array.from({ length: TOTAL_SIGNALS }, (_, i) => i < REAL_SIGNALS),
    rng
  );

  const events: SignalEvent[] = [];
  let t = STAGE_LEAD_IN_MS;
  let lastTower = -1;
  let lastDecoy: DecoyType | null = null;
  for (let i = 0; i < TOTAL_SIGNALS; i++) {
    const n = i + 1;
    const phase = phaseOf(n);
    const interval = SPEED_PHASES[phase - 1].intervalMs;
    let tower = randInt(rng, TOWERS.length);
    if (tower === lastTower) tower = (tower + 1 + randInt(rng, TOWERS.length - 1)) % TOWERS.length;
    lastTower = tower;
    let type: SignalType = "three-rings";
    if (!isReal[i]) {
      let d = pickWeighted(cfg.decoyWeightsByPhase[phase - 1], rng);
      if (d === lastDecoy) d = pickWeighted(cfg.decoyWeightsByPhase[phase - 1], rng);
      lastDecoy = d;
      type = d;
    }
    events.push({ eventId: `s${n}`, stageIndex: 0, isPractice: false, phase, tower, type, startMs: t, durationMs: interval - SIGNAL_GAP_MS });
    t += interval;
  }

  const lastEnd = events[events.length - 1].startMs + events[events.length - 1].durationMs;
  return [
    {
      stageIndex: 0,
      isPractice: false,
      blockNumber: 1,
      label: "",
      banner: "",
      events,
      totalMs: lastEnd + STAGE_TAIL_MS,
    },
  ];
}



// The event a tap on `tower` at `atMs` should be judged against: the latest
// one shown on that tower that's still on screen or within `graceMs`.
export function eventOnTower(events: SignalEvent[], tower: number, atMs: number, graceMs: number): SignalEvent | null {
  let found: SignalEvent | null = null;
  for (const e of events) {
    if (e.startMs > atMs) break;
    if (e.tower === tower && atMs < e.startMs + e.durationMs + graceMs) found = e;
  }
  return found;
}

// A real signal currently live (or within grace) on any tower.
export function liveTarget(events: SignalEvent[], atMs: number, graceMs: number): SignalEvent | null {
  let found: SignalEvent | null = null;
  for (const e of events) {
    if (e.startMs > atMs) break;
    if (e.type === "three-rings" && atMs < e.startMs + e.durationMs + graceMs) found = e;
  }
  return found;
}
