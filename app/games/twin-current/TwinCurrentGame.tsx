"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgeBand, CargoSymbol, GameOutcome, PickOutcome, PickRecord, Point, RoundPlan, RoundResult } from "./types";
import {
  ASSETS,
  CHILD_RULE_TEXT,
  DEFAULT_QUEST,
  FUMI_SRC,
  HUD_HEIGHT,
  NARRATION_TEXT,
  PLAY_AREA,
  QUEST_TEXT,
  REWARDS,
  RULE_CARD_RECT,
  SAFE_AREA_TOP,
  SPARK_RADIUS,
  START_ENERGY,
  TIMING,
  WRONG_ROUTE_ENERGY_COST,
  gateRects,
} from "./config";
import { buildSession } from "./engine/sessionPlanner";
import { sampleTrack } from "./engine/motion";
import { gateFor } from "./engine/rules";
import { computeGameOutcome } from "./engine/metrics";
import { RiverBackdrop } from "./components/RiverBackdrop";
import { EnergySpark, GLOW_COLOR, type SparkVisualState } from "./components/EnergySpark";
import { RiverGate, type GateState } from "./components/RiverGate";
import { RuleCard } from "./components/RuleCard";
import { TwinHud } from "./components/TwinHud";
import { Typewriter } from "../../components/Typewriter";
import { Fumi } from "../../components/Fumi";
import { completesDay } from "../../lib/dayProgress";
import { reportGame } from "./lib/sessionReporter";

// intro (quest + narration) -> playing (4 practice + 16 scored rounds,
// back-to-back) -> complete (stats, rewards, accessory pick).
type GameScreen = "intro" | "playing" | "complete";

