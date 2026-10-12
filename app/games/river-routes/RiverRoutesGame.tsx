"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgeBand, Cell, PieceSymbol, Round, RoundResult, SessionOutcome } from "./types";
import { ASSETS, COPY, FLOW_STEP_MS, LIVES, MAIN_ROUNDS, PIECE_ART, PLAY_AREA, PRACTICE, PRACTICE_STEP_TEXT, ROUNDS, SAFE_AREA_TOP, SUBTITLE } from "./config";
import { checkFlow } from "./engine/flow";
import { buildOutcome } from "./engine/session";
import { saveSession } from "./lib/sessionReporter";
import { Hearts, ImageButton, NAVY, ProgressPill, RiverBackdrop, SendFlowButton, TEXT_DISPLAY, bubbleStyle, ctaStyle, secondaryStyle } from "./components/Art";
import { RiverStage, trayRect, type DropOutcome, type DropTarget, type FlowView, type Guide } from "./components/RiverStage";

// loading -> Round 0 guided practice (intro, tour, 5 guided drops, decoys,
// Send Flow, "Great job!") -> Rounds 1-5 on their own -> final screen.
// No timer is shown; time per round is tracked in the background only.

type Screen = "loading" | "start" | "game" | "final";
type Tutorial =
  | { phase: "intro" }
  | { phase: "tour"; step: number }
  | { phase: "build"; step: number }
  | { phase: "decoys" }
  | { phase: "flow" }
  | { phase: "done" }
  | null;
type Coach = { text: string; tone: "info" | "good" | "bad"; seq: number } | null;

export type RiverRoutesGameProps = { ageBand: AgeBand; onExit: () => void };

const keyOf = ({ r, c }: Cell) => `${r},${c}`;
const PRELOAD = [ASSETS.background, ASSETS.fumi, ASSETS.back, ASSETS.pause, ASSETS.titlePlank, ASSETS.sendFlow, ...Object.values(ASSETS.tiles), ...new Set(Object.values(PIECE_ART).map((a) => a.src))];

