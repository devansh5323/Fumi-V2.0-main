"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DistractorKind, GameOutcome, TrialPlan, TrialResult, AgeBand } from "./types";
import {
  AGE_BAND_CONFIG,
  CHILD_RULE_TEXT,
  CONSECUTIVE_ERROR_REMINDER_THRESHOLD,
  EXIT_BUTTON_ZONE,
  FEEDBACK_TOAST_ZONE,
  GAME_TIME_LIMIT_MS,
  HUD_ZONE,
  NARRATION_TEXT,
  PLAY_AREA,
  REFERENCE_BADGE_PINNED_ZONE,
  SAFE_AREA_TOP,
  TIMING,
  TOTAL_TRIALS,
} from "./config";
import { buildAllTrials } from "./engine/sessionPlanner";
import { layoutTiles, pickCueSector } from "./engine/scatterLayout";
import { computeGameOutcome } from "./engine/metrics";
import { createRng } from "./engine/rng";
import { SYMBOL_LIBRARY } from "./engine/symbolLibrary";
import { ReferenceBadge } from "./components/ReferenceBadge";
import { SearchField } from "./components/SearchField";
import { FireflyCue } from "./components/FireflyCue";
import { FumiCompanion } from "./components/FumiCompanion";
import { ForestPath } from "./components/ForestPath";
import type { HexTileVisualState } from "./components/HexTile";
import { Typewriter } from "../../components/Typewriter";
import { Ambient } from "../../components/Ambient";
import { reportGame } from "./lib/sessionReporter";

// One continuous game: region-intro (narration) -> playing (all TOTAL_TRIALS
// trials back-to-back) -> complete. No map, no level/mission selection, and
// no separate brief or tutorial screen — "complete" occurs exactly once per
// playthrough.
type GameScreen = "region-intro" | "playing" | "complete";
type TrialPhase = "preview" | "shrink" | "cue" | "search" | "trial-feedback" | "transition";

const RESERVED_ZONES = [EXIT_BUTTON_ZONE, REFERENCE_BADGE_PINNED_ZONE, HUD_ZONE, FEEDBACK_TOAST_ZONE];

