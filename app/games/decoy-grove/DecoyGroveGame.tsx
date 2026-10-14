"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgeBand, Placed, RoundRecord, SessionOutcome } from "./types";
import { ALL_KINDS, ASSETS, BASE_POINTS, COPY, CORRECT_HOLD_MS, LEVEL_TIME_MS, PLAY_AREA, ROUNDS, SAFE_AREA_TOP, TIME_LIMIT_MS, WRONG_HOLD_MS, multiplierFor, objectSrc } from "./config";
import { describe, layoutRound } from "./engine/scatter";
import { buildOutcome } from "./engine/session";
import { saveSession } from "./lib/sessionReporter";

// Decoy Grove follows Lumosity's Star Search: objects are scattered over the
// grove and exactly one doesn't belong. Tap it. One 1:30 clock runs for the
// whole game (100 s) and each level must be answered within 4 s. Right ->
// points (more for a streak) and the next level. Wrong or too slow -> the
// real odd one is shown (missed: straight on), streak resets, next level. The game ends after
// Level 25 (even with time left) or when the 100 s run out.

type Screen = "loading" | "start" | "play" | "end";
type Feedback = { correct: boolean; tappedKey: string; points: number } | null;

export type DecoyGroveGameProps = { ageBand: AgeBand; onExit: () => void };

const PRELOAD = [ASSETS.background, ASSETS.fumi, ASSETS.titlePlank, ...ALL_KINDS.map(objectSrc)];

