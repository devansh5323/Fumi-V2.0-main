"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgeBand, GameOutcome, SignalResult, StagePlan, StageResult, StrayTap } from "./types";
import {
  AGE_BAND_CONFIG,
  ASSETS,
  HUD_HEIGHT,
  PLAY_AREA,
  RESPONSE_GRACE_MS,
  REWARDS,
  SAFE_AREA_TOP,
  START_CARD_TEXT,
  TOWERS,
  TUTORIAL_DEMO_MS,
  TUTORIAL_GREETING,
  HOW_TO_PLAY_GREETING,
  REAL_GAME_GREETING,
  TUTORIAL_STEPS,
} from "./config";
import { buildSession, eventOnTower, liveTarget } from "./engine/schedule";
import { computeGameOutcome } from "./engine/metrics";
import { SignalEffect } from "./components/SignalEffect";
import { SignalHud } from "./components/SignalHud";
import { LivingScene } from "./components/LivingScene";
import { FumiGuide } from "./components/FumiGuide";
import { MistPuff, RelayBeam } from "./components/RelayFeedback";
import { completesDay } from "../../lib/dayProgress";
import { reportGame } from "./lib/sessionReporter";

// start (title sign + Play) -> playing (one
// continuous scene: tutorial -> practice -> 3 scored blocks) -> complete.
type GameScreen = "start" | "playing" | "complete";
type PlayPhase = "tutorial" | "stages";