// One round: targets glow -> glow fades -> everything moves -> gates rise
// and the child routes sparks -> true targets briefly revealed -> gates
// swing open and the stream surges into the next round.
type RoundPhase = "reveal" | "fade" | "motion" | "respond" | "result" | "flow";

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

  const [screen, setScreen] = useState<GameScreen>("intro");
  const [narrationDone, setNarrationDone] = useState(false);
  const [roundIndex, setRoundIndex] = useState(0);
  const [scoredDone, setScoredDone] = useState(0);
  const [energy, setEnergy] = useState(START_ENERGY);
  const [paused, setPaused] = useState(false);
  const [roundPhase, setRoundPhase] = useState<RoundPhase>("reveal");
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
    setEnergy(START_ENERGY);
    setScoredDone(0);
    setRoundIndex(0);
    setRoundPhase("reveal");
    setPaused(false);
    runTransition(() => {
      startedAtRef.current = Date.now();
      setScreen("playing");
    });
  }, [runTransition]);

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
    setEnergy(energyRef.current);
  }, []);

  const handleRoundFinished = useCallback(
    (result: RoundResult) => {
      resultsRef.current = [...resultsRef.current, result];
      if (!result.isPractice) setScoredDone((n) => n + 1);

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
        runTransition(() => {
          setRoundPhase("reveal");
          setRoundIndex(next);
        }, "Practice done — now it counts!");
      } else {
        setRoundPhase("reveal");
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
  if (screen === "intro") {
    content = <Intro narrationDone={narrationDone} onNarrationDone={() => setNarrationDone(true)} onStart={startRun} />;
  } else if (screen === "playing" && round) {
    content = (
      <>
        <RiverBackdrop surge={roundPhase === "flow"} />
        <RoundRunner
          key={`${attempt}-${round.roundIndex}`}
          round={round}
          paused={paused}
          onPhaseChange={setRoundPhase}
          onEnergyCost={handleEnergyCost}
          onFinished={handleRoundFinished}
        />
        <TwinHud
          label={round.label}
          isPractice={round.isPractice}
          scoredRoundsDone={scoredDone}
          energy={energy}
          paused={paused}
          onTogglePause={togglePause}
        />
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
// Intro
// ---------------------------------------------------------------------------

function Intro({ narrationDone, onNarrationDone, onStart }: { narrationDone: boolean; onNarrationDone: () => void; onStart: () => void }) {
  return (
    <>
      <RiverBackdrop />
      <div aria-hidden style={introVignetteStyle} />

      <div style={titleWrapStyle}>
        <div style={titlePlankStyle}>Twin Current</div>
        <div style={questCardStyle}>
          <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: 1.2, color: "#8a5a1c", marginBottom: 4 }}>DAY 2 · GREENWOOD RIVER RELAY</div>
          {QUEST_TEXT}
        </div>
      </div>

      <div style={narrationGroupStyle}>
        <div style={narrationBubbleStyle}>
          <Typewriter text={NARRATION_TEXT} onDone={onNarrationDone} speedMultiplier={0.7} />
          <div style={narrationTailStyle} />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={FUMI_SRC} alt="Fumi" style={{ width: 130, height: "auto", filter: "drop-shadow(0 10px 16px rgba(0,0,0,0.45))", animation: "float-y 3.2s ease-in-out infinite" }} />
      </div>

      <button
        type="button"
        className="tap-scale"
        onClick={onStart}
        disabled={!narrationDone}
        style={{ ...pinnedButtonStyle, opacity: narrationDone ? 1 : 0, pointerEvents: narrationDone ? "auto" : "none" }}
      >
        Start Watching →
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// One round
// ---------------------------------------------------------------------------

type RoundRunnerProps = {
  round: RoundPlan;
  paused: boolean;
  onPhaseChange: (phase: RoundPhase) => void;
  onEnergyCost: (cost: number) => void;
  onFinished: (result: RoundResult) => void;
};

type Drag = { sparkId: string; x: number; y: number; offsetX: number; offsetY: number; startX: number; startY: number; moved: boolean };
type Toast = { text: string; tone: "positive" | "negative" | "info"; key: number };

const DRAG_THRESHOLD = 6;
const GATE_HIT_PAD = 14;

function practiceHint(round: RoundPlan, phase: RoundPhase): string | null {
  if (!round.isPractice) return null;
  if (round.roundIndex === 0 && phase === "respond") return "Drag each of our sparks to the gate the card shows.";
  if (round.ruleChanged && phase === "respond") return "The rule changed! Now each spark goes to the OTHER gate.";
  return null;
}

// Keyed per round by the parent, so every bit of per-round state resets by
// remounting rather than by an effect watching the round id.
function RoundRunner({ round, paused, onPhaseChange, onEnergyCost, onFinished }: RoundRunnerProps) {
  const track = round.motion;
  const gates = useMemo(() => gateRects(round.gateOrder.length), [round.gateOrder.length]);

  const [phase, setPhaseState] = useState<RoundPhase>("reveal");
  const [restPositions, setRestPositions] = useState<Point[]>(() => track.frames[0]);
  const [sparkStates, setSparkStates] = useState<Record<string, SparkVisualState>>({});
  const [overrides, setOverrides] = useState<Record<string, Point>>({});
  const [gateStates, setGateStates] = useState<Partial<Record<CargoSymbol, GateState>>>({});
  const [splashes, setSplashes] = useState<{ id: number; gate: CargoSymbol }[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pickCount, setPickCount] = useState(0);
  const [foundCount, setFoundCount] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const sparkEls = useRef<(HTMLDivElement | null)[]>([]);
  const motionElapsedRef = useRef(0);
  const respondStartRef = useRef(0);
  const lastPickAtRef = useRef(0);
  const picksRef = useRef<PickRecord[]>([]);

  const setPhase = useCallback(
    (p: RoundPhase) => {
      setPhaseState(p);
      onPhaseChange(p);
    },
    [onPhaseChange]
  );

  const buildResult = useCallback((): RoundResult => {
    const picks = picksRef.current;
    const correctTargets = picks.filter((p) => p.isTarget).length;
    return {
      roundIndex: round.roundIndex,
      isPractice: round.isPractice,
      sparkCount: round.sparks.length,
      targetCount: round.targetCount,
      speedPxPerSec: round.speedPxPerSec,
      speedTier: round.speedTier,
      rule: round.rule,
      ruleChanged: round.ruleChanged,
      picks,
      correctTargets,
      wrongSparks: picks.filter((p) => p.outcome === "wrong-spark").length,
      missedTargets: round.targetCount - correctTargets,
      correctRoutes: picks.filter((p) => p.outcome === "correct-route").length,
      wrongRoutes: picks.filter((p) => p.outcome === "wrong-route").length,
      firstResponseMs: picks.length > 0 ? picks[0].atMs : null,
    };
  }, [round]);

  // Fixed-duration phases. Paused: hold (the phase re-arms from its start on
  // resume). Motion has its own pausable clock below.
  useEffect(() => {
    if (paused) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (phase === "reveal") timer = setTimeout(() => setPhase("fade"), TIMING.revealMs);
    else if (phase === "fade") timer = setTimeout(() => setPhase("motion"), TIMING.fadeMs);
    else if (phase === "result") timer = setTimeout(() => setPhase("flow"), TIMING.resultMs);
    else if (phase === "flow") timer = setTimeout(() => onFinished(buildResult()), TIMING.flowMs);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [phase, paused, setPhase, onFinished, buildResult]);

  // Motion playback: writes transforms straight to the spark elements each
  // frame (no React render per frame). Elapsed time only accumulates while
  // unpaused, so pausing freezes the sparks mid-stream.
  useEffect(() => {
    if (phase !== "motion" || paused) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      motionElapsedRef.current += now - last;
      last = now;
      const pts = sampleTrack(track, motionElapsedRef.current);
      pts.forEach((p, i) => {
        const el = sparkEls.current[i];
        if (el) el.style.transform = `translate(${p.x - SPARK_RADIUS}px, ${p.y - SPARK_RADIUS}px)`;
      });
      if (motionElapsedRef.current >= round.motionMs) {
        setRestPositions(track.frames[track.frames.length - 1]);
        respondStartRef.current = performance.now();
        lastPickAtRef.current = respondStartRef.current;
        setPhase("respond");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, paused, track, round.motionMs, setPhase]);

  // Paused time while the gates are up doesn't count toward response times.
  useEffect(() => {
    if (!paused || phase !== "respond") return;
    const pausedAt = performance.now();
    return () => {
      const d = performance.now() - pausedAt;
      respondStartRef.current += d;
      lastPickAtRef.current += d;
    };
  }, [paused, phase]);

  const showToast = useCallback((text: string, tone: Toast["tone"]) => {
    setToast({ text, tone, key: Date.now() });
  }, []);

  const resolvePick = useCallback(
    (sparkId: string, gate: CargoSymbol) => {
      if (picksRef.current.length >= round.targetCount) return;
      const spark = round.sparks.find((s) => s.sparkId === sparkId);
      if (!spark) return;

      const now = performance.now();
      let outcome: PickOutcome;
      if (!spark.isTarget || !spark.cargo) outcome = "wrong-spark";
      else outcome = gateFor(spark.cargo, round.rule, round.categories) === gate ? "correct-route" : "wrong-route";

      picksRef.current = [
        ...picksRef.current,
        {
          sparkId,
          isTarget: spark.isTarget,
          cargo: spark.cargo,
          gate,
          outcome,
          atMs: Math.round(now - respondStartRef.current),
          sincePrevMs: Math.round(now - lastPickAtRef.current),
        },
      ];
      lastPickAtRef.current = now;
      setPickCount(picksRef.current.length);
      if (spark.isTarget) setFoundCount((n) => n + 1);
      setSelected(null);

      const rect = gates[round.gateOrder.indexOf(gate)];
      setOverrides((o) => ({ ...o, [sparkId]: { x: rect.x + rect.width / 2, y: rect.y + rect.height * 0.62 } }));
      const splashId = Date.now();
      setSplashes((s) => [...s, { id: splashId, gate }]);
      setTimeout(() => setSplashes((s) => s.filter((x) => x.id !== splashId)), 750);
      setSparkStates((s) => ({ ...s, [sparkId]: outcome === "wrong-spark" ? "fizzled" : "absorbed" }));

      if (outcome === "correct-route") {
        setGateStates((g) => ({ ...g, [gate]: "open" }));
        showToast("Gate open! That's our spark.", "positive");
      } else {
        setGateStates((g) => (g[gate] === "open" ? g : { ...g, [gate]: "reject" }));
        setTimeout(() => setGateStates((g) => (g[gate] === "reject" ? { ...g, [gate]: "closed" } : g)), 600);
        if (outcome === "wrong-route") {
          if (!round.isPractice) onEnergyCost(WRONG_ROUTE_ENERGY_COST);
          showToast("Our spark — but wrong gate. Check the rule card.", "negative");
        } else {
          showToast("That one wasn't ours.", "negative");
        }
      }

      if (picksRef.current.length >= round.targetCount) {
        setTimeout(() => setPhase("result"), 650);
      }
    },
    [round, gates, onEnergyCost, setPhase, showToast]
  );

  const canPick = phase === "respond" && !paused && pickCount < round.targetCount;

  const toLocal = (e: React.PointerEvent): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const scale = rect.width / PLAY_AREA.width;
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  };

  const gateAt = (p: Point): CargoSymbol | null => {
    const i = gates.findIndex(
      (r) => p.x >= r.x - GATE_HIT_PAD && p.x <= r.x + r.width + GATE_HIT_PAD && p.y >= r.y - GATE_HIT_PAD && p.y <= r.y + r.height + GATE_HIT_PAD
    );
    return i === -1 ? null : round.gateOrder[i];
  };

  const sparkPos = (sparkId: string, i: number): Point => overrides[sparkId] ?? restPositions[i];

  const handlePointerDown = (sparkId: string, i: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canPick || sparkStates[sparkId]) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toLocal(e);
    const rest = sparkPos(sparkId, i);
    setDrag({ sparkId, x: p.x, y: p.y, offsetX: rest.x - p.x, offsetY: rest.y - p.y, startX: p.x, startY: p.y, moved: false });
  };

  const handlePointerMove = (sparkId: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || drag.sparkId !== sparkId) return;
    const p = toLocal(e);
    const moved = drag.moved || Math.hypot(p.x - drag.startX, p.y - drag.startY) > DRAG_THRESHOLD;
    setDrag({ ...drag, x: p.x, y: p.y, moved });
  };

  const handlePointerUp = (sparkId: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || drag.sparkId !== sparkId) return;
    const p = toLocal(e);
    setDrag(null);
    const gate = drag.moved ? (gateAt({ x: p.x + drag.offsetX, y: p.y + drag.offsetY }) ?? gateAt(p)) : null;
    if (gate) resolvePick(sparkId, gate);
    else if (!drag.moved) setSelected((s) => (s === sparkId ? null : sparkId)); // tap-to-select, then tap a gate
  };

  const handlePointerCancel = () => setDrag(null);

  const draggedOverGate = drag?.moved ? (gateAt({ x: drag.x + drag.offsetX, y: drag.y + drag.offsetY }) ?? gateAt(drag)) : null;

  const glowVisible = phase === "reveal";
  const gatesVisible = phase === "respond" || phase === "result" || phase === "flow";
  const pickedIds = new Set(Object.keys(sparkStates));
  const fumiVisible = phase === "reveal" || gatesVisible;

  const hint = practiceHint(round, phase);
  let strip: { text: string; tone: Toast["tone"] } | null = null;
  if (phase === "reveal") strip = { text: round.roundIndex === 0 ? "These glowing sparks are ours. Watch them!" : "Watch our glowing sparks!", tone: "info" };
  else if (phase === "respond" && toast) strip = toast;
  else if (phase === "respond") strip = { text: hint ?? (round.ruleChanged ? "New rule! Read the card." : `Send our ${round.targetCount} sparks home.`), tone: "info" };
  else if (phase === "result") {
    strip = {
      text: foundCount === round.targetCount ? `All ${round.targetCount} of our sparks found!` : `Found ${foundCount} of ${round.targetCount}. The glowing ones were ours.`,
      tone: foundCount === round.targetCount ? "positive" : "info",
    };
  }

  return (
    <div ref={containerRef} style={{ position: "absolute", inset: 0 }}>
      {/* Sparks */}
      <div style={{ position: "absolute", inset: 0, opacity: phase === "flow" ? 0 : 1, transition: `opacity ${TIMING.flowMs}ms ease` }}>
        {round.sparks.map((spark, i) => {
          const dragging = drag?.sparkId === spark.sparkId;
          const pos = dragging ? { x: drag.x + drag.offsetX, y: drag.y + drag.offsetY } : sparkPos(spark.sparkId, i);
          // After the last pick, any target the child didn't find re-lights
          // briefly as feedback. Never during motion.
          const revealMissed = phase === "result" && spark.isTarget && !pickedIds.has(spark.sparkId);
          return (
            <EnergySpark
              key={spark.sparkId}
              ref={(el) => {
                sparkEls.current[i] = el;
              }}
              x={pos.x}
              y={pos.y}
              glow={spark.glow}
              glowVisible={glowVisible || revealMissed}
              cargo={spark.cargo}
              cargoVisible={glowVisible || revealMissed}
              visualState={selected === spark.sparkId ? "selected" : (sparkStates[spark.sparkId] ?? "idle")}
              dragging={dragging}
              interactive={canPick && !sparkStates[spark.sparkId]}
              animateMoves={phase !== "motion"}
              onPointerDown={handlePointerDown(spark.sparkId, i)}
              onPointerMove={handlePointerMove(spark.sparkId)}
              onPointerUp={handlePointerUp(spark.sparkId)}
              onPointerCancel={handlePointerCancel}
            />
          );
        })}

        {/* Fumi's markers over each target during the reveal. */}
        {phase === "reveal" &&
          round.sparks.map((spark, i) =>
            spark.glow ? (
              <div
                key={`mark-${spark.sparkId}`}
                aria-hidden
                style={{
                  position: "absolute",
                  left: restPositions[i].x - 8,
                  top: restPositions[i].y - 50,
                  color: GLOW_COLOR[spark.glow],
                  fontSize: 16,
                  textShadow: `0 0 8px ${GLOW_COLOR[spark.glow]}`,
                  animation: "float-y 1s ease-in-out infinite",
                  pointerEvents: "none",
                  zIndex: 16,
                }}
              >
                ▼
              </div>
            ) : null
          )}
      </div>

      {/* Water swirls under the balls once they come to rest */}
      {phase === "respond" &&
        round.sparks.map((spark, i) =>
          sparkStates[spark.sparkId] || drag?.sparkId === spark.sparkId ? null : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`swirl-${spark.sparkId}`}
              src={ASSETS.swirl}
              alt=""
              aria-hidden
              style={{
                position: "absolute",
                left: restPositions[i].x - 30,
                top: restPositions[i].y + 2,
                width: 60,
                height: "auto",
                opacity: 0.6,
                pointerEvents: "none",
                zIndex: 14,
                animation: "bubble-pop 400ms ease-out both",
              }}
            />
          )
        )}

      {/* Gates + rule card */}
      {round.gateOrder.map((symbol, gi) => (
        <RiverGate
          key={symbol}
          symbol={symbol}
          rect={gates[gi]}
          state={phase === "flow" ? "open" : (gateStates[symbol] ?? "closed")}
          visible={gatesVisible}
          highlighted={draggedOverGate === symbol || (selected !== null && canPick)}
          onClick={canPick && selected ? () => resolvePick(selected, symbol) : undefined}
        />
      ))}
      <RuleCard rule={round.rule} categories={round.categories} visible={gatesVisible} changed={round.ruleChanged} />

      {splashes.map((s) => {
        const r = gates[round.gateOrder.indexOf(s.gate)];
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={s.id}
            src={ASSETS.splash}
            alt=""
            aria-hidden
            style={{ position: "absolute", left: r.x + r.width / 2 - 40, top: r.y + r.height - 70, width: 80, height: "auto", pointerEvents: "none", zIndex: 16, animation: "tc-splash 750ms ease-out both" }}
          />
        );
      })}

      {/* Fumi: marks targets at the start, quiet during motion, points at the rule card at the gate. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={FUMI_SRC}
        alt=""
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: RULE_CARD_RECT.y - 8,
          width: 80,
          height: "auto",
          transform: "scaleX(-1)",
          opacity: fumiVisible ? 1 : 0,
          transition: "opacity 400ms ease",
          filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.5))",
          pointerEvents: "none",
          zIndex: 13,
        }}
      />

      {strip && (
        // Full-width centring wrapper: the pop-in animation owns `transform`,
        // so the strip itself can't be centred with translateX(-50%).
        <div style={stripRowStyle}>
          <div
            key={`${strip.text}-${toast?.key ?? 0}`}
            role="status"
            style={{
              ...stripStyle,
              ...(strip.tone === "positive" ? stripPositive : strip.tone === "negative" ? stripNegative : stripInfo),
            }}
          >
            {strip.text}
          </div>
        </div>
      )}

      {round.roundIndex === 0 && phase === "reveal" && <div style={ruleReminderStyle}>{CHILD_RULE_TEXT}</div>}

      {phase === "respond" && (
        <div style={picksLeftStyle} aria-label={`${round.targetCount - pickCount} sparks left to send`}>
          {Array.from({ length: round.targetCount }, (_, i) => (
            <span key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: i < pickCount ? "rgba(255,255,255,0.2)" : "#9bf0ff", boxShadow: i < pickCount ? "none" : "0 0 6px #9bf0ff" }} />
          ))}
        </div>
      )}
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

const introVignetteStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(180deg, rgba(10,30,40,0.35) 0%, transparent 35%, transparent 55%, rgba(10,30,40,0.4) 100%)",
  pointerEvents: "none",
};

const titleWrapStyle: React.CSSProperties = {
  position: "absolute",
  top: SAFE_AREA_TOP + 12,
  left: 22,
  right: 22,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
};

// Wooden plank title, in the design's wood-and-parchment style.
const titlePlankStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #b77a3e 0%, #8f5a28 55%, #6e421b 100%)",
  border: "3px solid #5a3412",
  borderRadius: 16,
  padding: "6px 26px 8px",
  color: "#fff6e2",
  fontFamily: "var(--font-display), var(--font-body), system-ui",
  fontSize: 34,
  fontWeight: 800,
  letterSpacing: 0.5,
  textShadow: "0 3px 0 #4a2a0e, 0 4px 10px rgba(0,0,0,0.4)",
  boxShadow: "inset 0 2px 0 rgba(255,220,170,0.4), 0 10px 22px rgba(30,15,0,0.45)",
};

const questCardStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #fbf1d9 0%, #f1dfb8 100%)",
  border: "2px solid #c9a265",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 12.5,
  fontWeight: 600,
  lineHeight: 1.5,
  color: "#3b2a14",
  textAlign: "center",
  boxShadow: "0 8px 18px rgba(40,25,5,0.35)",
};

const narrationGroupStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 112,
  left: 22,
  right: 22,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 14,
  animation: "bubble-pop 420ms var(--ease-pop) both",
};

const narrationBubbleStyle: React.CSSProperties = {
  position: "relative",
  background: "rgba(246,245,255,0.96)",
  color: "var(--color-ink)",
  borderRadius: 18,
  padding: "12px 15px",
  fontSize: 13.5,
  fontWeight: 600,
  lineHeight: 1.5,
  textAlign: "center",
  boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
  minHeight: 108,
};

const narrationTailStyle: React.CSSProperties = {
  position: "absolute",
  bottom: -8,
  left: "50%",
  marginLeft: -8,
  width: 16,
  height: 16,
  background: "rgba(246,245,255,0.96)",
  transform: "rotate(45deg)",
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

const pinnedButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  position: "absolute",
  bottom: 40,
  left: 24,
  right: 24,
  minHeight: 54,
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

// Messages sit at the bottom: the top of the river belongs to the gates.
const stripRowStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 20,
  left: 16,
  right: 16,
  display: "flex",
  justifyContent: "center",
  zIndex: 22,
  pointerEvents: "none",
};

const stripStyle: React.CSSProperties = {
  maxWidth: "100%",
  padding: "5px 14px",
  borderRadius: 14,
  fontSize: 12.5,
  fontWeight: 700,
  lineHeight: 1.35,
  textAlign: "center",
  boxShadow: "0 6px 16px rgba(0,0,0,0.4)",
  animation: "bubble-pop 220ms var(--ease-pop) both",
};

const stripInfo: React.CSSProperties = {
  background: "rgba(246,245,255,0.95)",
  color: "var(--color-ink)",
};

const stripPositive: React.CSSProperties = {
  background: "rgba(10,40,24,0.94)",
  border: "1px solid rgba(61,220,132,0.6)",
  color: "#8ff0b8",
};

const stripNegative: React.CSSProperties = {
  background: "rgba(40,15,13,0.94)",
  border: "1px solid rgba(226,73,63,0.55)",
  color: "#FF9D9D",
};

const ruleReminderStyle: React.CSSProperties = {
  position: "absolute",
  top: SAFE_AREA_TOP + HUD_HEIGHT + 12,
  left: 24,
  right: 24,
  textAlign: "center",
  padding: "12px 16px",
  borderRadius: 16,
  fontSize: 12.5,
  lineHeight: 1.5,
  fontWeight: 600,
  color: "var(--color-soft)",
  background: "rgba(7,6,28,0.9)",
  border: "1px solid rgba(155,240,255,0.35)",
  zIndex: 23,
  animation: "bubble-pop 300ms var(--ease-pop) both",
  pointerEvents: "none",
};

const picksLeftStyle: React.CSSProperties = {
  position: "absolute",
  top: RULE_CARD_RECT.y + RULE_CARD_RECT.height + 6,
  left: RULE_CARD_RECT.x + RULE_CARD_RECT.width / 2,
  transform: "translateX(-50%)",
  display: "flex",
  gap: 5,
  zIndex: 14,
  pointerEvents: "none",
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
