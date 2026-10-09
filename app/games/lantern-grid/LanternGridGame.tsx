"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgeBand, AttemptRecord, LanternCode, PuzzleResult, SessionOutcome } from "./types";
import { ASSETS, COMPLETE_LINE, FUMI_INTRO, GAME_OVER_LINE, INSTRUCTION, LANTERNS, LIVES, OPTION_LETTERS, PLAY_AREA, PUZZLES, RETURN_MS, SAFE_AREA_TOP, SOLVED_HOLD_MS, WRONG_HOLD_MS } from "./config";
import { buildOutcome } from "./engine/session";
import { saveSession } from "./lib/sessionReporter";
import { GroveBackdrop, Hearts, ImageButton, INK, Parchment, Plank, ProgressBar, TEXT_DISPLAY, WOOD_DARK, WOOD_EDGE, playButtonStyle, secondaryButtonStyle, speechStyle } from "./components/Art";
import { PuzzleStage, type DropResult } from "./components/PuzzleStage";
import { Typewriter } from "../../components/Typewriter";

// loading -> intro (Fumi centre-stage explains) -> play: 10 puzzles in a
// row, each sliding in from the right when the last is solved (no round
// labels, no visible timer) -> complete | gameover (3 wrong drops).
// "Try Again" restarts from puzzle 1 with 3 lives and a fresh session.
type Screen = "loading" | "intro" | "play" | "gameover" | "complete";
type FumiSpot = "center" | "top";

export type LanternGridGameProps = {
  ageBand: AgeBand;
  onExit: () => void;
};

