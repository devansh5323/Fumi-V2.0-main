"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgeBand, CargoSymbol, GameOutcome, PickRecord, Point, RoundPlan, RoundResult } from "./types";
import {
  DEFAULT_QUEST,
  PRACTICE_GREETING,
  REAL_GAME_GREETING,
  PLAY_AREA,
  REWARDS,
  SPARK_RADIUS,
  START_ENERGY,
  SYMBOL_NAME,
  TIMING,
  WRONG_ROUTE_ENERGY_COST,
  gateRects,
} from "./config";
import { buildSession } from "./engine/sessionPlanner";
import { sampleTrack } from "./engine/motion";
import { gateFor } from "./engine/rules";
import { computeGameOutcome } from "./engine/metrics";
import { RiverBackdrop } from "./components/RiverBackdrop";
import { EnergySpark, type SparkLook } from "./components/EnergySpark";
import { RiverGate, type GateState } from "./components/RiverGate";
import { StepHeader } from "./components/StepHeader";
import { StartScreen } from "./components/StartScreen";
import { FumiGuide } from "./components/FumiGuide";
import { Fumi } from "../../components/Fumi";
import { completesDay } from "../../lib/dayProgress";
import { reportGame } from "./lib/sessionReporter";

// intro (quest + narration) -> playing (4 practice + 16 scored rounds,
// back-to-back) -> complete (stats, rewards, accessory pick).
type GameScreen = "start" | "playing" | "complete";

// One round (the mockup's steps): 1 targets glow -> 2 everything flows ->
// 3 the child selects the balls they tracked -> 4 symbols revealed ->
// 5 rule card -> 6 drag each ball through its gate -> missed targets
// briefly re-light -> the stream surges into the next round.
type RoundPhase = "preview" | "fade" | "motion" | "select" | "reveal" | "route" | "result" | "flow";