function newSessionId() {
  return `rr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function emptyResult(round: Round): RoundResult {
  return { round: round.id, practice: round.practice, completed: false, piecesPlaced: 0, piecesReturned: 0, invalidDrops: 0, flowAttempts: 0, failedFlows: 0, livesLeft: LIVES, timeMs: 0 };
}
function piecesGrid(round: Round, where: (string | null)[]): (PieceSymbol | null)[][] {
  const g: (PieceSymbol | null)[][] = round.board.map((row) => row.map(() => null));
  where.forEach((k, i) => {
    if (k) {
      const [r, c] = k.split(",").map(Number);
      g[r][c] = round.tray[i];
    }
  });
  return g;
}
function matchesSolution(round: Round, grid: (PieceSymbol | null)[][]) {
  return round.solution.every((row, r) => row.every((p, c) => p === grid[r][c]));
}

// The practice steps follow the river from the Start (from the solution).
const PRACTICE_PATH: Cell[] = checkFlow(PRACTICE.board, PRACTICE.solution).path.filter(({ r, c }) => PRACTICE.board[r][c] === ".");
const TOUR = [
  { text: COPY.tourStart, cells: (rd: Round) => cellsOf(rd, "S"), tray: false },
  { text: COPY.tourEnd, cells: (rd: Round) => cellsOf(rd, "E"), tray: false },
  { text: COPY.tourBoulders, cells: (rd: Round) => cellsOf(rd, "X"), tray: false },
  { text: COPY.tourTray, cells: () => [] as Cell[], tray: true },
];
function cellsOf(round: Round, kind: string): Cell[] {
  return round.board.flatMap((row, r) => row.flatMap((k, c) => (k === kind ? [{ r, c }] : [])));
}

export function RiverRoutesGame({ ageBand, onExit }: RiverRoutesGameProps) {
  const [screen, setScreen] = useState<Screen>("loading");
  const [roundIdx, setRoundIdx] = useState(0); // index into ROUNDS (0 = practice)
  const round = ROUNDS[roundIdx];
  const [where, setWhere] = useState<(string | null)[]>(() => ROUNDS[0].tray.map(() => null));
  const [tutorial, setTutorial] = useState<Tutorial>({ phase: "intro" });
  const [flow, setFlow] = useState<FlowView>(null);
  const [flowing, setFlowing] = useState(false);
  const [roundDone, setRoundDone] = useState(false);
  const [coach, setCoach] = useState<Coach>(null);
  const [paused, setPaused] = useState(false);
  const [lives, setLives] = useState(LIVES); // per round, rounds 1-5
  const [gameOver, setGameOver] = useState(false);
  const sessionId = useRef(""); // set when Play is pressed (and again on Play Again)
  const [results, setResults] = useState<RoundResult[]>([]);
  const [roundSeq, setRoundSeq] = useState(0); // remount key for round transitions

  const cur = useRef<RoundResult>(emptyResult(ROUNDS[0]));
  const clock = useRef({ acc: 0, since: null as number | null });
  const startedAt = useRef("");
  const coachSeq = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const say = useCallback((text: string, tone: "info" | "good" | "bad" = "info") => setCoach({ text, tone, seq: ++coachSeq.current }), []);
  const runClock = useCallback((on: boolean) => {
    const c = clock.current;
    if (on && c.since === null) c.since = performance.now();
    if (!on && c.since !== null) {
      c.acc += performance.now() - c.since;
      c.since = null;
    }
  }, []);
  const roundTime = useCallback(() => Math.round(clock.current.acc + (clock.current.since !== null ? performance.now() - clock.current.since : 0)), []);

  // ---- loading ---------------------------------------------------------------
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
    void Promise.race([Promise.all(loads), new Promise<void>((r) => setTimeout(r, 6000))]).then(() => {
      if (!cancelled) setScreen("start");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Saves the session to localStorage + the local backend: finished rounds
  // plus the round being played (so far). Called when play starts, when a
  // round starts, after every drop and Send Flow, on exit and on tab close.
  const resultsRef = useRef<RoundResult[]>([]);
  const screenRef = useRef<Screen>("loading");
  useEffect(() => {
    resultsRef.current = results;
    screenRef.current = screen;
  }, [results, screen]);
  const persist = useCallback(
    (status: SessionOutcome["status"]) => {
      if (!sessionId.current) return;
      const live = { ...cur.current, timeMs: cur.current.completed ? cur.current.timeMs : roundTime() };
      const rounds = [...resultsRef.current.filter((x) => x.round !== live.round), live];
      saveSession(buildOutcome({ sessionId: sessionId.current, status, ageBand, startedAt: startedAt.current || new Date().toISOString(), rounds }));
    },
    [ageBand, roundTime]
  );
  // closing / hiding the tab mid-game still keeps what was played
  useEffect(() => {
    const onHide = () => {
      if (screenRef.current === "game" && document.visibilityState === "hidden") persist("in-progress");
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [persist]);

  const beginRound = useCallback(
    (idx: number) => {
      const rd = ROUNDS[idx];
      setRoundIdx(idx);
      setWhere(rd.tray.map(() => null));
      setFlow(null);
      setFlowing(false);
      setRoundDone(false);
      setRoundSeq((s) => s + 1);
      cur.current = emptyResult(rd);
      setLives(LIVES);
      setGameOver(false);
      clock.current = { acc: 0, since: null };
      if (!startedAt.current) startedAt.current = new Date().toISOString();
      if (!rd.practice) {
        setTutorial(null);
        say(COPY.roundStart);
        later(() => setCoach((c) => (c && c.text === COPY.roundStart ? null : c)), 3200);
      }
      runClock(true);
      persist("in-progress");
    },
    [runClock, say, later, persist]
  );

  // ---- practice script ---------------------------------------------------------
  const startPractice = () => {
    sessionId.current = newSessionId();
    setScreen("game");
    beginRound(0);
    setTutorial({ phase: "tour", step: 0 });
  };
  const nextTour = () => {
    if (tutorial?.phase !== "tour") return;
    if (tutorial.step < TOUR.length - 1) setTutorial({ phase: "tour", step: tutorial.step + 1 });
    else setTutorial({ phase: "build", step: 0 });
  };

  const guide: Guide | null = useMemo(() => {
    if (!round.practice || tutorial?.phase !== "build") return null;
    const target = PRACTICE_PATH[tutorial.step];
    const sym = PRACTICE.solution[target.r][target.c];
    const items = PRACTICE.tray.map((p, i) => (p === sym && where[i] === null ? i : -1)).filter((i) => i >= 0);
    return { items, target, demo: true };
  }, [round.practice, tutorial, where]);

  // ---- drops ------------------------------------------------------------------
  const handleDrop = useCallback(
    (item: number, target: DropTarget): DropOutcome => {
      const r = cur.current;
      const from = where[item];
      if (target === null || target === "tray") {
        if (from === null) return "ignored";
        setWhere((w) => w.map((x, i) => (i === item ? null : x)));
        r.piecesReturned += 1;
        setFlow(null);
        persist("in-progress");
        return "returned";
      }
      const kind = round.board[target.r][target.c];
      if (kind !== ".") {
        r.invalidDrops += 1;
        say(COPY.blocked[kind], "bad");
        persist("in-progress");
        return "invalid";
      }
      if (guide && keyOf(target) !== keyOf(guide.target)) {
        say(COPY.wrongCellPractice, "bad");
        return "invalid";
      }
      const k = keyOf(target);
      const occupant = where.findIndex((x, i) => x === k && i !== item);
      setWhere((w) => w.map((x, i) => (i === item ? k : i === occupant ? from : x))); // swap with any piece already there
      r.piecesPlaced += 1;
      setFlow(null);
      if (guide) {
        setCoach(null); // clear any "Almost!" from a wrong try
        const step = (tutorial as { phase: "build"; step: number }).step;
        if (step < PRACTICE_PATH.length - 1) {
          setTutorial({ phase: "build", step: step + 1 });
        } else setTutorial({ phase: "decoys" });
      } else if (coach?.tone === "bad") setCoach(null);
      persist("in-progress");
      return "placed";
    },
    [where, round, guide, tutorial, say, coach, persist]
  );

  const handleTapTray = () => {
    if (round.practice && tutorial?.phase === "build") say(PRACTICE_STEP_TEXT[tutorial.step]);
    else say("Drag a piece onto an empty space on the board.");
  };

  // ---- send flow --------------------------------------------------------------
  const allPlaced = where.every((w) => w !== null);
  const canFlow = allPlaced && !flowing && !roundDone && !paused && (!round.practice || tutorial?.phase === "flow");

  const sendFlow = () => {
    if (!allPlaced) {
      if (!round.practice) say(COPY.useAllPieces, "bad");
      return;
    }
    if (!canFlow) return;
    const grid = piecesGrid(round, where);
    const raw = checkFlow(round.board, grid);
    // validated against the sheet's solution as well as by following the water
    const check = raw.ok && !matchesSolution(round, grid) ? { ...raw, ok: false } : raw;
    const r = cur.current;
    r.flowAttempts += 1;
    setCoach(null);
    setFlowing(true);
    setFlow({ check, lit: 0 });
    check.path.forEach((_, i) => later(() => setFlow({ check, lit: i + 1 }), (i + 1) * FLOW_STEP_MS));
    later(() => {
      setFlowing(false);
      if (check.ok) {
        runClock(false);
        r.completed = true;
        r.timeMs = roundTime();
        setRoundDone(true);
        const all = [...results.filter((x) => x.round !== r.round), { ...r }];
        setResults(all);
        resultsRef.current = all;
        persist(roundIdx === ROUNDS.length - 1 ? "completed" : "in-progress");
        if (round.practice) setTutorial({ phase: "done" });
        else say(COPY.roundDone, "good");
      } else {
        r.failedFlows += 1;
        say(check.failure?.kind === "unused" ? COPY.unused : COPY.stopped, "bad");
        if (!round.practice) {
          // a wrong flow costs a life; the third ends the game
          const left = lives - 1;
          r.livesLeft = left;
          setLives(left);
          if (left <= 0) {
            runClock(false);
            r.timeMs = roundTime();
            persist("game-over");
            later(() => setGameOver(true), 1400);
            return;
          }
        }
        persist("in-progress");
      }
    }, (check.path.length + 1) * FLOW_STEP_MS + 150);
  };

  // decoy step -> flow step
  const nextFromDecoys = () => setTutorial({ phase: "flow" });

  const goNext = () => {
    if (roundIdx < ROUNDS.length - 1) {
      setCoach(null);
      beginRound(roundIdx + 1);
    } else setScreen("final");
  };

  // after 3 wrong flows: a fresh game from Round 1 (practice already done)
  const tryAgain = () => {
    sessionId.current = newSessionId();
    startedAt.current = "";
    setResults([]);
    resultsRef.current = [];
    setCoach(null);
    beginRound(1);
  };

  const playAgain = () => {
    sessionId.current = newSessionId();
    startedAt.current = "";
    setResults([]);
    resultsRef.current = [];
    setScreen("game");
    beginRound(1);
  };

  const exitGame = () => {
    // (a game-over session keeps its "game-over" status)
    if (screen === "game" && !gameOver && results.length < ROUNDS.length) {
      runClock(false);
      persist("exited");
    }
    onExit();
  };
  const setPause = (on: boolean) => {
    setPaused(on);
    runClock(!on && !roundDone);
  };

  // ---- what the coach area shows --------------------------------------------------
  let coachText: string | null = coach?.text ?? null;
  let coachTone = coach?.tone ?? "info";
  let coachAction: { label: string; onClick: () => void } | null = null;
  if (round.practice && tutorial) {
    if (tutorial.phase === "tour") {
      coachText = TOUR[tutorial.step].text;
      coachTone = "info";
      coachAction = { label: tutorial.step < TOUR.length - 1 ? "Next" : "Got it!", onClick: nextTour };
    } else if (tutorial.phase === "build") {
      coachText = coach?.tone === "bad" ? coach.text : PRACTICE_STEP_TEXT[tutorial.step];
      coachTone = coach?.tone === "bad" ? "bad" : "info";
    } else if (tutorial.phase === "decoys") {
      coachText = COPY.decoys;
      coachTone = "info";
      coachAction = { label: "Next", onClick: nextFromDecoys };
    } else if (tutorial.phase === "flow") {
      coachText = flowing ? "Watch the water flow…" : coach?.tone === "bad" ? coach.text : COPY.sendFlowPrompt;
      coachTone = coach?.tone === "bad" ? "bad" : "info";
    }
  }
  if (flowing && !round.practice) coachText = null;

  const ringCells: Cell[] =
    round.practice && tutorial?.phase === "tour"
      ? TOUR[tutorial.step].cells(round)
      : round.practice && tutorial?.phase === "decoys"
        ? round.board.flatMap((row, r) => row.flatMap((k, c) => (k === "." && !round.solution[r][c] ? [{ r, c }] : [])))
        : [];
  const trayRing = round.practice && tutorial?.phase === "tour" && TOUR[tutorial.step].tray;
  const locked = paused || flowing || roundDone || gameOver || (round.practice && tutorial?.phase !== "build" && tutorial?.phase !== "flow");
  const overlay = round.practice && tutorial?.phase === "done";
  const mainDone = results.filter((r) => !r.practice && r.completed).length;

  return (
    <div style={sceneStyle}>
      <RiverBackdrop dim={overlay || screen === "final" ? 0.35 : 0} />

      {screen === "start" && <StartScreen onPlay={startPractice} />}

      {screen === "loading" && (
        <div role="status" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: NAVY, fontWeight: 800, background: "#bfe6fb" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: "4px solid rgba(18,58,122,0.2)", borderTopColor: NAVY, animation: "mw-spin 800ms linear infinite" }} />
          Filling the river…
        </div>
      )}

      {screen === "game" && (
        <>
          {/* ---- header ---- */}
          <div style={{ position: "absolute", left: 10, top: SAFE_AREA_TOP + 4 }}>
            <ImageButton src={ASSETS.back} label="Back" onClick={() => setPause(true)} />
          </div>
          <div style={{ position: "absolute", left: 70, top: SAFE_AREA_TOP + 6 }}>
            <ProgressPill total={MAIN_ROUNDS.length} done={mainDone} current={round.practice ? null : roundIdx - 1} practice={round.practice} />
          </div>
          <div style={{ position: "absolute", right: 10, top: SAFE_AREA_TOP + 4 }}>
            <ImageButton src={ASSETS.pause} label="Pause" onClick={() => setPause(true)} />
          </div>

          {/* ---- title, or Fumi's coaching ---- */}
          <div style={{ position: "absolute", left: 0, right: 0, top: 98, height: 86 }}>
            {coachText ? (
              <div key={coachText} style={{ position: "absolute", inset: "0 10px", display: "flex", alignItems: "center", gap: 6, animation: "bubble-pop 320ms var(--ease-pop) both" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ASSETS.fumi} alt="Fumi" style={{ width: 70, height: "auto", flexShrink: 0, filter: "drop-shadow(0 4px 6px rgba(0,30,70,0.35))", animation: coachTone === "good" ? "lg-cheer 700ms ease-in-out" : coachTone === "bad" ? "lg-shake 450ms ease-in-out" : "float-y 3.2s ease-in-out infinite" }} />
                <div role="status" style={{ ...bubbleStyle, flex: 1, padding: "8px 12px", fontSize: coachText.length > 100 ? 12.5 : 13.5, borderColor: coachTone === "bad" ? "#ff8a7a" : coachTone === "good" ? "#7fdc8c" : "#8fc3ea", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1 }}>{coachText}</span>
                  {coachAction && (
                    <button type="button" className="tap-scale" onClick={coachAction.onClick} style={{ ...ctaStyle, minHeight: 34, fontSize: 14, padding: "0 12px", boxShadow: "inset 0 2px 0 rgba(255,255,255,0.6), 0 3px 0 #b77a08", flexShrink: 0 }}>
                      {coachAction.label}
                    </button>
                  )}
                  <span style={{ position: "absolute", left: -9, top: "50%", marginTop: -8, width: 14, height: 14, background: "#fff", transform: "rotate(45deg)", borderLeft: `2.5px solid ${coachTone === "bad" ? "#ff8a7a" : coachTone === "good" ? "#7fdc8c" : "#8fc3ea"}`, borderBottom: `2.5px solid ${coachTone === "bad" ? "#ff8a7a" : coachTone === "good" ? "#7fdc8c" : "#8fc3ea"}` }} />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", animation: "bubble-pop 320ms var(--ease-pop) both" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ASSETS.titlePlank} alt="River Routes" style={{ width: 236, height: "auto", filter: "drop-shadow(0 5px 8px rgba(0,30,70,0.35))" }} />
                <div style={{ marginTop: 2, fontSize: 12.5, fontWeight: 800, color: NAVY, textShadow: "0 0 6px rgba(255,255,255,0.9), 0 0 2px #fff" }}>{SUBTITLE}</div>
              </div>
            )}
          </div>

          {/* ---- board + tray ---- */}
          <div key={roundSeq} style={{ position: "absolute", inset: 0, pointerEvents: "none", animation: roundSeq > 1 ? "rr-round-in 520ms cubic-bezier(0.2,0.8,0.2,1) both" : undefined }}>
            <RiverStage round={round} where={where} locked={locked} guide={guide} flow={flow} ringCells={ringCells} spotlight={trayRing ? "tray" : ringCells.length ? "cells" : null} onDrop={handleDrop} onTapTray={handleTapTray} />
            {trayRing && <div aria-hidden style={{ position: "absolute", left: trayRect.x - 4, top: trayRect.y - 4, width: trayRect.w + 8, height: trayRect.h + 8, borderRadius: 18, border: "3px solid #ffe066", boxShadow: "0 0 16px 4px rgba(255,224,102,0.8)", animation: "glow-pulse 1.2s ease-in-out infinite", pointerEvents: "none" }} />}
          </div>

          {/* ---- Send Flow / Next ---- */}
          <div style={{ position: "absolute", left: 0, right: 0, top: 624, display: "flex", justifyContent: "center" }}>
            {roundDone && !round.practice ? (
              <button type="button" className="tap-scale" onClick={goNext} style={{ ...ctaStyle, width: 230, animation: "bubble-pop 400ms var(--ease-pop) both" }}>
                {roundIdx < ROUNDS.length - 1 ? "Next Round" : "Finish"}
              </button>
            ) : (
              <div style={{ position: "relative" }}>
                <SendFlowButton onClick={sendFlow} enabled={canFlow && !gameOver} glow={canFlow && !gameOver} />
                {round.practice && tutorial?.phase === "flow" && !flowing && <div aria-hidden style={{ position: "absolute", inset: -6, borderRadius: 999, border: "3px solid #ffe066", boxShadow: "0 0 16px 4px rgba(255,224,102,0.8)", animation: "glow-pulse 1.2s ease-in-out infinite", pointerEvents: "none" }} />}
              </div>
            )}
          </div>

          {/* ---- lives (rounds 1-5), next to the button that can cost one ---- */}
          {!round.practice && (
            <div style={{ position: "absolute", right: 6, top: 642, padding: "4px 5px", borderRadius: 11, background: "linear-gradient(180deg, #2b5f95 0%, #1c4372 100%)", border: "2px solid #8fc3ea", boxShadow: "0 4px 10px rgba(0,30,70,0.45)" }}>
              <Hearts lives={lives} total={LIVES} size={13} />
            </div>
          )}

          {/* ---- out of lives ---- */}
          {gameOver && (
            <div style={{ position: "absolute", inset: 0, zIndex: 45, background: "rgba(6,30,60,0.6)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "0 26px", animation: "bubble-pop 400ms var(--ease-pop) both" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ASSETS.fumi} alt="Fumi" style={{ width: 180, height: "auto", filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.4))", animation: "float-y 3.2s ease-in-out infinite" }} />
              <div role="status" style={{ ...bubbleStyle, textAlign: "center", fontSize: 16, fontWeight: 800 }}>
                {COPY.gameOver}
                <span style={{ position: "absolute", left: "50%", top: -9, marginLeft: -8, width: 14, height: 14, background: "#fff", transform: "rotate(45deg)", borderLeft: "2.5px solid #8fc3ea", borderTop: "2.5px solid #8fc3ea" }} />
              </div>
              <Hearts lives={0} total={LIVES} size={22} />
              <button type="button" className="tap-scale" onClick={tryAgain} style={{ ...ctaStyle, width: 230, fontSize: 23 }}>
                Try Again
              </button>
              <button type="button" className="tap-scale" onClick={exitGame} style={{ ...secondaryStyle, width: 130, minHeight: 40 }}>
                Exit
              </button>
            </div>
          )}

          {/* ---- practice intro / done: Fumi centre stage ---- */}
          {overlay && (
            <div style={{ position: "absolute", inset: 0, zIndex: 40, background: "rgba(6,30,60,0.55)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "0 26px", animation: "bubble-pop 400ms var(--ease-pop) both" }}>
              {tutorial?.phase === "done" && <Confetti />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ASSETS.fumi} alt="Fumi" style={{ width: 190, height: "auto", filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.4))", animation: tutorial?.phase === "done" ? "lg-cheer 900ms ease-in-out infinite" : "float-y 3.2s ease-in-out infinite" }} />
              <div role="status" style={{ ...bubbleStyle, textAlign: "center", fontSize: tutorial?.phase === "done" ? 21 : 16, fontFamily: tutorial?.phase === "done" ? TEXT_DISPLAY : undefined, fontWeight: 800 }}>
                {COPY.practiceDone}
                <span style={{ position: "absolute", left: "50%", top: -9, marginLeft: -8, width: 14, height: 14, background: "#fff", transform: "rotate(45deg)", borderLeft: "2.5px solid #8fc3ea", borderTop: "2.5px solid #8fc3ea" }} />
              </div>
              <button type="button" className="tap-scale" onClick={goNext} style={{ ...ctaStyle, width: 240, marginTop: 8 }}>
                Start Round 1
              </button>
            </div>
          )}
        </>
      )}

      {screen === "final" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "0 26px" }}>
          <Confetti />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.titlePlank} alt="River Routes" style={{ width: 230, height: "auto" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.fumi} alt="Fumi" style={{ width: 180, height: "auto", animation: "lg-cheer 900ms ease-in-out infinite" }} />
          <div role="status" style={{ fontFamily: TEXT_DISPLAY, fontSize: 30, fontWeight: 800, color: "#fff", textAlign: "center", textShadow: `0 3px 0 ${NAVY}, 0 0 18px rgba(120,220,255,0.9)`, WebkitTextStroke: `1.5px ${NAVY}`, paintOrder: "stroke fill" }}>
            {COPY.allDone}
          </div>
          <div style={{ ...bubbleStyle, display: "flex", alignItems: "center", gap: 10 }}>
            <ProgressPill total={MAIN_ROUNDS.length} done={mainDone} current={null} practice={false} />
          </div>
          <div style={{ display: "flex", gap: 12, width: "100%", marginTop: 6 }}>
            <button type="button" className="tap-scale" onClick={playAgain} style={{ ...secondaryStyle, flex: 1 }}>
              Play Again
            </button>
            <button type="button" className="tap-scale" onClick={onExit} style={{ ...ctaStyle, flex: 1, fontSize: 19, minHeight: 50 }}>
              Finish
            </button>
          </div>
        </div>
      )}

      {paused && screen === "game" && (
        <div style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(6,30,60,0.75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ ...bubbleStyle, width: 250, display: "flex", flexDirection: "column", gap: 12, textAlign: "center", padding: 20 }}>
            <div style={{ fontFamily: TEXT_DISPLAY, fontWeight: 800, fontSize: 24 }}>Paused</div>
            <button type="button" className="tap-scale" onClick={() => setPause(false)} style={ctaStyle}>
              Resume
            </button>
            <button type="button" className="tap-scale" onClick={exitGame} style={secondaryStyle}>
              Exit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Title screen (same format as Minecart Escape's): the game's sign, Fumi
// with what the game is about, and Play — which starts the guided practice.
function StartScreen({ onPlay }: { onPlay: () => void }) {
  return (
    <>
      <div style={{ position: "absolute", top: SAFE_AREA_TOP + 22, left: 0, right: 0, display: "flex", justifyContent: "center", animation: "bubble-pop 500ms var(--ease-pop) both" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ASSETS.titlePlank} alt="River Routes" style={{ width: 330, height: "auto", filter: "drop-shadow(0 8px 14px rgba(0,30,70,0.45))" }} />
      </div>
      <div style={{ position: "absolute", top: 196, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ASSETS.fumi} alt="Fumi" style={{ width: 190, height: "auto", filter: "drop-shadow(0 8px 12px rgba(0,30,70,0.4))", animation: "float-y 3.2s ease-in-out infinite" }} />
      </div>
      <div style={{ position: "absolute", top: 390, left: 24, right: 24, animation: "bubble-pop 500ms var(--ease-pop) 200ms both" }}>
        <div role="status" style={{ ...bubbleStyle, textAlign: "center", fontSize: 16, fontWeight: 800 }}>
          {COPY.practiceIntro}
          <span style={{ position: "absolute", left: "50%", top: -9, marginLeft: -8, width: 14, height: 14, background: "#fff", transform: "rotate(45deg)", borderLeft: "2.5px solid #8fc3ea", borderTop: "2.5px solid #8fc3ea" }} />
        </div>
      </div>
      <button type="button" className="tap-scale" onClick={onPlay} style={{ ...ctaStyle, position: "absolute", bottom: 60, left: "50%", marginLeft: -110, width: 220, fontSize: 28 }}>
        Play
      </button>
    </>
  );
}

const CONFETTI = ["#ffd23f", "#4fc3ff", "#7fdc8c", "#ff8ac2", "#ffffff", "#1f6fd1"];
function Confetti() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {Array.from({ length: 24 }, (_, i) => (
        <div key={i} style={{ position: "absolute", top: -16, left: `${(i * 4.3 + 2) % 100}%`, width: 8, height: 12, borderRadius: 2, background: CONFETTI[i % CONFETTI.length], animation: `confetti-fall ${1500 + (i % 5) * 200}ms ease-in ${(i % 8) * 0.13}s both` }} />
      ))}
    </div>
  );
}

const sceneStyle: React.CSSProperties = {
  position: "relative",
  width: PLAY_AREA.width,
  height: PLAY_AREA.height,
  overflow: "hidden",
  background: "#5fb6e6",
  fontFamily: "var(--font-body), system-ui",
  userSelect: "none",
  WebkitUserSelect: "none",
};