function newSessionId(): string {
  return `lg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const PRELOAD = [ASSETS.background, ASSETS.fumi, ASSETS.back, ASSETS.pause, ASSETS.progressLantern, ...Object.values(LANTERNS).map((l) => l.src)];

export function LanternGridGame({ ageBand, onExit }: LanternGridGameProps) {
  const [screen, setScreen] = useState<Screen>("loading");
  const [fumiSpot, setFumiSpot] = useState<FumiSpot>("center");
  const [fumiMood, setFumiMood] = useState<{ kind: "cheer" | "oops" | "idle"; key: number }>({ kind: "idle", key: 0 });
  const [introDone, setIntroDone] = useState(false);

  const [sessionId, setSessionId] = useState(newSessionId);
  const [index, setIndex] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [lit, setLit] = useState<(LanternCode | null)[]>(() => PUZZLES.map(() => null));
  const [results, setResults] = useState<PuzzleResult[]>([]);
  const [slide, setSlide] = useState<"in" | "out" | "idle">("in");
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [outcome, setOutcome] = useState<SessionOutcome | null>(null);

  // ---- background clock (never shown) -------------------------------------
  // Runs from the moment the first puzzle is playable; pauses are excluded.
  const clock = useRef({ acc: 0, since: null as number | null, wallStart: 0, startedAt: "", armed: false });
  const puzzleStart = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const elapsed = useCallback(() => {
    const c = clock.current;
    return c.acc + (c.since !== null ? performance.now() - c.since : 0);
  }, []);
  const runClock = useCallback((on: boolean) => {
    const c = clock.current;
    if (on && c.armed && c.since === null) c.since = performance.now();
    if (!on && c.since !== null) {
      c.acc += performance.now() - c.since;
      c.since = null;
    }
  }, []);

  // ---- loading: preload every image so nothing pops in mid-game -----------
  useEffect(() => {
    let cancelled = false;
    const loads = PRELOAD.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => resolve();
          img.src = src;
        })
    );
    const fallback = new Promise<void>((resolve) => setTimeout(resolve, 6000));
    void Promise.race([Promise.all(loads), fallback]).then(() => {
      if (!cancelled) setScreen("intro");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const startSession = useCallback(() => {
    clock.current = { acc: 0, since: null, wallStart: 0, startedAt: "", armed: false };
    setSessionId(newSessionId());
    setIndex(0);
    setLives(LIVES);
    setLit(PUZZLES.map(() => null));
    setResults([]);
    setOutcome(null);
    setPaused(false);
    setActive(false);
    setSlide("in");
    setFumiSpot("top");
    setFumiMood({ kind: "idle", key: Date.now() });
    setScreen("play");
  }, []);

  const makeOutcome = useCallback(
    (status: SessionOutcome["status"], puzzles: PuzzleResult[], livesLeft: number) =>
      buildOutcome({
        sessionId,
        status,
        ageBand,
        startedAt: clock.current.startedAt,
        puzzles,
        livesRemaining: livesLeft,
        elapsedActiveMs: elapsed(),
        elapsedWallMs: clock.current.wallStart ? Date.now() - clock.current.wallStart : 0,
      }),
    [sessionId, ageBand, elapsed]
  );

  const handleSlideEnd = useCallback(() => {
    if (slide === "in") {
      setSlide("idle");
      setActive(true);
      if (!clock.current.armed) {
        // first puzzle is now playable: start background timing
        clock.current.armed = true;
        clock.current.wallStart = Date.now();
        clock.current.startedAt = new Date().toISOString();
        runClock(!paused);
        saveSession(makeOutcome("in-progress", [], LIVES)); // session exists from the first puzzle
      }
      puzzleStart.current = elapsed();
    } else if (slide === "out") {
      setIndex((i) => i + 1);
      setSlide("in");
    }
  }, [slide, paused, runClock, elapsed, makeOutcome]);

  const handleAttempt = useCallback(
    (optionIndex: number): DropResult => {
      const puzzle = PUZZLES[index];
      const option = puzzle.options[optionIndex];
      const correct = option === puzzle.answer;
      const atMs = Math.round(elapsed() - puzzleStart.current);
      const attempt: AttemptRecord = { option, optionLetter: OPTION_LETTERS[optionIndex], correct, atMs };
      const prev = results[index] ?? { puzzle: puzzle.id, answer: puzzle.answer, solved: false, attempts: [], wrongAttempts: 0, timeToSolveMs: null };
      const cur: PuzzleResult = { ...prev, attempts: [...prev.attempts, attempt], wrongAttempts: prev.wrongAttempts + (correct ? 0 : 1), solved: correct, timeToSolveMs: correct ? atMs : null };
      const all = [...results.slice(0, index), cur];
      setResults(all);

      if (correct) {
        setActive(false);
        setLit((l) => l.map((x, i) => (i === index ? puzzle.answer : x)));
        setFumiMood({ kind: "cheer", key: Date.now() });
        if (index === PUZZLES.length - 1) {
          runClock(false); // tenth solved: stop timing immediately
          const o = makeOutcome("completed", all, lives);
          saveSession(o);
          setOutcome(o);
          later(() => {
            setFumiSpot("center");
            setScreen("complete");
          }, SOLVED_HOLD_MS);
        } else {
          saveSession(makeOutcome("in-progress", all, lives));
          later(() => setSlide("out"), SOLVED_HOLD_MS);
        }
        return "correct";
      }

      const left = lives - 1;
      setLives(left);
      setFumiMood({ kind: "oops", key: Date.now() });
      if (left <= 0) {
        setActive(false);
        runClock(false);
        const o = makeOutcome("game-over", all, 0);
        saveSession(o);
        setOutcome(o);
        // let the ✕ card finish returning, then end
        later(() => {
          setFumiSpot("center");
          setScreen("gameover");
        }, WRONG_HOLD_MS + RETURN_MS + 350);
      } else saveSession(makeOutcome("in-progress", all, left));
      return "wrong";
    },
    [index, results, lives, elapsed, runClock, makeOutcome, later]
  );

  // Leaving mid-game still saves the session so far.
  const exitGame = () => {
    if (screen === "play" && clock.current.armed) {
      runClock(false);
      saveSession(makeOutcome("exited", results, lives));
    }
    onExit();
  };

  const setPause = (on: boolean) => {
    setPaused(on);
    runClock(!on);
  };

  const playing = screen === "play";
  const puzzle = PUZZLES[index];
  const ended = screen === "gameover" || screen === "complete";

  return (
    <div style={sceneStyle}>
      <GroveBackdrop dim={screen === "intro" || ended ? 0.45 : 0.12} />

      {screen === "loading" && (
        <div role="status" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "#ffe9b8", fontWeight: 800, fontSize: 15, background: "#0a0f24" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: "4px solid rgba(255,200,90,0.25)", borderTopColor: "#ffc35a", animation: "mw-spin 800ms linear infinite" }} />
          Lighting the lanterns…
        </div>
      )}

      {/* ---- header: back, lantern progression, pause, title + instruction, lives ---- */}
      {playing && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", animation: "lg-header-in 600ms ease-out 250ms both" }}>
          <div style={{ position: "absolute", left: 8, top: SAFE_AREA_TOP + 4, pointerEvents: "auto" }}>
            <ImageButton src={ASSETS.back} label="Back" onClick={() => setPause(true)} />
          </div>
          <div style={{ position: "absolute", left: 54, top: SAFE_AREA_TOP + 4 }}>
            <ProgressBar lit={lit} width={282} />
          </div>
          <div style={{ position: "absolute", right: 8, top: SAFE_AREA_TOP + 4, pointerEvents: "auto" }}>
            <ImageButton src={ASSETS.pause} label="Pause" onClick={() => setPause(true)} />
          </div>
          <Parchment style={{ position: "absolute", left: 120, right: 8, top: 108, height: 92 }}>
            <div style={{ padding: "16px 12px 6px", textAlign: "center", color: INK, fontWeight: 700, fontSize: 12.5, lineHeight: 1.35 }}>{INSTRUCTION}</div>
          </Parchment>
          <Plank style={{ position: "absolute", left: 134, top: 92 }}>LANTERN GRID</Plank>
          <div style={{ position: "absolute", right: 12, top: 94, padding: "3px 7px", borderRadius: 10, background: WOOD_DARK, border: `2px solid ${WOOD_EDGE}`, boxShadow: "0 3px 8px rgba(0,0,0,0.5)" }}>
            <Hearts lives={lives} size={15} />
          </div>
        </div>
      )}

      {playing && (
        <PuzzleStage key={`${sessionId}-${index}`} puzzle={puzzle} active={active && !paused} slide={slide} onSlideEnd={handleSlideEnd} onAttempt={handleAttempt} />
      )}

      {/* ---- Fumi: centre stage for intro / endings, top-left guide while playing ---- */}
      {screen !== "loading" && <FumiGuide spot={fumiSpot} mood={fumiMood} celebrate={screen === "complete"} />}

      {screen === "intro" && (
        <>
          <div style={{ position: "absolute", top: 348, left: 22, right: 22, animation: "bubble-pop 450ms var(--ease-pop) 300ms both" }}>
            <div style={{ ...speechStyle, minHeight: 92 }}>
              <Typewriter text={FUMI_INTRO} onDone={() => setIntroDone(true)} />
              <BubbleTail />
            </div>
          </div>
          {introDone && (
            <button type="button" className="tap-scale" onClick={startSession} style={{ ...playButtonStyle, position: "absolute", bottom: 70, left: 80, right: 80, animation: "bubble-pop 420ms var(--ease-pop) both" }}>
              Let&apos;s Go!
            </button>
          )}
        </>
      )}

      {screen === "gameover" && (
        <>
          <div style={{ position: "absolute", top: 348, left: 22, right: 22, animation: "bubble-pop 450ms var(--ease-pop) 400ms both" }}>
            <div role="status" style={{ ...speechStyle, minHeight: 70 }}>
              {GAME_OVER_LINE}
              <BubbleTail />
            </div>
          </div>
          <div style={{ position: "absolute", top: 452, left: 0, right: 0, display: "flex", justifyContent: "center", animation: "bubble-pop 400ms var(--ease-pop) 600ms both" }}>
            <div style={{ padding: "5px 12px", borderRadius: 12, background: "rgba(20,12,4,0.75)", border: "1px solid rgba(255,220,160,0.4)" }}>
              <MiniProgress lit={lit} />
            </div>
          </div>
          <button type="button" className="tap-scale" onClick={startSession} style={{ ...playButtonStyle, position: "absolute", bottom: 92, left: 70, right: 70, fontSize: 24, animation: "bubble-pop 420ms var(--ease-pop) 800ms both" }}>
            Try Again
          </button>
          <button type="button" className="tap-scale" onClick={onExit} style={{ ...secondaryButtonStyle, position: "absolute", bottom: 30, left: 130, right: 130, minHeight: 40 }}>
            Exit
          </button>
        </>
      )}

      {screen === "complete" && outcome && <CompleteOverlay outcome={outcome} lit={lit} onPlayAgain={startSession} onFinish={onExit} />}

      {paused && playing && (
        <div style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(6,8,20,0.82)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Parchment style={{ width: 260 }}>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, textAlign: "center" }}>
              <div style={{ fontFamily: TEXT_DISPLAY, fontWeight: 800, fontSize: 24, color: INK }}>Paused</div>
              <button type="button" className="tap-scale" onClick={() => setPause(false)} style={playButtonStyle}>
                Resume
              </button>
              <button type="button" className="tap-scale" onClick={exitGame} style={{ ...secondaryButtonStyle, background: "#6e421d" }}>
                Exit
              </button>
            </div>
          </Parchment>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function FumiGuide({ spot, mood, celebrate }: { spot: FumiSpot; mood: { kind: "cheer" | "oops" | "idle"; key: number }; celebrate: boolean }) {
  const center = spot === "center";
  const w = center ? 210 : 112;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        zIndex: 20,
        left: center ? (PLAY_AREA.width - w) / 2 : 2,
        top: center ? 128 : 94,
        width: w,
        transition: "left 750ms cubic-bezier(0.5,0,0.2,1), top 750ms cubic-bezier(0.5,0,0.2,1), width 750ms cubic-bezier(0.5,0,0.2,1)",
        pointerEvents: "none",
      }}
    >
      <div style={{ animation: celebrate ? "lg-cheer 900ms ease-in-out infinite" : "float-y 3.4s ease-in-out infinite" }}>
        <div key={mood.key} style={{ animation: mood.kind === "cheer" ? "lg-cheer 700ms ease-in-out" : mood.kind === "oops" ? "lg-shake 450ms ease-in-out" : undefined }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.fumi} alt="Fumi" style={{ width: "100%", height: "auto", display: "block", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.5))" }} />
        </div>
      </div>
    </div>
  );
}

function BubbleTail() {
  return <div style={{ position: "absolute", top: -9, left: "50%", marginLeft: -9, width: 18, height: 18, background: "#fffaf0", transform: "rotate(45deg)", borderLeft: "2px solid #c9a265", borderTop: "2px solid #c9a265" }} />;
}

function MiniProgress({ lit }: { lit: (LanternCode | null)[] }) {
  return (
    <div style={{ display: "flex", gap: 4 }} aria-label={`${lit.filter(Boolean).length} of ${lit.length} lanterns lit`}>
      {lit.map((code, i) =>
        code ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={LANTERNS[code].src} alt="" style={{ width: 24, height: 24, borderRadius: 5, boxShadow: `0 0 8px ${LANTERNS[code].colour === "amber" ? "rgba(255,176,46,0.85)" : "rgba(84,170,255,0.85)"}` }} />
        ) : (
          <span key={i} style={{ width: 24, height: 24, borderRadius: 5, background: "#2a221c", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.8)" }} />
        )
      )}
    </div>
  );
}

const CONFETTI = ["#ffd23a", "#ffb02e", "#54aaff", "#7dff95", "#ff7ab8", "#ffffff"];

function CompleteOverlay({ outcome, lit, onPlayAgain, onFinish }: { outcome: SessionOutcome; lit: (LanternCode | null)[]; onPlayAgain: () => void; onFinish: () => void }) {
  const m = outcome.metrics;
  return (
    <>
      <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 25 }}>
        {Array.from({ length: 26 }, (_, i) => (
          <div key={i} style={{ position: "absolute", top: -16, left: `${(i * 3.9 + 2) % 100}%`, width: 8, height: 12, borderRadius: 2, background: CONFETTI[i % CONFETTI.length], animation: `confetti-fall ${1500 + (i % 5) * 200}ms ease-in ${(i % 8) * 0.14}s both` }} />
        ))}
      </div>
      <div style={{ position: "absolute", top: SAFE_AREA_TOP + 8, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, animation: "bubble-pop 500ms var(--ease-pop) both" }}>
        <div style={{ padding: "5px 12px", borderRadius: 12, background: "rgba(20,12,4,0.75)", border: "1px solid rgba(255,220,160,0.45)" }}>
          <MiniProgress lit={lit} />
        </div>
      </div>
      <div role="status" style={{ position: "absolute", top: 336, left: 16, right: 16, fontFamily: TEXT_DISPLAY, fontWeight: 800, fontSize: 29, lineHeight: 1.1, textAlign: "center", color: "#fff4dc", WebkitTextStroke: "1.5px #4a2508", paintOrder: "stroke fill", textShadow: "0 3px 0 #4a2508, 0 0 22px rgba(255,190,80,0.7)", animation: "bubble-pop 500ms var(--ease-pop) 200ms both" }}>
        {COMPLETE_LINE}
      </div>
      <div style={{ position: "absolute", top: 428, left: 30, right: 30, animation: "bubble-pop 450ms var(--ease-pop) 400ms both" }}>
        <Parchment>
          <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, textAlign: "center" }}>
            <div>
              <div style={{ fontFamily: TEXT_DISPLAY, fontWeight: 800, fontSize: 24, color: INK }}>
                {m.puzzlesSolved} / {m.totalPuzzles}
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#7a5528" }}>Puzzles solved</div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "center", height: 30, alignItems: "center" }}>
                <Hearts lives={m.livesRemaining} size={20} />
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#7a5528" }}>Lives left</div>
            </div>
          </div>
        </Parchment>
      </div>
      <div style={{ position: "absolute", bottom: 40, left: 24, right: 24, display: "flex", gap: 12 }}>
        <button type="button" className="tap-scale" onClick={onPlayAgain} style={{ ...secondaryButtonStyle, flex: 1 }}>
          Play Again
        </button>
        <button type="button" className="tap-scale" onClick={onFinish} style={{ ...playButtonStyle, flex: 1, fontSize: 19, minHeight: 50 }}>
          Finish
        </button>
      </div>
    </>
  );
}

const sceneStyle: React.CSSProperties = {
  position: "relative",
  width: PLAY_AREA.width,
  height: PLAY_AREA.height,
  overflow: "hidden",
  background: "#0a0f24",
  fontFamily: "var(--font-body), system-ui",
  userSelect: "none",
  WebkitUserSelect: "none",
};