function newSessionId() {
  return `dg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function DecoyGroveGame({ ageBand, onExit }: DecoyGroveGameProps) {
  const [screen, setScreen] = useState<Screen>("loading");
  const [roundIdx, setRoundIdx] = useState(0);
  const [layoutSeq, setLayoutSeq] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [remaining, setRemaining] = useState(TIME_LIMIT_MS);
  const [paused, setPaused] = useState(false);
  const [endStatus, setEndStatus] = useState<"completed" | "time-up">("completed");
  const [records, setRecords] = useState<RoundRecord[]>([]);

  // fresh random layout each time a round is shown
  const placed: Placed[] = useMemo(() => layoutRound(ROUNDS[roundIdx]), [roundIdx, layoutSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  const sessionId = useRef("");
  const startedAt = useRef("");
  const elapsed = useRef({ acc: 0, since: null as number | null });
  const roundShownAt = useRef(0);
  const feedbackRef = useRef<Feedback>(null);
  const missLevelRef = useRef<() => void>(() => {}); // latest "level ran out" handler, for the clock
  const recordsRef = useRef<RoundRecord[]>([]);
  const screenRef = useRef<Screen>("loading");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const used = useCallback(() => elapsed.current.acc + (elapsed.current.since !== null ? performance.now() - elapsed.current.since : 0), []);
  const runClock = useCallback((on: boolean) => {
    const e = elapsed.current;
    if (on && e.since === null) e.since = performance.now();
    if (!on && e.since !== null) {
      e.acc += performance.now() - e.since;
      e.since = null;
    }
  }, []);
  const persist = useCallback(
    (status: SessionOutcome["status"]) => {
      if (!sessionId.current) return;
      saveSession(buildOutcome({ sessionId: sessionId.current, status, ageBand, startedAt: startedAt.current, rounds: recordsRef.current, timeUsedMs: used() }));
    },
    [ageBand, used]
  );

  // ---- loading -------------------------------------------------------------------
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

  // ---- the 1:30 clock ----------------------------------------------------------------
  const finish = useCallback(
    (status: "completed" | "time-up") => {
      runClock(false);
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setEndStatus(status);
      feedbackRef.current = null;
      setFeedback(null);
      setScreen("end");
      persist(status);
    },
    [runClock, persist]
  );

  useEffect(() => {
    if (screen !== "play" || paused) return;
    const id = setInterval(() => {
      const left = TIME_LIMIT_MS - used();
      setRemaining(Math.max(0, left));
      if (left <= 0) return finish("time-up");
      if (!feedbackRef.current) {
        const lvl = LEVEL_TIME_MS - (used() - roundShownAt.current);
        if (lvl <= 0) missLevelRef.current();
      }
    }, 50);
    return () => clearInterval(id);
  }, [screen, paused, used, finish]);

  // closing / hiding the tab mid-game keeps what was played
  useEffect(() => {
    const onHide = () => {
      if (screenRef.current === "play" && document.visibilityState === "hidden") persist("in-progress");
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [persist]);

  const start = () => {
    sessionId.current = newSessionId();
    startedAt.current = new Date().toISOString();
    elapsed.current = { acc: 0, since: null };
    recordsRef.current = [];
    setRecords([]);
    setScore(0);
    setStreak(0);
    feedbackRef.current = null;
    setFeedback(null);
    setRemaining(TIME_LIMIT_MS);
    setRoundIdx(0);
    setLayoutSeq((s) => s + 1);
    setPaused(false);
    setScreen("play");
    runClock(true);
    roundShownAt.current = 0;
    persist("in-progress");
  };

  // ---- answering a level (tap, or the 4 s running out) ------------------------------
  const answer = (p: Placed | null) => {
    if (feedbackRef.current || paused || screen !== "play") return;
    const timedOut = p === null;
    const correct = !timedOut && p.isOdd;
    const multiplier = multiplierFor(streak);
    const points = correct ? BASE_POINTS * multiplier : 0;
    const responseMs = timedOut ? LEVEL_TIME_MS : Math.min(LEVEL_TIME_MS, Math.round(used() - roundShownAt.current));
    const record: RoundRecord = { round: ROUNDS[roundIdx].id, correct, timedOut, tapped: timedOut ? "(no tap — time ran out)" : describe(p), responseMs, streakBefore: streak, multiplier, points };
    recordsRef.current = [...recordsRef.current, record];
    setRecords(recordsRef.current);
    setScore((s) => s + points);
    setStreak(correct ? streak + 1 : 0);
    // every level is done: the game ends, even if there's time left
    const last = roundIdx === ROUNDS.length - 1;
    persist(last ? "completed" : "in-progress");
    if (timedOut) {
      // missed (4 s ran out): no message, just the next level
      if (last) return finish("completed");
      setRoundIdx((i) => i + 1);
      roundShownAt.current = used();
      return;
    }
    const fb: Feedback = { correct, tappedKey: p.key, points };
    feedbackRef.current = fb;
    setFeedback(fb);
    timers.current.push(
      setTimeout(
        () => {
          if (last) return finish("completed");
          feedbackRef.current = null;
          setFeedback(null);
          setRoundIdx((i) => i + 1);
          roundShownAt.current = used();
        },
        correct ? CORRECT_HOLD_MS : WRONG_HOLD_MS
      )
    );
  };
  const tap = (p: Placed) => answer(p);
  useEffect(() => {
    missLevelRef.current = () => answer(null);
  });

  const setPause = (on: boolean) => {
    setPaused(on);
    runClock(!on);
  };
  const exitGame = () => {
    if (screen === "play") {
      runClock(false);
      persist("exited");
    }
    onExit();
  };

  const multiplier = multiplierFor(streak);
  const correctCount = records.filter((r) => r.correct).length;

  return (
    <div style={sceneStyle}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ASSETS.background} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: screen === "play" ? "rgba(4,10,40,0.18)" : "rgba(4,10,40,0.35)" }} />

      {screen === "loading" && (
        <div role="status" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "#fff4dc", fontWeight: 800, background: "#0a1a5a" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: "4px solid rgba(255,220,140,0.25)", borderTopColor: "#ffd27a", animation: "mw-spin 800ms linear infinite" }} />
          Walking into the grove…
        </div>
      )}

      {/* ---- home screen: title, Fumi with the idea, Play ---- */}
      {screen === "start" && (
        <>
          <div style={{ position: "absolute", top: SAFE_AREA_TOP + 22, left: 0, right: 0, display: "flex", justifyContent: "center", animation: "bubble-pop 500ms var(--ease-pop) both" }}>
            <div style={{ position: "relative", width: 350 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ASSETS.titlePlank} alt="" style={{ width: 350, height: "auto", display: "block", filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.5))" }} />
              <h1 style={titleSignText}>Decoy Grove</h1>
            </div>
          </div>
          <div style={{ position: "absolute", top: 196, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ASSETS.fumi} alt="Fumi" style={{ width: 180, height: "auto", filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.45))", animation: "float-y 3.2s ease-in-out infinite" }} />
          </div>
          <div style={{ position: "absolute", top: 388, left: 24, right: 24, animation: "bubble-pop 500ms var(--ease-pop) 200ms both" }}>
            <div role="status" style={bubbleStyle}>
              {COPY.intro}
              <span style={bubbleTail} />
            </div>
          </div>
          <button type="button" className="tap-scale" onClick={start} style={{ ...ctaStyle, position: "absolute", bottom: 60, left: "50%", marginLeft: -110, width: 220 }}>
            Play
          </button>
        </>
      )}

      {/* ---- play ---- */}
      {screen === "play" && (
        <>
          <div style={{ position: "absolute", left: 10, right: 10, top: SAFE_AREA_TOP + 4, height: 46, display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" className="tap-scale" aria-label="Pause" onClick={() => setPause(true)} style={{ ...chipStyle, width: 46, padding: 0, justifyContent: "center", cursor: "pointer", fontSize: 16, letterSpacing: 2 }}>
              ❚❚
            </button>
            <div style={{ flex: 1 }} />
            <div role="timer" aria-label={`Time left ${clock(remaining)}`} style={{ ...chipStyle, minWidth: 104, color: remaining <= 10_000 ? "#ff9c8f" : "#fff4dc" }}>
              <span style={chipLabel}>TIME</span>
              <span>{clock(remaining)}</span>
            </div>
            <div aria-label={`Score ${score}`} style={{ ...chipStyle, minWidth: 116, position: "relative" }}>
              <span style={chipLabel}>SCORE</span>
              <span key={score} style={{ animation: score ? "bubble-pop 300ms var(--ease-pop)" : undefined }}>
                {score}
              </span>
              {multiplier > 1 && <span style={{ position: "absolute", right: -6, top: -9, padding: "1px 6px", borderRadius: 8, background: "#ffd23f", color: "#3a2400", fontSize: 11, fontWeight: 900 }}>x{multiplier}</span>}
            </div>
          </div>

          {/* level N / 25 (each level has 4 s, timed in the background) */}
          <div style={{ position: "absolute", left: 14, right: 14, top: SAFE_AREA_TOP + 56, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#fff4dc", fontWeight: 800, fontSize: 13, textShadow: "0 1px 3px rgba(0,0,0,0.7)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
              Level {ROUNDS[roundIdx].id} / {ROUNDS.length}
            </span>
          </div>

          <div key={`${roundIdx}-${layoutSeq}`} role="group" aria-label={`Round ${ROUNDS[roundIdx].id}: find the odd one out`} style={{ position: "absolute", inset: 0, pointerEvents: "none", animation: "dg-round-in 260ms ease-out both", visibility: paused ? "hidden" : "visible" }}>
            {placed.map((p) => {
              const fb = feedback && (feedback.tappedKey === p.key ? (feedback.correct ? "right" : "wrong") : !feedback.correct && p.isOdd ? "reveal" : null);
              return (
                <button
                  key={p.key}
                  type="button"
                  aria-label={describe(p).replace(/-/g, " ")}
                  data-odd={p.isOdd ? "true" : undefined}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    tap(p);
                  }}
                  style={{ position: "absolute", left: p.x - p.size / 2, top: p.y - p.size / 2, width: p.size, height: p.size, padding: 0, border: "none", background: "none", cursor: "pointer", touchAction: "manipulation", pointerEvents: "auto" }}
                >
                  <div style={{ width: "100%", height: "100%", animation: p.drift ? `dg-drift-${p.drift} 2.4s ease-in-out infinite` : undefined }}>
                    {/* soft halo keeps every object readable on sky and path */}
                    <div style={{ position: "absolute", inset: "4%", borderRadius: "50%", background: "radial-gradient(circle, rgba(10,18,60,0.5) 0%, rgba(10,18,60,0.28) 55%, rgba(10,18,60,0) 72%)" }} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={objectSrc(p.kind)}
                      alt=""
                      draggable={false}
                      style={{ position: "relative", width: "100%", height: "100%", pointerEvents: "none", transform: `${p.facing === "left" ? "scaleX(-1)" : ""} ${p.upsideDown ? "rotate(180deg)" : ""}`, filter: "drop-shadow(0 0 2px rgba(255,255,255,0.75)) drop-shadow(0 3px 4px rgba(0,0,0,0.45))", animation: fb === "wrong" ? "lg-shake 420ms ease-in-out" : undefined }}
                    />
                    {fb && <div style={{ position: "absolute", inset: -5, borderRadius: "50%", border: `4px solid ${fb === "right" ? "#5ee37a" : fb === "wrong" ? "#ff5a4e" : "#ffd23f"}`, boxShadow: `0 0 16px ${fb === "right" ? "rgba(94,227,122,0.9)" : fb === "wrong" ? "rgba(255,90,78,0.9)" : "rgba(255,210,63,0.95)"}`, animation: fb === "reveal" ? "glow-pulse 600ms ease-in-out infinite" : "bubble-pop 260ms var(--ease-pop) both" }} />}
                    {fb === "wrong" && <span style={{ position: "absolute", right: -4, top: -4, width: 26, height: 26, borderRadius: "50%", background: "#e5483c", border: "2px solid #fff", color: "#fff", fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</span>}
                    {fb === "right" && (
                      <span style={{ position: "absolute", left: "50%", top: -12, transform: "translateX(-50%)", color: "#fff", fontWeight: 900, fontSize: 18, textShadow: "0 2px 4px rgba(0,0,0,0.7), 0 0 8px rgba(94,227,122,0.9)", animation: "float-up-fade 700ms ease-out both", whiteSpace: "nowrap" }}>
                        +{feedback!.points}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {paused && (
            <div style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(4,10,40,0.82)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ ...bubbleStyle, width: 250, display: "flex", flexDirection: "column", gap: 12, padding: 20 }}>
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
        </>
      )}

      {/* ---- end ---- */}
      {screen === "end" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "0 26px" }}>
          {endStatus === "completed" && <Confetti />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.fumi} alt="Fumi" style={{ width: 160, height: "auto", filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.45))", animation: endStatus === "completed" ? "lg-cheer 900ms ease-in-out infinite" : "float-y 3.2s ease-in-out infinite" }} />
          <div role="status" style={{ fontFamily: TEXT_DISPLAY, fontSize: 30, fontWeight: 800, color: "#fff4dc", textAlign: "center", textShadow: "0 3px 0 #4a2508, 0 0 18px rgba(255,200,90,0.7)", WebkitTextStroke: "1.5px #4a2508", paintOrder: "stroke fill", lineHeight: 1.15 }}>
            {endStatus === "time-up" ? COPY.timeUp : correctCount === ROUNDS.length ? COPY.allDone : COPY.finished}
          </div>
          <div style={{ ...bubbleStyle, width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 16 }}>
            <Stat label="Score" value={`${score}`} />
            <Stat label="Levels completed" value={`${records.length} / ${ROUNDS.length}`} />
            <Stat label="Odd ones found" value={`${correctCount}`} />
            <Stat label="Accuracy" value={`${records.length ? Math.round((correctCount / records.length) * 100) : 0}%`} />
            <Stat label="Best streak" value={`${buildOutcome({ sessionId: "", status: "completed", ageBand, startedAt: "", rounds: records, timeUsedMs: 0 }).metrics.bestStreak}`} />
          </div>
          <div style={{ display: "flex", gap: 12, width: "100%", marginTop: 4 }}>
            <button type="button" className="tap-scale" onClick={start} style={{ ...secondaryStyle, flex: 1 }}>
              Play Again
            </button>
            <button type="button" className="tap-scale" onClick={onExit} style={{ ...ctaStyle, flex: 1 }}>
              Finish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: TEXT_DISPLAY, fontWeight: 800, fontSize: 24 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#6a5a40" }}>{label}</div>
    </div>
  );
}

const CONFETTI = ["#ffd23f", "#ff9a3c", "#5ec8ff", "#b38cff", "#7fdc8c", "#ffffff"];
function Confetti() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {Array.from({ length: 24 }, (_, i) => (
        <div key={i} style={{ position: "absolute", top: -16, left: `${(i * 4.3 + 2) % 100}%`, width: 8, height: 12, borderRadius: 2, background: CONFETTI[i % CONFETTI.length], animation: `confetti-fall ${1500 + (i % 5) * 200}ms ease-in ${(i % 8) * 0.13}s both` }} />
      ))}
    </div>
  );
}

const TEXT_DISPLAY = "var(--font-display), var(--font-body), system-ui";

const sceneStyle: React.CSSProperties = {
  position: "relative",
  width: PLAY_AREA.width,
  height: PLAY_AREA.height,
  overflow: "hidden",
  background: "#0a1a5a",
  fontFamily: "var(--font-body), system-ui",
  userSelect: "none",
  WebkitUserSelect: "none",
};

const chipStyle: React.CSSProperties = {
  height: 40,
  padding: "0 12px",
  borderRadius: 10,
  background: "rgba(8,16,52,0.72)",
  border: "1.5px solid rgba(190,210,255,0.35)",
  color: "#fff4dc",
  fontWeight: 800,
  fontSize: 17,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  fontVariantNumeric: "tabular-nums",
  boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
};
const chipLabel: React.CSSProperties = { fontSize: 10.5, letterSpacing: 1.4, color: "rgba(220,230,255,0.75)" };

const titleSignText: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  margin: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  paddingBottom: 6,
  fontFamily: TEXT_DISPLAY,
  fontSize: 38,
  fontWeight: 800,
  color: "#fff4dc",
  WebkitTextStroke: "2px #4a2508",
  paintOrder: "stroke fill",
  textShadow: "0 3px 0 #4a2508, 0 5px 8px rgba(30,12,0,0.55)",
  transform: "rotate(-2deg)",
};

const bubbleStyle: React.CSSProperties = {
  position: "relative",
  background: "#fffaf0",
  border: "2px solid #e0c58c",
  borderRadius: 16,
  padding: "12px 16px",
  color: "#2d2414",
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1.4,
  textAlign: "center",
  boxShadow: "0 8px 20px rgba(0,0,0,0.45)",
};
const bubbleTail: React.CSSProperties = { position: "absolute", top: -9, left: "50%", marginLeft: -9, width: 18, height: 18, background: "#fffaf0", transform: "rotate(45deg)", borderLeft: "2px solid #e0c58c", borderTop: "2px solid #e0c58c" };

// simple, flat, text-only CTAs
const ctaStyle: React.CSSProperties = {
  minHeight: 52,
  padding: "0 22px",
  border: "none",
  borderRadius: 14,
  background: "#f2a531",
  color: "#2a1700",
  fontSize: 19,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 3px 8px rgba(0,0,0,0.3)",
};
const secondaryStyle: React.CSSProperties = {
  minHeight: 48,
  padding: "0 18px",
  border: "2px solid #f2a531",
  borderRadius: 14,
  background: "rgba(8,16,52,0.75)",
  color: "#ffe2b0",
  fontSize: 16,
  fontWeight: 800,
  cursor: "pointer",
};