function generateSeed(): string {
  return `tc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type TwinCurrentGameProps = {
  ageBand: AgeBand;
  seed?: string;
  onExit: () => void;
};

export function TwinCurrentGame({ ageBand, seed, onExit }: TwinCurrentGameProps) {
  const [sessionSeed] = useState(() => seed ?? generateSeed());
  const [attempt, setAttempt] = useState(0);
  const rounds = useMemo(() => buildSession(ageBand, `${sessionSeed}-a${attempt}`), [ageBand, sessionSeed, attempt]);

  // Title screen first; Play leads into How to Play (practice).
  const [screen, setScreen] = useState<GameScreen>("start");
  // Fumi's typed line in a speech bubble (before practice, and before the
  // real game). Rounds wait while she talks. null = Fumi not shown.
  const [greeting, setGreeting] = useState<string | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [scoredDone, setScoredDone] = useState(0);
  const [practiceDone, setPracticeDone] = useState(0);
  const [paused, setPaused] = useState(false);
  const [roundPhase, setRoundPhase] = useState<RoundPhase>("preview");
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);
  const [veil, setVeil] = useState<{ opacity: number; message: string | null }>({ opacity: 0, message: null });

  const resultsRef = useRef<RoundResult[]>([]);
  const startedAtRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const pauseStartRef = useRef(0);
  const energyRef = useRef(START_ENERGY);

  const round = rounds[roundIndex];

  // Dip to dark, swap content while covered, optionally hold a short label.
  const runTransition = useCallback((action: () => void, message: string | null = null) => {
    setVeil({ opacity: 1, message });
    const holdMs = message ? 900 : 120;
    setTimeout(() => {
      action();
      setTimeout(() => setVeil({ opacity: 0, message: null }), holdMs);
    }, 380);
  }, []);

  const startRun = useCallback(() => {
    resultsRef.current = [];
    pausedTotalRef.current = 0;
    energyRef.current = START_ENERGY;
    setScoredDone(0);
    setPracticeDone(0);
    setRoundIndex(0);
    setRoundPhase("preview");
    setPaused(false);
    runTransition(() => {
      startedAtRef.current = Date.now();
      setScreen("playing");
      setGreeting(PRACTICE_GREETING);
    });
  }, [runTransition]);

  const handleGreetingDone = useCallback(() => setGreeting(null), []);

  const handlePlayAgain = useCallback(() => {
    setAttempt((a) => a + 1);
    startRun();
  }, [startRun]);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      if (p) pausedTotalRef.current += Date.now() - pauseStartRef.current;
      else pauseStartRef.current = Date.now();
      return !p;
    });
  }, []);

  const handleEnergyCost = useCallback((cost: number) => {
    energyRef.current = Math.max(0, energyRef.current - cost);
  }, []);

  const handleRoundFinished = useCallback(
    (result: RoundResult) => {
      resultsRef.current = [...resultsRef.current, result];
      if (result.isPractice) setPracticeDone((n) => n + 1);
      else setScoredDone((n) => n + 1);

      const next = roundIndex + 1;
      if (next >= rounds.length) {
        const duration = Date.now() - startedAtRef.current - pausedTotalRef.current;
        const earnsDay2Bonus = completesDay(DEFAULT_QUEST.day, "twin-current");
        setOutcome(computeGameOutcome(ageBand, resultsRef.current, duration, energyRef.current, earnsDay2Bonus));
        runTransition(() => setScreen("complete"));
        return;
      }
      const leavingPractice = rounds[roundIndex].isPractice && !rounds[next].isPractice;
      if (leavingPractice) {
        // Fumi announces the real game; Round 1 starts when she's done.
        setGreeting(REAL_GAME_GREETING);
        setRoundPhase("preview");
        setRoundIndex(next);
      } else {
        setRoundPhase("preview");
        setRoundIndex(next);
      }
    },
    [ageBand, roundIndex, rounds, runTransition]
  );

  const handleExit = useCallback(() => {
    setPaused(false);
    onExit();
  }, [onExit]);

  let content: React.ReactNode = null;
  if (screen === "start") {
    content = <StartScreen onPlay={startRun} />;
  } else if (screen === "playing" && round) {
    content = (
      <>
        <RiverBackdrop surge={roundPhase === "flow"} />
        {greeting && <FumiGuide key={greeting} speech={greeting} onDone={handleGreetingDone} />}
        {greeting === null && <RoundRunner
          key={`${attempt}-${round.roundIndex}`}
          round={round}
          paused={paused}
          scoredRoundsDone={scoredDone}
          practiceRoundsDone={practiceDone}
          onTogglePause={togglePause}
          onPhaseChange={setRoundPhase}
          onEnergyCost={handleEnergyCost}
          onFinished={handleRoundFinished}
        />}
        {paused && <PauseOverlay onResume={togglePause} onExit={handleExit} />}
      </>
    );
  } else if (screen === "complete" && outcome) {
    content = <GameComplete outcome={outcome} onPlayAgain={handlePlayAgain} onFinish={onExit} />;
  }

  return (
    <div style={sceneStyle}>
      {content}
      <div style={{ ...veilStyle, opacity: veil.opacity, pointerEvents: veil.opacity > 0 ? "auto" : "none" }}>
        {veil.message && (
          <div key={veil.message} style={veilMessageStyle}>
            {veil.message}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One round — the mockup's six steps
// ---------------------------------------------------------------------------

type RoundRunnerProps = {
  round: RoundPlan;
  paused: boolean;
  scoredRoundsDone: number;
  practiceRoundsDone: number;
  onTogglePause: () => void;
  onPhaseChange: (phase: RoundPhase) => void;
  onEnergyCost: (cost: number) => void;
  onFinished: (result: RoundResult) => void;
};

type Drag = { sparkId: string; x: number; y: number; offsetX: number; offsetY: number; startX: number; startY: number; moved: boolean };
type Routed = { gate: CargoSymbol; ok: boolean };

const DRAG_THRESHOLD = 6;
const GATE_HIT_PAD = 22;

// Fixed-length phases (ms). Motion has its own clock.
function phaseDuration(phase: RoundPhase): number | null {
  switch (phase) {
    case "preview":
      return TIMING.previewMs;
    case "fade":
      return TIMING.fadeMs;
    case "reveal":
      return TIMING.revealMs;
    case "result":
      return TIMING.resultMs;
    case "flow":
      return TIMING.flowMs;
    default:
      return null;
  }
}

// No rule step: after the reveal, the balls go straight to the gates
// (each to the gate showing its own symbol).
const NEXT_PHASE: Partial<Record<RoundPhase, RoundPhase>> = { preview: "fade", fade: "motion", reveal: "route", result: "flow" };

function positionName(index: number, count: number): string {
  if (index === 0) return "Left";
  if (index === count - 1) return "Right";
  return "Middle";
}

// Keyed per round by the parent, so every bit of per-round state resets by
// remounting rather than by an effect watching the round id.
function RoundRunner({ round, paused, scoredRoundsDone, practiceRoundsDone, onTogglePause, onPhaseChange, onEnergyCost, onFinished }: RoundRunnerProps) {
  const track = round.motion;
  const n = round.targetCount;
  const gates = useMemo(() => gateRects(round.gateOrder.length), [round.gateOrder.length]);

  const [phase, setPhaseState] = useState<RoundPhase>("preview");
  const [restPositions, setRestPositions] = useState<Point[]>(() => track.frames[0]);
  const [selected, setSelected] = useState<string[]>([]);
  const [routed, setRouted] = useState<Record<string, Routed>>({});
  const [overrides, setOverrides] = useState<Record<string, Point>>({});
  const [gateStates, setGateStates] = useState<Partial<Record<CargoSymbol, GateState>>>({});
  const [armed, setArmed] = useState<string | null>(null); // tap-a-ball-then-tap-a-gate
  const [drag, setDrag] = useState<Drag | null>(null);
  // The selection window has run out: the balls have stopped, and the game
  // waits for the child to finish choosing (it never moves on by itself).
  const [flowEnded, setFlowEnded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const sparkEls = useRef<(HTMLDivElement | null)[]>([]);
  const tailEls = useRef<(HTMLDivElement | null)[]>([]);
  const phaseElapsedRef = useRef(0);
  const motionElapsedRef = useRef(0);
  const livePtsRef = useRef<Point[]>(track.frames[0]); // latest flowing positions
  const frozenRef = useRef<Set<string>>(new Set()); // selected balls stop flowing
  const overridesRef = useRef<Record<string, Point>>({});
  const selectionClosedRef = useRef(false);
  const endSelectionRef = useRef<() => void>(() => {});
  const selectStartRef = useRef(0);
  const lastSelectAtRef = useRef(0);
  const ruleStartRef = useRef(0);
  const picksRef = useRef<PickRecord[]>([]);

  const setPhase = useCallback(
    (p: RoundPhase) => {
      phaseElapsedRef.current = 0;
      setPhaseState(p);
      onPhaseChange(p);
      if (p === "select") {
        selectStartRef.current = performance.now();
        lastSelectAtRef.current = selectStartRef.current;
      }
      if (p === "route") ruleStartRef.current = performance.now();
    },
    [onPhaseChange]
  );

  const buildResult = useCallback((): RoundResult => {
    const picks = picksRef.current;
    const correctTargets = picks.filter((p) => p.isTarget).length;
    const firstRoute = picks.map((p) => p.routedAtMs).filter((v): v is number => v !== null);
    return {
      roundIndex: round.roundIndex,
      isPractice: round.isPractice,
      sparkCount: round.sparks.length,
      targetCount: n,
      speedPxPerSec: round.speedPxPerSec,
      speedTier: round.speedTier,
      rule: round.rule,
      ruleChanged: round.ruleChanged,
      picks,
      correctTargets,
      wrongSparks: picks.filter((p) => p.outcome === "wrong-spark").length,
      missedTargets: n - correctTargets,
      correctRoutes: picks.filter((p) => p.outcome === "correct-route").length,
      wrongRoutes: picks.filter((p) => p.outcome === "wrong-route").length,
      firstResponseMs: firstRoute.length ? Math.min(...firstRoute) : null,
    };
  }, [round, n]);

  // Fixed-length phases tick on a pausable 100ms clock (pausing simply stops
  // the clock), which also drives the timer chip during the preview.
  useEffect(() => {
    const d = phaseDuration(phase);
    if (paused || d === null) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      phaseElapsedRef.current += now - last;
      last = now;
      if (phaseElapsedRef.current >= d) {
        clearInterval(id);
        if (phase === "flow") onFinished(buildResult());
        // No correct ball found: nothing to route, skip the rule and gates.
        else if (phase === "reveal" && !picksRef.current.some((pk) => pk.isTarget)) setPhase("result");
        else setPhase(NEXT_PHASE[phase]!);
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, paused, setPhase, onFinished, buildResult]);

  // Motion playback (steps 2 and 3): writes transforms (and each ball's
  // trail) straight to the elements every frame — no React render per frame.
  // The balls keep flowing through the selection window; a selected ball
  // stops where it was tapped. Elapsed time only accumulates while unpaused.
  useEffect(() => {
    if ((phase !== "motion" && phase !== "select") || paused || flowEnded) return;
    let raf = 0;
    let last = performance.now();
    let prev = sampleTrack(track, motionElapsedRef.current);
    const total = round.motionMs + round.selectMs;
    const tick = (now: number) => {
      const dt = Math.max(1, now - last);
      motionElapsedRef.current += now - last;
      last = now;
      const pts = sampleTrack(track, motionElapsedRef.current);
      livePtsRef.current = pts;
      pts.forEach((p, i) => {
        if (frozenRef.current.has(round.sparks[i].sparkId)) return;
        const el = sparkEls.current[i];
        if (el) el.style.transform = `translate(${p.x - SPARK_RADIUS}px, ${p.y - SPARK_RADIUS}px)`;
        const tail = tailEls.current[i];
        if (tail) {
          const vx = (p.x - prev[i].x) / dt;
          const vy = (p.y - prev[i].y) / dt;
          const sp = Math.hypot(vx, vy) * 1000; // px/s
          tail.style.width = `${Math.min(46, sp * 0.32)}px`;
          tail.style.opacity = sp > 8 ? "0.8" : "0";
          tail.style.transform = `rotate(${Math.atan2(-vy, -vx)}rad)`;
        }
      });
      prev = pts;
      const inSelect = motionElapsedRef.current >= round.motionMs;
      if (phase === "motion" && inSelect) {
        setPhase("select");
        return; // the effect restarts for the select phase
      }
      if (motionElapsedRef.current >= total) {
        tailEls.current.forEach((t) => t && (t.style.opacity = "0"));
        setRestPositions(track.frames[track.frames.length - 1]);
        setFlowEnded(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, paused, flowEnded, track, round.motionMs, round.selectMs, round.sparks, setPhase]);

  // Paused time doesn't count toward selection / routing response times.
  useEffect(() => {
    if (!paused || (phase !== "select" && phase !== "route")) return;
    const pausedAt = performance.now();
    return () => {
      const d = performance.now() - pausedAt;
      selectStartRef.current += d;
      lastSelectAtRef.current += d;
      ruleStartRef.current += d;
    };
  }, [paused, phase]);

  // Step 3: choose the balls you were following. Taps can be undone until
  // the last one is chosen; then the choice locks and symbols are revealed.
  // Selection closes when the last ball is chosen or the window runs out
  // (untapped targets then count as missed).
  const endSelection = useCallback(() => {
    if (selectionClosedRef.current) return;
    selectionClosedRef.current = true;
    const pts = livePtsRef.current;
    setRestPositions((prevRest) => round.sparks.map((s, i) => overridesRef.current[s.sparkId] ?? pts[i] ?? prevRest[i]));
    setPhase(picksRef.current.length > 0 ? "reveal" : "result");
  }, [round.sparks, setPhase]);
  useEffect(() => {
    endSelectionRef.current = endSelection;
  }, [endSelection]);

  const toggleSelect = useCallback((sparkId: string) => {
    if (phase !== "select" || paused || selectionClosedRef.current) return;
    if (selected.includes(sparkId)) {
      picksRef.current = picksRef.current.filter((p) => p.sparkId !== sparkId);
      frozenRef.current.delete(sparkId);
      delete overridesRef.current[sparkId];
      setOverrides((o) => {
        const next = { ...o };
        delete next[sparkId];
        return next;
      });
      setSelected((s) => s.filter((id) => id !== sparkId));
      return;
    }
    const spark = round.sparks.find((s) => s.sparkId === sparkId);
    if (!spark) return;
    const now = performance.now();
    picksRef.current = [
      ...picksRef.current,
      {
        sparkId,
        isTarget: spark.isTarget,
        cargo: spark.cargo,
        gate: null,
        outcome: spark.isTarget ? "wrong-route" : "wrong-spark", // routing fills this in
        atMs: Math.round(now - selectStartRef.current),
        sincePrevMs: Math.round(now - lastSelectAtRef.current),
        routedAtMs: null,
      },
    ];
    lastSelectAtRef.current = now;
    // Stop this ball where it was tapped.
    const idx = round.sparks.findIndex((s) => s.sparkId === sparkId);
    const at = livePtsRef.current[idx];
    frozenRef.current.add(sparkId);
    overridesRef.current[sparkId] = at;
    setOverrides((o) => ({ ...o, [sparkId]: at }));
    const tail = tailEls.current[idx];
    if (tail) tail.style.opacity = "0";
    const next = [...selected, sparkId];
    setSelected(next);
    if (next.length >= n) setTimeout(() => endSelectionRef.current(), 350);
  }, [phase, paused, selected, round.sparks, n]);

  // Step 6: a selected ball reaches a gate.
  const routeTo = useCallback(
    (sparkId: string, gate: CargoSymbol) => {
      if (routed[sparkId]) return;
      const spark = round.sparks.find((s) => s.sparkId === sparkId);
      if (!spark) return;
      const ok = gateFor(spark.cargo, round.rule, round.categories) === gate;
      const now = performance.now();
      picksRef.current = picksRef.current.map((p) =>
        p.sparkId === sparkId
          ? { ...p, gate, routedAtMs: Math.round(now - ruleStartRef.current), outcome: !p.isTarget ? "wrong-spark" : ok ? "correct-route" : "wrong-route" }
          : p
      );
      const g = gates[round.gateOrder.indexOf(gate)];
      overridesRef.current[sparkId] = { x: g.x + g.width / 2, y: g.y + g.height * 0.62 };
      setOverrides((o) => ({ ...o, [sparkId]: { x: g.x + g.width / 2, y: g.y + g.height * 0.62 } }));
      setRouted((r) => {
        const next = { ...r, [sparkId]: { gate, ok } };
        const toRoute = picksRef.current.filter((pk) => pk.isTarget).length;
        if (Object.keys(next).length >= toRoute) setTimeout(() => setPhase("result"), 700);
        return next;
      });
      setArmed(null);
      setGateStates((s) => ({ ...s, [gate]: ok ? "open" : "reject" }));
      setTimeout(() => setGateStates((s) => ({ ...s, [gate]: "closed" })), 650);
      if (spark.isTarget && !ok && !round.isPractice) onEnergyCost(WRONG_ROUTE_ENERGY_COST);
    },
    [routed, round, gates, setPhase, onEnergyCost]
  );

  const toLocal = (e: React.PointerEvent): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const scale = rect.width / PLAY_AREA.width;
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  };

  const gateAt = (p: Point): CargoSymbol | null => {
    const i = gates.findIndex((r) => p.x >= r.x - GATE_HIT_PAD && p.x <= r.x + r.width + GATE_HIT_PAD && p.y >= r.y - GATE_HIT_PAD && p.y <= r.y + r.height + GATE_HIT_PAD);
    return i === -1 ? null : round.gateOrder[i];
  };

  const sparkPos = (sparkId: string, i: number): Point => overrides[sparkId] ?? restPositions[i];
  const isTargetId = (sparkId: string) => round.sparks.some((s) => s.sparkId === sparkId && s.isTarget);
  // Only correctly found balls go to the gates; a wrong ball has already faded out.
  const canRoute = (sparkId: string) => phase === "route" && !paused && selected.includes(sparkId) && isTargetId(sparkId) && !routed[sparkId];

  // Step 3: a tap selects whichever flowing ball is NEAREST the finger (not
  // whichever happens to be drawn on top), within a forgiving radius.
  const SELECT_RADIUS = SPARK_RADIUS + 16;
  const handleFieldTap = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== "select" || paused) return;
    const p = toLocal(e);
    let best = -1;
    let bestD = SELECT_RADIUS;
    round.sparks.forEach((s, i) => {
      const at = overridesRef.current[s.sparkId] ?? livePtsRef.current[i];
      const d = Math.hypot(at.x - p.x, at.y - p.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best >= 0 && (selected.includes(round.sparks[best].sparkId) || selected.length < n)) toggleSelect(round.sparks[best].sparkId);
  };

  const handlePointerDown = (sparkId: string, i: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canRoute(sparkId)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toLocal(e);
    const rest = sparkPos(sparkId, i);
    setDrag({ sparkId, x: p.x, y: p.y, offsetX: rest.x - p.x, offsetY: rest.y - p.y, startX: p.x, startY: p.y, moved: false });
  };

  const handlePointerMove = (sparkId: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || drag.sparkId !== sparkId || phase !== "route") return;
    const p = toLocal(e);
    const moved = drag.moved || Math.hypot(p.x - drag.startX, p.y - drag.startY) > DRAG_THRESHOLD;
    setDrag({ ...drag, x: p.x, y: p.y, moved });
  };

  const handlePointerUp = (sparkId: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || drag.sparkId !== sparkId) return;
    setDrag(null);
    const p = toLocal(e);
    const gate = drag.moved ? (gateAt({ x: p.x + drag.offsetX, y: p.y + drag.offsetY }) ?? gateAt(p)) : null;
    if (gate) routeTo(sparkId, gate);
    else if (!drag.moved) setArmed((a) => (a === sparkId ? null : sparkId));
  };

  const draggedOverGate = drag?.moved ? (gateAt({ x: drag.x + drag.offsetX, y: drag.y + drag.offsetY }) ?? gateAt(drag)) : null;

  const found = selected.filter((id) => round.sparks.find((s) => s.sparkId === id)?.isTarget).length;
  // The gates stand across the channel heads for the whole round.
  const gatesVisible = true;

  // The step card (mockup steps 1–6).
  let step = 1;
  let title = `Look at the ${n} glowing balls`;
  let subtitle = "Remember the ones that light up.";
  if (phase === "fade" || phase === "motion") {
    step = 2;
    title = "Watch the balls move";
    subtitle = `Keep an eye on the ${n} you saw.`;
  } else if (phase === "select") {
    step = 3;
    title = `Select the ${n} balls`;
    subtitle = flowEnded
      ? `The balls stopped — tap the ${n} you were following.`
      : `Tap the ${n} you were following — quick, they're still moving!`;
  } else if (phase === "reveal") {
    step = 4;
    title = "Symbols are revealed";
    const wrong = selected.length - found;
    subtitle =
      wrong === 0
        ? "Each selected ball shows a symbol."
        : found === 0
          ? `Not quite — the glowing ${n === 1 ? "ball was" : "balls were"} ours.`
          : `${wrong === 1 ? "One ball wasn't" : `${wrong} balls weren't`} ours — the glowing one was.`;
  } else if (phase === "route") {
    step = 5;
    title = "Send the balls through the matching gates";
    subtitle = "Drag each ball into the gate with the same symbol.";
  } else if (phase === "result" || phase === "flow") {
    step = 5;
    title = found === n ? `All ${n} balls found!` : `You found ${found} of ${n}`;
    subtitle = found === n ? "Great tracking — the gates are open." : "The glowing ones were the balls to follow.";
  }

  return (
    <div ref={containerRef} onPointerDown={handleFieldTap} style={{ position: "absolute", inset: 0 }}>
      {/* Gates (behind the balls so a dropped ball disappears into the portal) */}
      {round.gateOrder.map((symbol, gi) => (
        <RiverGate
          key={symbol}
          symbol={symbol}
          rect={gates[gi]}
          positionLabel={positionName(gi, round.gateOrder.length)}
          state={phase === "flow" ? "open" : (gateStates[symbol] ?? "closed")}
          visible={gatesVisible}
          highlighted={draggedOverGate === symbol || (armed !== null && phase === "route")}
        />
      ))}
      {/* Tap targets for "tap a ball, then tap a gate" */}
      {phase === "route" &&
        armed &&
        round.gateOrder.map((symbol, gi) => (
          <button
            key={`hit-${symbol}`}
            type="button"
            aria-label={`Send to ${positionName(gi, round.gateOrder.length)} gate`}
            onClick={() => routeTo(armed, symbol)}
            style={{ position: "absolute", left: gates[gi].x, top: gates[gi].y, width: gates[gi].width, height: gates[gi].height, background: "transparent", border: "none", cursor: "pointer", zIndex: 13 }}
          />
        ))}

      <div style={{ position: "absolute", inset: 0, opacity: phase === "flow" ? 0 : 1, transition: `opacity ${TIMING.flowMs}ms ease` }}>
        {round.sparks.map((spark, i) => {
          const dragging = drag?.sparkId === spark.sparkId && drag.moved;
          const pos = dragging ? { x: drag.x + drag.offsetX, y: drag.y + drag.offsetY } : sparkPos(spark.sparkId, i);
          const isSel = selected.includes(spark.sparkId);
          const afterSelect = phase === "reveal" || phase === "route" || phase === "result" || phase === "flow";
          let look: SparkLook = "idle";
          if (phase === "preview" && spark.isTarget) look = "preview";
          else if (phase === "select" && isSel) look = "picked";
          else if (afterSelect && isSel && !spark.isTarget) look = phase === "reveal" ? "wrong" : "gone";
          else if (afterSelect && isSel) look = routed[spark.sparkId] ? "gone" : "revealed";
          // A target the child missed lights up where it is (step 4, and again at the end).
          else if ((phase === "reveal" || phase === "result") && spark.isTarget) look = "preview";
          const showMissed = (phase === "reveal" || phase === "result") && spark.isTarget && !isSel;
          const hidden = afterSelect && !isSel && !showMissed;
          return (
            <div key={spark.sparkId} style={{ opacity: hidden ? 0 : 1, transition: "opacity 400ms ease" }}>
              <EnergySpark
                ref={(el) => {
                  sparkEls.current[i] = el;
                }}
                tailRef={(el) => {
                  tailEls.current[i] = el;
                }}
                x={pos.x}
                y={pos.y}
                cargo={spark.cargo}
                targetSlot={spark.isTarget ? round.sparks.filter((s) => s.isTarget).indexOf(spark) : null}
                look={armed === spark.sparkId && look === "revealed" ? "revealed" : look}
                dragging={dragging}
                interactive={canRoute(spark.sparkId)}
                animateMoves={phase !== "motion" && phase !== "select"}
                freeMove={(phase === "motion" || phase === "select") && !isSel && !flowEnded}
                ariaLabel={phase === "select" ? "energy ball" : `${SYMBOL_NAME[spark.cargo]} ball`}
                onPointerDown={handlePointerDown(spark.sparkId, i)}
                onPointerMove={handlePointerMove(spark.sparkId)}
                onPointerUp={handlePointerUp(spark.sparkId)}
                onPointerCancel={() => setDrag(null)}
              />
              {showMissed && phase === "reveal" && round.isPractice && (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: pos.x - 40,
                    top: pos.y - SPARK_RADIUS - 30,
                    width: 80,
                    display: "flex",
                    justifyContent: "center",
                    pointerEvents: "none",
                    zIndex: 17,
                    animation: "bubble-pop 260ms var(--ease-pop) both",
                  }}
                >
                  <span style={{ background: "#ffffff", color: "#1d4f8f", fontSize: 11, fontWeight: 900, padding: "3px 8px", borderRadius: 999, boxShadow: "0 3px 8px rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}>This one!</span>
                </div>
              )}
              {armed === spark.sparkId && phase === "route" && (
                <div aria-hidden style={{ position: "absolute", left: pos.x - SPARK_RADIUS - 6, top: pos.y - SPARK_RADIUS - 6, width: SPARK_RADIUS * 2 + 12, height: SPARK_RADIUS * 2 + 12, borderRadius: "50%", border: "3px dashed #ffffff", animation: "glow-pulse 1s ease-in-out infinite", pointerEvents: "none", zIndex: 16 }} />
              )}
            </div>
          );
        })}
      </div>


      <StepHeader
        step={step}
        title={title}
        subtitle={subtitle}
        paused={paused}
        onTogglePause={onTogglePause}
        isPractice={round.isPractice}
        roundLabel={round.label}
        scoredRoundsDone={scoredRoundsDone}
        practiceRoundsDone={practiceRoundsDone}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pause + completion
// ---------------------------------------------------------------------------

function PauseOverlay({ onResume, onExit }: { onResume: () => void; onExit: () => void }) {
  return (
    <div style={pauseScrimStyle}>
      <div style={pauseCardStyle}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--color-soft)" }}>Paused</div>
        <button type="button" className="tap-scale" onClick={onResume} style={primaryButtonStyle}>
          Resume →
        </button>
        <button type="button" className="tap-scale" onClick={onExit} style={secondaryButtonStyle}>
          Exit
        </button>
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function GameComplete({ outcome, onPlayAgain, onFinish }: { outcome: GameOutcome; onPlayAgain: () => void; onFinish: () => void }) {
  const { metrics, rewards } = outcome;
  const [chosen, setChosen] = useState<string[]>([]);
  const [claimed, setClaimed] = useState(false);

  const toggle = (name: string) => {
    if (claimed) return;
    setChosen((c) => (c.includes(name) ? c.filter((x) => x !== name) : c.length < REWARDS.accessoriesToPick ? [...c, name] : c));
  };

  const claim = () => {
    reportGame({ ...outcome, accessoriesChosen: chosen });
    setClaimed(true);
  };

  return (
    <div style={completeStyle}>
      <RiverBackdrop dim={0.68} />
      <div style={{ position: "relative" }}>
        <Fumi mood="happy" size={74} tailWag />
      </div>
      <div style={{ fontSize: 21, fontWeight: 800 }}>Twin Current Tamed!</div>

      <div style={{ display: "flex", gap: 6 }} aria-label={`${outcome.starsEarned} of 3 stars`}>
        {[1, 2, 3].map((s) => (
          <span key={s} style={{ fontSize: 26, opacity: s <= outcome.starsEarned ? 1 : 0.25, animation: `star-pop 420ms ease-out ${s * 0.12}s both` }}>
            ⭐
          </span>
        ))}
      </div>

      <div style={statsCardStyle}>
        <Stat label="Sparks Tracked" value={`${metrics.trackingAccuracyPct}%`} />
        <Stat label="Right Gates" value={`${metrics.gateRoutingAccuracyPct}%`} />
        <Stat label="Time" value={formatDuration(metrics.gameplayDurationMs)} />
        <Stat label="Found" value={`${metrics.correctTargetsIdentified}/${metrics.totalTargetsPresented}`} />
        <Stat label="Wrong Sparks" value={`${metrics.wrongSparksSelected}`} />
        <Stat label="Rule Changes" value={`${metrics.totalRuleChanges}`} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <RewardPill icon="✨" label={`+${rewards.xp} XP`} />
        <RewardPill icon="🪙" label={`+${rewards.coins}`} />
        {rewards.badge && <RewardPill icon="🏅" label={rewards.badge} highlight />}
        {rewards.day2BonusXp > 0 && <RewardPill icon="🌟" label={`+${rewards.day2BonusXp} XP Day 2 bonus`} highlight />}
      </div>

      <div style={{ width: "100%" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-lavender)", textAlign: "center", marginBottom: 6 }}>
          {claimed ? "Accessories unlocked!" : `Choose ${REWARDS.accessoriesToPick} accessories`}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {REWARDS.accessoryChoices.map((name) => {
            const on = chosen.includes(name);
            return (
              <button
                key={name}
                type="button"
                className="tap-scale"
                aria-pressed={on}
                onClick={() => toggle(name)}
                disabled={claimed && !on}
                style={{
                  minHeight: 38,
                  borderRadius: 12,
                  border: on ? "1.5px solid #9bf0ff" : "1px solid rgba(196,181,253,0.25)",
                  background: on ? "rgba(79,211,230,0.18)" : "rgba(255,255,255,0.05)",
                  color: "var(--color-soft)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: claimed ? "default" : "pointer",
                  opacity: claimed && !on ? 0.35 : 1,
                }}
              >
                {on ? "✓ " : ""}
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {claimed ? (
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <button type="button" className="tap-scale" onClick={onPlayAgain} style={{ ...secondaryButtonStyle, flex: 1 }}>
            Play Again
          </button>
          <button type="button" className="tap-scale" onClick={onFinish} style={{ ...primaryButtonStyle, flex: 1 }}>
            Finish
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="tap-scale"
          onClick={claim}
          disabled={chosen.length < REWARDS.accessoriesToPick}
          style={{ ...primaryButtonStyle, width: "100%", opacity: chosen.length < REWARDS.accessoriesToPick ? 0.45 : 1 }}
        >
          Claim Rewards
        </button>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-soft)" }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--color-lavender)", opacity: 0.85 }}>{label}</div>
    </div>
  );
}

function RewardPill({ icon, label, highlight }: { icon: string; label: string; highlight?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: highlight ? "rgba(240,166,60,0.18)" : "rgba(255,255,255,0.06)",
        border: highlight ? "1px solid rgba(240,166,60,0.6)" : "1px solid rgba(196,181,253,0.2)",
        borderRadius: 999,
        padding: "5px 11px",
        fontSize: 12.5,
        fontWeight: 700,
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const sceneStyle: React.CSSProperties = {
  position: "relative",
  width: PLAY_AREA.width,
  height: PLAY_AREA.height,
  overflow: "hidden",
  background: "var(--color-midnight)",
  fontFamily: "var(--font-body), system-ui",
  userSelect: "none",
  WebkitUserSelect: "none",
};

const veilStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 200,
  background: "var(--color-midnight)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "opacity 380ms ease",
};

const veilMessageStyle: React.CSSProperties = {
  fontFamily: "var(--font-display), var(--font-body), system-ui",
  fontSize: 20,
  fontWeight: 800,
  color: "var(--color-soft)",
  animation: "bubble-pop 260ms var(--ease-pop) both",
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 50,
  border: "none",
  borderRadius: 999,
  background: "var(--gradient-cta)",
  color: "#fff",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
  boxShadow: "var(--shadow-cta)",
  transition: "opacity 300ms ease",
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 50,
  border: "1.5px solid rgba(196,181,253,0.5)",
  borderRadius: 999,
  background: "transparent",
  color: "var(--color-lavender)",
  fontWeight: 800,
  fontSize: 14.5,
  cursor: "pointer",
};

const pauseScrimStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(4,3,15,0.88)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 40,
};

const pauseCardStyle: React.CSSProperties = {
  width: 260,
  background: "rgba(16,11,53,0.96)",
  border: "1px solid rgba(196,181,253,0.3)",
  borderRadius: 20,
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  alignItems: "stretch",
  textAlign: "center",
  boxShadow: "0 20px 50px rgba(0,0,0,0.55)",
};

const completeStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "52px 22px 28px",
  gap: 11,
  color: "var(--color-soft)",
};

const statsCardStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  background: "rgba(12,30,48,0.82)",
  border: "1px solid rgba(155,240,255,0.22)",
  borderRadius: 18,
  padding: "12px 10px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  rowGap: 10,
};