function generateSeed(): string {
  return `pf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type PathfinderSweepGameProps = {
  ageBand: AgeBand;
  seed?: string;
  onExit: () => void;
};

const sceneWrapperStyle: React.CSSProperties = {
  position: "relative",
  width: PLAY_AREA.width,
  height: PLAY_AREA.height,
  overflow: "hidden",
  background: "var(--color-midnight)",
  fontFamily: "var(--font-body), system-ui",
};

// Sits above every screen (higher than the top bar) so any hard content
// swap — screen change or demo→real handoff — dips through this instead of
// cutting instantly.
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

export function PathfinderSweepGame({ ageBand, seed, onExit }: PathfinderSweepGameProps) {
  // Lazy useState initializer, not useMemo — the documented React escape hatch
  // for a one-time impure computation (Date.now/Math.random) during render;
  // useMemo's cache is an optimization, not a correctness guarantee.
  const [sessionSeed] = useState(() => seed ?? generateSeed());
  const ageCfg = AGE_BAND_CONFIG[ageBand];

  const [screen, setScreen] = useState<GameScreen>("region-intro");
  const [narrationDone, setNarrationDone] = useState(false);

  const [attempt, setAttempt] = useState(0);
  const [trialIndex, setTrialIndex] = useState(0);
  const [msRemaining, setMsRemaining] = useState(GAME_TIME_LIMIT_MS);
  const [gemsCollected, setGemsCollected] = useState(0);
  const [lastOutcome, setLastOutcome] = useState<GameOutcome | null>(null);
  const [lastTrialPhase, setLastTrialPhase] = useState<TrialPhase>("preview");
  const [paused, setPaused] = useState(false);

  const [veil, setVeil] = useState<{ opacity: number; message: string | null }>({ opacity: 0, message: null });

  const trials = useMemo(() => buildAllTrials(ageBand, `${sessionSeed}-a${attempt}`), [ageBand, attempt, sessionSeed]);

  const startedAtRef = useRef<number>(0);
  const resultsRef = useRef<TrialResult[]>([]);

  const currentTrial = trials[trialIndex];

  // Masks a hard content swap (screen change, or demo→real trial handoff)
  // behind a brief fade-to-dark instead of an instant cut — dip out, swap
  // the content while fully covered, optionally hold on a short label so
  // the mode change reads as intentional, then dip back in.
  const runTransition = useCallback((action: () => void, message: string | null = null) => {
    setVeil({ opacity: 1, message });
    const holdMs = message ? 550 : 120;
    setTimeout(() => {
      action();
      setTimeout(() => setVeil({ opacity: 0, message: null }), holdMs);
    }, 380);
  }, []);

  const resetRunState = useCallback(() => {
    resultsRef.current = [];
    setMsRemaining(GAME_TIME_LIMIT_MS);
    setGemsCollected(0);
    setTrialIndex(0);
    startedAtRef.current = Date.now();
  }, []);

  const handleStartAdventure = useCallback(() => {
    resetRunState();
    runTransition(() => setScreen("playing"));
  }, [resetRunState, runTransition]);

  const handleTrialResult = useCallback((result: TrialResult) => {
    resultsRef.current = [...resultsRef.current, result];
    setGemsCollected((g) => g + 1);
  }, []);

  const finishGame = useCallback(
    (timedOut: boolean) => {
      const endedAt = Date.now();
      const outcome = computeGameOutcome(resultsRef.current, timedOut, startedAtRef.current, endedAt);
      reportGame(outcome);
      setLastOutcome(outcome);
      setScreen("complete");
    },
    []
  );

  const handleTrialFinished = useCallback(() => {
    const next = trialIndex + 1;
    if (next >= trials.length) {
      finishGame(false);
    } else {
      setTrialIndex(next);
    }
  }, [trialIndex, trials.length, finishGame]);

  // Ticks the 3-minute game clock once real play begins — paused while the
  // pause overlay is up, or on any non-"playing" screen. A separate effect
  // below reacts once it reaches zero.
  useEffect(() => {
    if (screen !== "playing" || paused) return;
    const interval = setInterval(() => {
      setMsRemaining((ms) => Math.max(0, ms - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [screen, paused]);

  // Reacting to the clock hitting zero (rather than inlining this in the
  // interval's updater above) keeps the updater pure and defers the
  // finishGame side effect to a setTimeout, consistent with this project's
  // "no setState directly in an effect body" convention.
  useEffect(() => {
    if (screen === "playing" && msRemaining === 0) {
      const t = setTimeout(() => finishGame(true), 0);
      return () => clearTimeout(t);
    }
  }, [msRemaining, screen, finishGame]);

  const handleExitGame = useCallback(() => {
    setPaused(false);
    onExit();
  }, [onExit]);

  const handlePlayAgain = useCallback(() => {
    setAttempt((a) => a + 1);
    resetRunState();
    runTransition(() => setScreen("playing"));
  }, [resetRunState, runTransition]);

  let screenContent: React.ReactNode = null;

  if (screen === "region-intro") {
    screenContent = (
      <RegionIntro narrationDone={narrationDone} onNarrationDone={() => setNarrationDone(true)} onStart={handleStartAdventure} />
    );
  } else if (screen === "complete" && lastOutcome) {
    screenContent = <GameComplete outcome={lastOutcome} onPlayAgain={handlePlayAgain} onFinish={onExit} />;
  } else if (screen === "playing" && currentTrial) {
    screenContent = (
      <>
        <TrialRunner
          key={currentTrial.trialIndex}
          trial={currentTrial}
          previewMs={ageCfg.previewMs}
          eccentricityBias={ageCfg.targetEccentricityBias}
          sessionSeed={sessionSeed}
          paused={paused}
          onResult={handleTrialResult}
          onFinished={handleTrialFinished}
          onPhaseChange={setLastTrialPhase}
        />

        <MissionHud
          msRemaining={msRemaining}
          gemsCollected={gemsCollected}
          totalGems={TOTAL_TRIALS}
          justAdvanced={lastTrialPhase === "trial-feedback"}
          paused={paused}
          onTogglePause={() => setPaused((p) => !p)}
        />

        {paused && <PauseOverlay onResume={() => setPaused(false)} onExit={handleExitGame} />}
      </>
    );
  }

  return (
    <div style={sceneWrapperStyle}>
      {screenContent}
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

type RegionIntroProps = {
  narrationDone: boolean;
  onNarrationDone: () => void;
  onStart: () => void;
};

function RegionIntro({ narrationDone, onNarrationDone, onStart }: RegionIntroProps) {
  return (
    <>
      <div style={forestBackdropStyle}>
        <ForestPath />
      </div>

      <div aria-hidden style={topVignetteStyle} />

      <div style={gameTitleWrapStyle}>
        <div aria-hidden style={titleOrnamentStyle}>
          <span style={titleOrnamentLineStyle} />
          <span style={{ fontSize: 11 }}>✦</span>
          <span style={titleOrnamentLineStyle} />
        </div>
        <div style={titleHighlightStyle}>
          <div style={gameTitleStyle}>Pathfinder Sweep</div>
        </div>
      </div>

      <div style={narrationGroupStyle}>
        <div style={narrationBubbleStyle}>
          <Typewriter text={NARRATION_TEXT} onDone={onNarrationDone} speedMultiplier={0.9} />
          <div style={narrationBubbleTailStyle} />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/games/pathfinder-sweep/mascot/fumi.png" alt="Fumi" style={mascotImageStyle} />
      </div>

      <button
        type="button"
        className="tap-scale"
        onClick={onStart}
        disabled={!narrationDone}
        style={{ ...continueButtonStyle, opacity: narrationDone ? 1 : 0, pointerEvents: narrationDone ? "auto" : "none" }}
      >
        Start the Adventure →
      </button>
    </>
  );
}

type MissionHudProps = {
  msRemaining: number;
  gemsCollected: number;
  totalGems: number;
  justAdvanced: boolean;
  paused: boolean;
  onTogglePause: () => void;
};

function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Left-clustered (pause, timer, gems) rather than spread across the full
// bar — the top-right corner must stay clear for the ReferenceBadge, which
// is pinned there independently (see PINNED_LEFT in ReferenceBadge.tsx) and
// would otherwise visually collide with a right-aligned gem/pause group.
// Exiting goes through the pause menu (PauseOverlay's "Exit"), so there's
// no separate back button competing for space here.
function MissionHud({ msRemaining, gemsCollected, totalGems, justAdvanced, paused, onTogglePause }: MissionHudProps) {
  const isLowTime = msRemaining <= 30_000;
  return (
    <div style={hudBarStyle}>
      <button
        type="button"
        className="tap-scale"
        onClick={onTogglePause}
        aria-label={paused ? "Resume" : "Pause"}
        style={exitButtonStyle}
      >
        {paused ? "▶" : "⏸"}
      </button>

      <div
        style={{ ...timerPillStyle, color: isLowTime ? "#FF9D9D" : "var(--color-soft)", animation: isLowTime ? "glow-pulse 1s ease-in-out infinite" : undefined }}
        aria-label={`${formatClock(msRemaining)} remaining`}
      >
        ⏱ {formatClock(msRemaining)}
      </div>

      <div style={{ ...gemPillStyle, animation: justAdvanced ? "glow-pulse 500ms ease-out" : undefined }}>
        💎 {gemsCollected}/{totalGems}
      </div>
    </div>
  );
}

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

type GameCompleteProps = {
  outcome: GameOutcome;
  onPlayAgain: () => void;
  onFinish: () => void;
};

const CONFETTI = [
  { left: "10%", color: "#F0A63C", delay: 0 },
  { left: "22%", color: "#9B5CFF", delay: 0.15 },
  { left: "38%", color: "#F6F5FF", delay: 0.3 },
  { left: "52%", color: "#F0A63C", delay: 0.05 },
  { left: "66%", color: "#9B5CFF", delay: 0.4 },
  { left: "80%", color: "#F6F5FF", delay: 0.2 },
  { left: "92%", color: "#F0A63C", delay: 0.35 },
];

// Shown once, at the very end of the single continuous game — not a
// per-level recap. onPlayAgain restarts the whole game from trial 1;
// onFinish leaves back to the landing page.
function GameComplete({ outcome, onPlayAgain, onFinish }: GameCompleteProps) {
  const seconds = Math.round(outcome.timeTakenMs / 1000);
  const timeLabel = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const coins = 10 * outcome.starsEarned;

  return (
    <div style={missionCompleteStyle}>
      <Ambient tint="violet" />
      <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {CONFETTI.map((c, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: -20,
              left: c.left,
              width: 8,
              height: 8,
              borderRadius: 2,
              background: c.color,
              animation: `confetti-fall 1600ms ease-in ${c.delay}s both`,
            }}
          />
        ))}
      </div>

      <FumiCompanion mood={outcome.timedOut ? "thinking" : "happy"} size={96} tailWag={!outcome.timedOut} />
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-soft)" }}>{outcome.timedOut ? "Time's Up!" : "Quest Complete!"}</div>

      <div style={{ display: "flex", gap: 6 }} aria-label={`${outcome.starsEarned} of 3 stars`}>
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            style={{ fontSize: 30, opacity: s <= outcome.starsEarned ? 1 : 0.25, animation: `star-pop 420ms ease-out ${s * 0.12}s both` }}
          >
            ⭐
          </span>
        ))}
      </div>

      <div style={statsCardStyle}>
        <SummaryStat label="Time Taken" value={timeLabel} />
        <SummaryStat label="Tiles Scanned" value={`${outcome.tilesScanned}`} />
        <SummaryStat label="Correct Matches" value={`${outcome.correctMatches}/${TOTAL_TRIALS}`} />
      </div>

      <div style={rewardsRowStyle}>
        <RewardPill icon="🪙" label={`+${coins}`} />
        <RewardPill icon="🍃" label="Leaf" />
        <RewardPill icon="💜" label="Power" />
      </div>

      <div style={{ display: "flex", gap: 10, width: "100%" }}>
        <button type="button" className="tap-scale" onClick={onPlayAgain} style={{ ...secondaryButtonStyle, flex: 1 }}>
          Play Again
        </button>
        <button type="button" className="tap-scale" onClick={onFinish} style={{ ...primaryButtonStyle, flex: 1 }}>
          Finish
        </button>
      </div>
    </div>
  );
}

function RewardPill({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={rewardPillStyle}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-soft)" }}>{value}</div>
      <div style={{ fontSize: 10.5, color: "var(--color-lavender)", opacity: 0.8 }}>{label}</div>
    </div>
  );
}

type TrialRunnerProps = {
  trial: TrialPlan;
  previewMs: number;
  eccentricityBias: number;
  sessionSeed: string;
  paused: boolean;
  onResult: (result: TrialResult) => void;
  onFinished: () => void;
  onPhaseChange: (phase: TrialPhase) => void;
};

// One instance per trial (parent keys this by trialIndex), so all per-trial
// state resets for free via remount instead of an effect that watches for a
// changing id and re-derives state.
function TrialRunner({ trial, previewMs, eccentricityBias, sessionSeed, paused, onResult, onFinished, onPhaseChange }: TrialRunnerProps) {
  const targetTile = trial.tiles.find((t) => t.isTarget)!;

  const positions = useMemo(
    () =>
      layoutTiles(
        trial.tiles.map((t) => t.tileId),
        targetTile.tileId,
        PLAY_AREA,
        RESERVED_ZONES,
        `${sessionSeed}-layout-t${trial.trialIndex}`,
        eccentricityBias
      ),
    [trial, targetTile.tileId, sessionSeed, eccentricityBias]
  );

  const cueRegion = useMemo(
    () => pickCueSector(trial.cueType, positions, targetTile.tileId, createRng(`${sessionSeed}-cue-t${trial.trialIndex}`)),
    [trial.cueType, positions, targetTile.tileId, sessionSeed, trial.trialIndex]
  );

  const [trialPhase, setTrialPhaseState] = useState<TrialPhase>("preview");
  const [visualStates, setVisualStates] = useState<Record<string, HexTileVisualState>>(() =>
    Object.fromEntries(trial.tiles.map((t) => [t.tileId, "idle" as HexTileVisualState]))
  );
  const [showRuleReminder, setShowRuleReminder] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; tone: "positive" | "negative" } | null>(null);

  const searchShownAtRef = useRef<number>(0);
  const incorrectTapsRef = useRef(0);
  const incorrectKindsRef = useRef<DistractorKind[]>([]);
  const consecutiveWrongRef = useRef(0);

  const setTrialPhase = useCallback(
    (phase: TrialPhase) => {
      setTrialPhaseState(phase);
      onPhaseChange(phase);
    },
    [onPhaseChange]
  );

  // Paused: hold the current phase (re-armed from the start on resume) so the
  // preview/cue never plays out hidden behind the pause overlay.
  useEffect(() => {
    if (paused) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (trialPhase === "preview") {
      timer = setTimeout(() => setTrialPhase("shrink"), previewMs);
    } else if (trialPhase === "shrink") {
      timer = setTimeout(() => setTrialPhase("cue"), TIMING.shrinkMs);
    } else if (trialPhase === "cue") {
      timer = setTimeout(() => {
        searchShownAtRef.current = Date.now();
        setTrialPhase("search");
      }, TIMING.cueMs);
    } else if (trialPhase === "trial-feedback") {
      timer = setTimeout(() => setTrialPhase("transition"), TIMING.trialFeedbackMs);
    } else if (trialPhase === "transition") {
      timer = setTimeout(onFinished, TIMING.transitionMs);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [trialPhase, paused, previewMs, setTrialPhase, onFinished]);

  // Time spent paused mid-search shouldn't count toward reaction time —
  // shift the search start forward by the paused duration on resume.
  useEffect(() => {
    if (!paused || trialPhase !== "search") return;
    const pausedAt = Date.now();
    return () => {
      searchShownAtRef.current += Date.now() - pausedAt;
    };
  }, [paused, trialPhase]);

  const handleTapTile = useCallback(
    (tileId: string) => {
      if (trialPhase !== "search") return;
      const tile = trial.tiles.find((t) => t.tileId === tileId);
      if (!tile || visualStates[tileId] === "inert" || visualStates[tileId] === "correct") return;

      if (tile.isTarget) {
        const reactionTimeMs = Date.now() - searchShownAtRef.current;
        setVisualStates((prev) => ({ ...prev, [tileId]: "correct" }));
        onResult({
          trialIndex: trial.trialIndex,
          cueType: trial.cueType,
          tileCount: trial.tileCount,
          targetSymbolId: trial.targetSymbolId,
          searchFieldShownAt: searchShownAtRef.current,
          respondedAt: Date.now(),
          reactionTimeMs,
          incorrectTaps: incorrectTapsRef.current,
          incorrectTapKinds: incorrectKindsRef.current,
        });
        consecutiveWrongRef.current = 0;
        setFeedback({ text: "Trail found!", tone: "positive" });
        setTrialPhase("trial-feedback");
      } else {
        incorrectTapsRef.current += 1;
        if (tile.distractorKind) incorrectKindsRef.current = [...incorrectKindsRef.current, tile.distractorKind];
        consecutiveWrongRef.current += 1;
        setVisualStates((prev) => ({ ...prev, [tileId]: "inert" }));
        setFeedback({ text: "Decoy — keep looking.", tone: "negative" });
        if (consecutiveWrongRef.current >= CONSECUTIVE_ERROR_REMINDER_THRESHOLD) {
          setShowRuleReminder(true);
          consecutiveWrongRef.current = 0;
          setTimeout(() => setShowRuleReminder(false), 2600);
        }
      }
    },
    [trialPhase, trial, visualStates, onResult, setTrialPhase]
  );

  const tilesVisible = trialPhase === "search" || trialPhase === "trial-feedback" || trialPhase === "transition";

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: trialPhase === "transition" ? 0 : 1,
          transition: `opacity ${TIMING.transitionMs}ms ease-in-out`,
        }}
      >
        <SearchField
          tiles={tilesVisible ? trial.tiles : []}
          positions={positions}
          visualStates={visualStates}
          interactive={trialPhase === "search" && !paused}
          onTapTile={handleTapTile}
        />
      </div>

      <FireflyCue regionId={cueRegion} active={trialPhase === "cue"} />

      <ReferenceBadge symbol={SYMBOL_LIBRARY[trial.targetSymbolId]} phase={trialPhase === "preview" ? "preview" : "pinned"} />

      {feedback && trialPhase !== "preview" && trialPhase !== "shrink" && (
        <div style={feedback.tone === "positive" ? feedbackToastPositiveStyle : feedbackToastNegativeStyle}>{feedback.text}</div>
      )}

      {showRuleReminder && <div style={ruleReminderStyle}>{CHILD_RULE_TEXT}</div>}
    </>
  );
}

const forestBackdropStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "radial-gradient(circle at 50% 0%, #1c2e20 0%, #0e1a12 45%, #060c08 100%)",
};

// A soft top-down darkening rather than a hard-edged card — keeps the
// dynamic island area readable/grounded now that there's no plaque anchoring
// the top of the screen, without boxing off any of the artwork.
const topVignetteStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(180deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.3) 16%, transparent 32%)",
  pointerEvents: "none",
};

const gameTitleWrapStyle: React.CSSProperties = {
  position: "absolute",
  top: SAFE_AREA_TOP + 14,
  left: 24,
  right: 24,
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
};

// A real solid plate behind the title, not just a glow — the background
// photo swings from dark canopy to a brightly lit waterfall, and gold text
// had near-zero contrast against the bright water without something
// reliably opaque behind it. Sized to the text itself (shrink-to-fit column
// flex item), not a fixed-width guess, so it always hugs the wordmark.
const titleHighlightStyle: React.CSSProperties = {
  background: "rgba(8,5,18,0.78)",
  border: "1px solid rgba(240,166,60,0.4)",
  borderRadius: 14,
  padding: "6px 24px",
  boxShadow: "0 10px 26px rgba(0,0,0,0.55)",
};

const titleOrnamentStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#F0C572",
  filter: "drop-shadow(0 0 6px rgba(240,166,60,0.6))",
};

const titleOrnamentLineStyle: React.CSSProperties = {
  width: 28,
  height: 1,
  background: "linear-gradient(90deg, transparent, #F0C572, transparent)",
};

// A gold-foil gradient clipped to the text, plus a soft amber glow behind it
// — reads as a premium hero wordmark rather than a plain UI label, matching
// the style guide's ornate "Pathfinder Sweep" logo treatment.
const gameTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-title), cursive",
  fontSize: 42,
  fontWeight: 700,
  letterSpacing: 0.5,
  backgroundImage: "linear-gradient(180deg, #E8CE94 0%, #D9A94F 35%, #B87D2A 60%, #7A4F14 100%)",
  backgroundSize: "100% 200%",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
  textShadow: "0 3px 8px rgba(0,0,0,0.6)",
  filter: "drop-shadow(0 0 18px rgba(240,166,60,0.5))",
  animation: "gold-shimmer 4s ease-in-out infinite",
};

const narrationGroupStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 210,
  left: 24,
  right: 24,
  display: "flex",
  flexDirection: "column",
  gap: 16,
  alignItems: "center",
  animation: "bubble-pop 420ms var(--ease-pop) both",
};

const mascotImageStyle: React.CSSProperties = {
  width: 168,
  height: "auto",
  display: "block",
  filter: "drop-shadow(0 10px 16px rgba(0,0,0,0.45))",
  animation: "float-y 3.2s ease-in-out infinite",
};

const narrationBubbleStyle: React.CSSProperties = {
  position: "relative",
  background: "rgba(246,245,255,0.96)",
  color: "var(--color-ink)",
  borderRadius: 18,
  padding: "14px 16px",
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.5,
  textAlign: "center",
  boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
};

const narrationBubbleTailStyle: React.CSSProperties = {
  position: "absolute",
  bottom: -8,
  left: "50%",
  marginLeft: -8,
  width: 16,
  height: 16,
  background: "rgba(246,245,255,0.96)",
  transform: "rotate(45deg)",
};

// Layout-neutral primary CTA — used inline in flex containers (pause card,
// completion screen). continueButtonStyle below pins it to the screen bottom.
const primaryButtonStyle: React.CSSProperties = {
  minHeight: 54,
  border: "none",
  borderRadius: 999,
  background: "var(--gradient-cta)",
  color: "#fff",
  fontWeight: 800,
  fontSize: 15.5,
  cursor: "pointer",
  boxShadow: "var(--shadow-cta)",
  transition: "opacity 300ms ease",
};

const continueButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  position: "absolute",
  bottom: 40,
  left: 24,
  right: 24,
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

const hudBarStyle: React.CSSProperties = {
  position: "absolute",
  top: SAFE_AREA_TOP,
  left: 0,
  right: 0,
  height: 56,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "0 16px",
  zIndex: 25,
};

const timerPillStyle: React.CSSProperties = {
  background: "rgba(10,8,20,0.78)",
  border: "1px solid rgba(255,255,255,0.12)",
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 12.5,
  fontWeight: 800,
};

const gemPillStyle: React.CSSProperties = {
  background: "rgba(10,8,20,0.78)",
  border: "1px solid rgba(255,255,255,0.12)",
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 12.5,
  fontWeight: 800,
  color: "var(--color-soft)",
};

const exitButtonStyle: React.CSSProperties = {
  flexShrink: 0,
  width: 30,
  height: 30,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(10,8,20,0.78)",
  color: "var(--color-soft)",
  fontSize: 13,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 25,
};

const pauseScrimStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(4,3,15,0.75)",
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

const feedbackToastBaseStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 70,
  left: PLAY_AREA.width / 2 - 140,
  width: 280,
  textAlign: "center",
  padding: "10px 16px",
  borderRadius: 14,
  fontSize: 13.5,
  fontWeight: 700,
  zIndex: 22,
  boxShadow: "0 8px 20px rgba(0,0,0,0.45)",
  animation: "bubble-pop 220ms var(--ease-pop) both",
};

// Solid-backed (not a faint tint) — a translucent card over the busy
// painted-forest background made the text nearly unreadable.
const feedbackToastPositiveStyle: React.CSSProperties = {
  ...feedbackToastBaseStyle,
  background: "rgba(38,28,10,0.94)",
  border: "1px solid rgba(240,166,60,0.6)",
  color: "#FFD27A",
};

const feedbackToastNegativeStyle: React.CSSProperties = {
  ...feedbackToastBaseStyle,
  background: "rgba(40,15,13,0.94)",
  border: "1px solid rgba(226,73,63,0.55)",
  color: "#FF9D9D",
};

const ruleReminderStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 120,
  left: "50%",
  transform: "translate(-50%, 0)",
  width: 280,
  textAlign: "center",
  padding: "12px 16px",
  borderRadius: 16,
  fontSize: 12.5,
  lineHeight: 1.5,
  fontWeight: 600,
  color: "var(--color-soft)",
  background: "rgba(7,6,28,0.94)",
  border: "1px solid rgba(196,181,253,0.4)",
  zIndex: 23,
  animation: "rule-reminder-in 260ms var(--ease-spring) both",
};

const missionCompleteStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(180deg, var(--color-deep-purple) 0%, var(--color-midnight) 100%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  gap: 16,
  color: "var(--color-soft)",
  fontFamily: "var(--font-body), system-ui",
};

const statsCardStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(196,181,253,0.25)",
  borderRadius: 20,
  padding: 16,
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 8,
};

const rewardsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
};

const rewardPillStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(196,181,253,0.2)",
  borderRadius: 999,
  padding: "6px 12px",
  fontSize: 12.5,
  fontWeight: 700,
};