function generateSeed(): string {
  return `sw-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type SignalWatchGameProps = {
  ageBand: AgeBand;
  seed?: string;
  onExit: () => void;
};

export function SignalWatchGame({ ageBand, seed, onExit }: SignalWatchGameProps) {
  const [sessionSeed] = useState(() => seed ?? generateSeed());
  const [attempt, setAttempt] = useState(0);
  const stages = useMemo(() => buildSession(ageBand, `${sessionSeed}-a${attempt}`), [ageBand, sessionSeed, attempt]);
  const totalRealSignals = useMemo(
    () => stages.filter((s) => !s.isPractice).reduce((n, s) => n + s.events.filter((e) => e.type === "three-rings").length, 0),
    [stages]
  );
  const activity = AGE_BAND_CONFIG[ageBand].riverActivity;

  const [screen, setScreen] = useState<GameScreen>("start");
  const [playPhase, setPlayPhase] = useState<PlayPhase>("tutorial");
  const [stageIndex, setStageIndex] = useState(0);
  const [activations, setActivations] = useState(0);
  // Fumi's typed line in a speech bubble: shown right after Play (before
  // the tutorial) and again before the How to Play round. She and the
  // bubble leave before play resumes. null = Fumi not shown.
  const [greeting, setGreeting] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);
  const [veil, setVeil] = useState<{ opacity: number; message: string | null }>({ opacity: 0, message: null });

  const resultsRef = useRef<StageResult[]>([]);
  const startedAtRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const pauseStartRef = useRef(0);

  const stage = stages[stageIndex];

  // Dip to dark, swap content while covered, optionally hold a short label.
  const runTransition = useCallback((action: () => void, message: string | null = null) => {
    setVeil({ opacity: 1, message });
    const holdMs = message ? 1000 : 120;
    setTimeout(() => {
      action();
      setTimeout(() => setVeil({ opacity: 0, message: null }), holdMs);
    }, 380);
  }, []);

  const beginRun = useCallback(() => {
    resultsRef.current = [];
    pausedTotalRef.current = 0;
    setActivations(0);
    setStageIndex(0);
    setPlayPhase("tutorial");
    setPaused(false);
    runTransition(() => {
      startedAtRef.current = Date.now();
      setScreen("playing");
      setGreeting(TUTORIAL_GREETING);
    });
  }, [runTransition]);

  const handlePlayAgain = useCallback(() => {
    setAttempt((a) => a + 1);
    beginRun();
  }, [beginRun]);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      if (p) pausedTotalRef.current += Date.now() - pauseStartRef.current;
      else pauseStartRef.current = Date.now();
      return !p;
    });
  }, []);

  // The route line advances for scored genuine relay activations.
  const handleActivation = useCallback((scored: boolean) => {
    if (scored) setActivations((n) => n + 1);
  }, []);

  const handleGreetingDone = useCallback(() => setGreeting(null), []);

  const handleTutorialActivation = useCallback(() => handleActivation(false), [handleActivation]);
  const handleTutorialDone = useCallback(() => {
    setPlayPhase("stages");
    setGreeting(HOW_TO_PLAY_GREETING);
  }, []);

  const handleStageFinished = useCallback(
    (result: StageResult) => {
      resultsRef.current = [...resultsRef.current, result];
      const next = stageIndex + 1;
      if (next >= stages.length) {
        const duration = Date.now() - startedAtRef.current - pausedTotalRef.current;
        setOutcome(computeGameOutcome(ageBand, resultsRef.current, duration, completesDay(2, "signal-watch")));
        runTransition(() => setScreen("complete"), "Relay route restored!");
        return;
      }
      // No stop between stages — the scene keeps running and the next
      // stage announces itself with a banner. Leaving How to Play, Fumi
      // first announces the real game (the next stage waits for her).
      if (result.isPractice) setGreeting(REAL_GAME_GREETING);
      setStageIndex(next);
    },
    [ageBand, stageIndex, stages.length, runTransition]
  );

  const handleExit = useCallback(() => {
    setPaused(false);
    onExit();
  }, [onExit]);

  let content: React.ReactNode = null;
  if (screen === "start") {
    // Play goes straight into the in-game tutorial (no separate how-to page).
    content = <StartScreen activity={activity} onPlay={beginRun} />;
  } else if (screen === "playing" && stage) {
    content = (
      <>
        <LivingScene activity={activity} />
        {greeting && <FumiGuide key={greeting} speech={greeting} onDone={handleGreetingDone} />}
        {playPhase === "tutorial" ? (
          <TutorialRunner key={`tut-${attempt}`} paused={paused} greeting={greeting !== null} onActivation={handleTutorialActivation} onDone={handleTutorialDone} />
        ) : (
          // The How to Play round starts only after Fumi's line has finished.
          greeting === null && <StageRunner key={`${attempt}-${stage.stageIndex}`} stage={stage} paused={paused} onActivation={handleActivation} onFinished={handleStageFinished} />
        )}
        <SignalHud
          label={playPhase === "tutorial" ? "Tutorial" : stage.label}
          isPractice={playPhase === "tutorial" || stage.isPractice}
          activations={activations}
          totalActivations={totalRealSignals}
          paused={paused}
          onTogglePause={togglePause}
        />
        {paused && <PauseOverlay onResume={togglePause} onExit={handleExit} />}
      </>
    );
  } else if (screen === "complete" && outcome) {
    content = <GameComplete activity={activity} outcome={outcome} onPlayAgain={handlePlayAgain} onFinish={onExit} />;
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

function TitleSign({ width }: { width: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={ASSETS.titleSign} alt="Signal Watch" style={{ width, height: "auto", display: "block", filter: "drop-shadow(0 8px 14px rgba(40,20,0,0.35))" }} />
  );
}

// ---------------------------------------------------------------------------
// Start screen
// ---------------------------------------------------------------------------

function StartScreen({ activity, onPlay }: { activity: "normal" | "high"; onPlay: () => void }) {
  return (
    <>
      <LivingScene activity={activity} />
      <div style={{ position: "absolute", top: SAFE_AREA_TOP + 18, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ animation: "bubble-pop 500ms var(--ease-pop) both" }}>
          <TitleSign width={350} />
        </div>
        <div style={parchmentStyle}>{START_CARD_TEXT}</div>
      </div>
      <button type="button" className="tap-scale" onClick={onPlay} style={{ ...playButtonStyle, position: "absolute", bottom: 46, left: "50%", marginLeft: -110, width: 220 }}>
        Play
      </button>
    </>
  );
}


// ---------------------------------------------------------------------------
// Shared playing-field pieces
// ---------------------------------------------------------------------------

type Feedback = { id: number; tower: number; kind: "hit" | "mist" };

function useFeedback() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const idRef = useRef(0);
  const push = useCallback((tower: number, kind: Feedback["kind"]) => {
    idRef.current += 1;
    const id = idRef.current;
    setFeedbacks((f) => [...f, { id, tower, kind }]);
    setTimeout(() => setFeedbacks((f) => f.filter((x) => x.id !== id)), kind === "hit" ? 1000 : 600);
  }, []);
  return { feedbacks, push };
}

function TowerButtons({ onTap }: { onTap: (towerId: number) => void }) {
  return (
    <>
      {TOWERS.map((tower) => (
        <button
          key={tower.id}
          type="button"
          aria-label={tower.name}
          onPointerDown={(ev) => {
            ev.preventDefault();
            onTap(tower.id);
          }}
          style={{
            position: "absolute",
            left: tower.hit.x,
            top: tower.hit.y,
            width: tower.hit.width,
            height: tower.hit.height,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            touchAction: "manipulation",
            zIndex: 10,
          }}
        />
      ))}
    </>
  );
}

// Hits: a relay beam to the next tower plus a small check. False alarms: a
// soft mist puff only.
function FeedbackLayer({ feedbacks }: { feedbacks: Feedback[] }) {
  return (
    <>
      <svg width={PLAY_AREA.width} height={PLAY_AREA.height} viewBox={`0 0 ${PLAY_AREA.width} ${PLAY_AREA.height}`} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 6 }} aria-hidden>
        {feedbacks
          .filter((f) => f.kind === "hit")
          .map((f) => (
            <RelayBeam key={f.id} id={`beam-${f.id}`} from={TOWERS[f.tower]} to={TOWERS[(f.tower + 1) % TOWERS.length]} />
          ))}
      </svg>
      {feedbacks.map((f) =>
        f.kind === "mist" ? (
          <div key={f.id}>
            <MistPuff tower={TOWERS[f.tower]} />
            <div aria-hidden style={{ position: "absolute", left: TOWERS[f.tower].gem.x - 17, top: TOWERS[f.tower].gem.y - 100, pointerEvents: "none", zIndex: 12, animation: "float-up-fade 1000ms ease-out both" }}>
              <div style={wrongBadgeStyle}>✕</div>
            </div>
          </div>
        ) : (
          <div key={f.id} aria-hidden style={{ position: "absolute", left: TOWERS[f.tower].gem.x - 17, top: TOWERS[f.tower].gem.y - 100, pointerEvents: "none", zIndex: 12, animation: "float-up-fade 1000ms ease-out both" }}>
            <div style={hitBadgeStyle}>✓</div>
          </div>
        )
      )}
    </>
  );
}

function Caption({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div style={captionRowStyle}>
      <div key={text} role="status" style={{ ...captionStyle, animation: "bubble-pop 220ms var(--ease-pop) both" }}>
        {text}
      </div>
    </div>
  );
}

function EffectsLayer({ children }: { children: React.ReactNode }) {
  return (
    <svg width={PLAY_AREA.width} height={PLAY_AREA.height} viewBox={`0 0 ${PLAY_AREA.width} ${PLAY_AREA.height}`} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5 }} aria-hidden>
      {children}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Tutorial — Fumi labels a ripple, a single flash and the real signal
// ---------------------------------------------------------------------------

function TutorialRunner({ paused, greeting, onActivation, onDone }: { paused: boolean; greeting: boolean; onActivation: () => void; onDone: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [showing, setShowing] = useState(false); // false = short quiet gap before each step
  const [finished, setFinished] = useState(false);
  const { feedbacks, push } = useFeedback();
  const step = TUTORIAL_STEPS[stepIndex];

  useEffect(() => {
    // Hold the first step until Fumi's greeting bubble has gone.
    if (paused || greeting) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    if (finished) t = setTimeout(onDone, 1800);
    else if (!showing) t = setTimeout(() => setShowing(true), stepIndex === 0 ? 900 : 600);
    else if (!step.waitForTap) {
      t = setTimeout(() => {
        setShowing(false);
        setStepIndex((i) => i + 1);
      }, TUTORIAL_DEMO_MS);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [paused, greeting, finished, showing, step, stepIndex, onDone]);

  const handleTap = (towerId: number) => {
    if (paused || finished || !showing || !step.waitForTap || towerId !== step.tower) return;
    push(towerId, "hit");
    onActivation();
    setShowing(false);
    setFinished(true);
  };

  const tower = TOWERS[step.tower];
  // While Fumi's greeting bubble is up, keep the caption strip clear.
  const caption = greeting ? null : finished ? "Great catch! That's the real signal." : showing ? step.caption : "Watch the towers…";

  return (
    <>
      <EffectsLayer>{showing && !finished && <SignalEffect key={stepIndex} tower={tower} type={step.type} loop={step.waitForTap} idPrefix={`tut-${stepIndex}`} />}</EffectsLayer>
      <TowerButtons onTap={handleTap} />
      <FeedbackLayer feedbacks={feedbacks} />
      {showing && !finished && (
        <div
          key={`label-${stepIndex}`}
          style={{
            position: "absolute",
            left: tower.gem.x - 60,
            width: 120,
            top: tower.gem.y - 98,
            display: "flex",
            justifyContent: "center",
            zIndex: 14,
            pointerEvents: "none",
            animation: "bubble-pop 260ms var(--ease-pop) both",
          }}
        >
          <div style={step.waitForTap ? tutorialTapLabelStyle : tutorialIgnoreLabelStyle}>{step.label}</div>
        </div>
      )}
      <Caption text={caption} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Practice / scored block — continuous watching
// ---------------------------------------------------------------------------

type StageRunnerProps = {
  stage: StagePlan;
  paused: boolean;
  onActivation: (scored: boolean) => void;
  onFinished: (result: StageResult) => void;
};

const BANNER_MS = 2000;

// Keyed per stage by the parent, so all per-stage state resets by remount.
function StageRunner({ stage, paused, onActivation, onFinished }: StageRunnerProps) {
  const [activeKey, setActiveKey] = useState("");
  const [missHint, setMissHint] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const { feedbacks, push } = useFeedback();

  const elapsedRef = useRef(0);
  const activeKeyRef = useRef("");
  const bannerDoneRef = useRef(false);
  const resolvePtrRef = useRef(0); // events before this index have had their response window closed
  const resolvedRef = useRef<Map<string, SignalResult>>(new Map());
  const strayRef = useRef<StrayTap[]>([]);
  const finishedRef = useRef(false);

  // One rAF clock that only advances while unpaused: tracks which events are
  // showing and closes each event's response window (recording misses and
  // correct rejections) once its grace period has passed. Misses never stop
  // the scene.
  useEffect(() => {
    if (paused) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsedRef.current += now - last;
      last = now;
      const t = elapsedRef.current;
      const events = stage.events;

      if (t > BANNER_MS && !bannerDoneRef.current) {
        bannerDoneRef.current = true;
        setShowBanner(false);
      }

      const key = events
        .filter((e) => t >= e.startMs && t < e.startMs + e.durationMs)
        .map((e) => e.eventId)
        .join("|");
      if (key !== activeKeyRef.current) {
        activeKeyRef.current = key;
        setActiveKey(key);
      }

      // Events are sorted by start and share one duration, so they close in order.
      while (resolvePtrRef.current < events.length) {
        const e = events[resolvePtrRef.current];
        if (t < e.startMs + e.durationMs + RESPONSE_GRACE_MS) break;
        if (!resolvedRef.current.has(e.eventId)) {
          const isTarget = e.type === "three-rings";
          resolvedRef.current.set(e.eventId, {
            eventId: e.eventId,
            stageIndex: e.stageIndex,
            isPractice: e.isPractice,
            tower: e.tower,
            type: e.type,
            durationMs: e.durationMs,
            outcome: isTarget ? "miss" : "correct-rejection",
            reactionMs: null,
          });
          if (isTarget && e.isPractice) {
            setMissHint(true);
            setTimeout(() => setMissHint(false), 1600);
          }
        }
        resolvePtrRef.current += 1;
      }

      if (t >= stage.totalMs && !finishedRef.current) {
        finishedRef.current = true;
        const signals = stage.events.map((e) => resolvedRef.current.get(e.eventId)).filter((r): r is SignalResult => r !== undefined);
        onFinished({ stageIndex: stage.stageIndex, isPractice: stage.isPractice, blockNumber: stage.blockNumber, signals, strayTaps: strayRef.current });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, stage, onFinished]);

  const handleTap = (towerId: number) => {
    if (paused || finishedRef.current) return;
    const t = elapsedRef.current;
    const e = eventOnTower(stage.events, towerId, t, RESPONSE_GRACE_MS);

    if (e) {
      if (resolvedRef.current.has(e.eventId)) return; // already answered
      const isTarget = e.type === "three-rings";
      resolvedRef.current.set(e.eventId, {
        eventId: e.eventId,
        stageIndex: e.stageIndex,
        isPractice: e.isPractice,
        tower: e.tower,
        type: e.type,
        durationMs: e.durationMs,
        outcome: isTarget ? "hit" : "false-alarm",
        reactionMs: Math.round(t - e.startMs),
      });
      if (isTarget) {
        push(towerId, "hit");
        onActivation(!stage.isPractice);
      } else {
        push(towerId, "mist");
      }
      return;
    }

    strayRef.current = [
      ...strayRef.current,
      { stageIndex: stage.stageIndex, isPractice: stage.isPractice, tower: towerId, atMs: Math.round(t), kind: liveTarget(stage.events, t, RESPONSE_GRACE_MS) ? "wrong-tower" : "no-signal" },
    ];
    push(towerId, "mist");
  };

  const active = activeKey ? activeKey.split("|").map((id) => stage.events.find((e) => e.eventId === id)!) : [];

  let caption: string | null = null;
  if (stage.isPractice) {
    // How to Play captions: practice coaching.
    if (missHint) caption = "Practice tip: that was three rings — tap it next time!";
    else if (active.some((e) => e.type === "three-rings")) caption = "Practice: three rings! Tap that tower!";
    else if (active.length > 0) caption = "Practice: not three rings — don't tap it.";
    else caption = "Practice round — watch all three towers…";
  }

  return (
    <>
      <EffectsLayer>
        {active.map((e) => (
          <SignalEffect key={e.eventId} tower={TOWERS[e.tower]} type={e.type} idPrefix={e.eventId} />
        ))}
      </EffectsLayer>
      <TowerButtons onTap={handleTap} />
      <FeedbackLayer feedbacks={feedbacks} />
      {showBanner && (
        <div style={bannerRowStyle}>
          <div style={bannerStyle}>{stage.banner}</div>
        </div>
      )}
      <Caption text={showBanner ? null : caption} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Pause + completion
// ---------------------------------------------------------------------------

function PauseOverlay({ onResume, onExit }: { onResume: () => void; onExit: () => void }) {
  return (
    <div style={pauseScrimStyle}>
      <div style={pauseCardStyle}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Paused</div>
        <button type="button" className="tap-scale" onClick={onResume} style={{ ...playButtonStyle, fontSize: 18, minHeight: 50 }}>
          Resume
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

function GameComplete({ activity, outcome, onPlayAgain, onFinish }: { activity: "normal" | "high"; outcome: GameOutcome; onPlayAgain: () => void; onFinish: () => void }) {
  const { metrics: m, rewards } = outcome;
  const [chosen, setChosen] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  const claim = () => {
    reportGame({ ...outcome, accessoryChosen: chosen });
    setClaimed(true);
  };

  return (
    <>
      <LivingScene activity={activity} dim={0.72} />
      <div style={completeStyle}>
        <TitleSign width={220} />
        <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>Relay Route Restored!</div>

        <div style={{ display: "flex", gap: 6 }} aria-label={`${outcome.starsEarned} of 3 stars`}>
          {[1, 2, 3].map((s) => (
            <span key={s} style={{ fontSize: 24, opacity: s <= outcome.starsEarned ? 1 : 0.25, animation: `star-pop 420ms ease-out ${s * 0.12}s both` }}>
              ⭐
            </span>
          ))}
        </div>

        <div style={statsCardStyle}>
          <Stat label="Signals Caught" value={`${m.realSignalsDetected}/${m.totalRealSignals}`} />
          <Stat label="Detection" value={`${m.detectionAccuracyPct}%`} />
          <Stat label="Decoys Ignored" value={`${m.distractorRejectionAccuracyPct}%`} />
          <Stat label="Avg Response" value={m.avgResponseMs === null ? "—" : `${(m.avgResponseMs / 1000).toFixed(2)}s`} />
          <Stat label="Missed" value={`${m.realSignalsMissed}`} />
          <Stat label="Time" value={formatDuration(m.gameplayDurationMs)} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", ...rewardCardStyle }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.riverStone} alt="" style={{ width: 52, height: "auto", filter: "drop-shadow(0 0 10px rgba(80,190,255,0.8))", animation: "float-y 2.6s ease-in-out infinite" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#bfe8ff" }}>{rewards.collectible} collected!</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <RewardPill icon="✨" label={`+${rewards.xp} XP`} />
              <RewardPill icon="🪙" label={`+${rewards.coins}`} />
              {rewards.badge && <RewardPill icon="🏅" label={rewards.badge} highlight />}
              {rewards.day2BonusXp > 0 && <RewardPill icon="🌟" label={`+${rewards.day2BonusXp} XP Day 2 bonus`} highlight />}
            </div>
          </div>
        </div>

        <div style={{ width: "100%" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#dbe7ff", textAlign: "center", marginBottom: 6 }}>{claimed ? "Accessory unlocked!" : "Choose 1 accessory"}</div>
          <div role="radiogroup" aria-label="Choose an accessory" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {REWARDS.accessoryChoices.map((name) => {
              const on = chosen === name;
              return (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className="tap-scale"
                  onClick={() => !claimed && setChosen(name)}
                  disabled={claimed && !on}
                  style={{
                    minHeight: 42,
                    borderRadius: 10,
                    border: on ? "2px solid #7fd34e" : "1px solid rgba(190,215,255,0.3)",
                    background: on ? "rgba(76,195,90,0.25)" : "rgba(16,30,56,0.75)",
                    color: "#fff",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: claimed ? "default" : "pointer",
                    opacity: claimed && !on ? 0.35 : 1,
                    padding: "4px 6px",
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
            <button type="button" className="tap-scale" onClick={onFinish} style={{ ...playButtonStyle, flex: 1, fontSize: 18, minHeight: 50 }}>
              Finish
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="tap-scale"
            onClick={claim}
            disabled={chosen === null}
            style={{ ...playButtonStyle, width: "100%", fontSize: 18, minHeight: 50, opacity: chosen === null ? 0.45 : 1 }}
          >
            Claim Rewards
          </button>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{value}</div>
      <div style={{ fontSize: 10, color: "#bcd0f5" }}>{label}</div>
    </div>
  );
}

function RewardPill({ icon, label, highlight }: { icon: string; label: string; highlight?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        background: highlight ? "rgba(240,166,60,0.25)" : "rgba(16,30,56,0.78)",
        border: highlight ? "1px solid rgba(255,200,90,0.8)" : "1px solid rgba(190,215,255,0.3)",
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 700,
        color: "#fff",
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
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
  background: "#0b1830",
  fontFamily: "var(--font-body), system-ui",
  userSelect: "none",
  WebkitUserSelect: "none",
};

const veilStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 200,
  background: "#0b1830",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "opacity 380ms ease",
};

const veilMessageStyle: React.CSSProperties = {
  fontFamily: "var(--font-display), var(--font-body), system-ui",
  fontSize: 20,
  fontWeight: 800,
  color: "#fff",
  textAlign: "center",
  padding: "0 24px",
  animation: "bubble-pop 260ms var(--ease-pop) both",
};

// The design's parchment instruction card.
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

// The design's glossy green "Play" button.
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
  transition: "opacity 300ms ease",
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 50,
  border: "2px solid rgba(255,255,255,0.75)",
  borderRadius: 999,
  background: "rgba(16,30,56,0.6)",
  color: "#ffffff",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
};

// The design's navy caption boxes.
const captionStyle: React.CSSProperties = {
  background: "rgba(16,30,56,0.85)",
  border: "1px solid rgba(190,215,255,0.3)",
  borderRadius: 10,
  padding: "8px 14px",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.4,
  textAlign: "center",
  boxShadow: "0 6px 16px rgba(10,20,40,0.35)",
};

const captionRowStyle: React.CSSProperties = {
  position: "absolute",
  top: SAFE_AREA_TOP + HUD_HEIGHT + 10,
  left: 20,
  right: 20,
  display: "flex",
  justifyContent: "center",
  pointerEvents: "none",
  zIndex: 20,
};

const bannerRowStyle: React.CSSProperties = { ...captionRowStyle, top: SAFE_AREA_TOP + HUD_HEIGHT + 40 };

const bannerStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #fbf1d9 0%, #f1dfb8 100%)",
  border: "2px solid #c9a265",
  borderRadius: 12,
  padding: "10px 20px",
  color: "#3b2a14",
  fontFamily: "var(--font-display), var(--font-body), system-ui",
  fontSize: 17,
  fontWeight: 800,
  boxShadow: "0 8px 18px rgba(60,35,10,0.35)",
  animation: `sw-banner ${BANNER_MS}ms ease-out both`,
};

const tutorialLabelBase: React.CSSProperties = {
  borderRadius: 999,
  padding: "5px 12px",
  fontSize: 13,
  fontWeight: 900,
  whiteSpace: "nowrap",
  border: "2px solid #fff",
  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
  color: "#fff",
};
const tutorialIgnoreLabelStyle: React.CSSProperties = { ...tutorialLabelBase, background: "#e84a4a" };
const tutorialTapLabelStyle: React.CSSProperties = { ...tutorialLabelBase, background: "#3fb34f", animation: "glow-pulse 1s ease-in-out infinite" };

const hitBadgeStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontSize: 20,
  fontWeight: 900,
  border: "3px solid #fff",
  background: "#3fb34f",
  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
};

// Wrong tap: the same badge in red with a cross.
const wrongBadgeStyle: React.CSSProperties = { ...hitBadgeStyle, background: "#e84a4a" };

const pauseScrimStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(6,12,28,0.88)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 40,
};

const pauseCardStyle: React.CSSProperties = {
  width: 260,
  background: "rgba(16,30,56,0.96)",
  border: "1px solid rgba(190,215,255,0.3)",
  borderRadius: 20,
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 14,
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
  padding: "48px 20px 26px",
  gap: 9,
};

const statsCardStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(16,30,56,0.8)",
  border: "1px solid rgba(190,215,255,0.3)",
  borderRadius: 14,
  padding: "11px 10px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  rowGap: 9,
};

const rewardCardStyle: React.CSSProperties = {
  background: "rgba(16,30,56,0.8)",
  border: "1px solid rgba(120,200,255,0.45)",
  borderRadius: 14,
  padding: "8px 12px",
};
