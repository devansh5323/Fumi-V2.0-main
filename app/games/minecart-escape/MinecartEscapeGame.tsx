"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgeBand, Cell, GameOutcome, RoundResult, RoundSpec } from "./types";
import {
  ASSETS,
  INSTRUCTION,
  LIVES,
  LOADING_MS,
  OUT_OF_LIVES_LINE,
  PASS_WORDS,
  PLAY_AREA,
  REWARDS,
  ROUND_END_LINE,
  ROUNDS,
  SAFE_AREA_TOP,
  TRY_AGAIN_LINE,
  WORD_COLORS,
  foundLine,
} from "./config";
import { generatePuzzle, matchWord, shuffledColors } from "./engine/wordsearch";
import { computeGameOutcome } from "./engine/metrics";
import { WordGrid, type FoundMark, type SelectOutcome } from "./components/WordGrid";
import { FumiCart, INK, MiniCart, MineBackdrop, Plank, TEXT_DISPLAY, WoodFramePanel, playButtonStyle, secondaryButtonStyle } from "./components/MineArt";
import { recordAccessory, reportGame } from "./lib/sessionReporter";

// start -> intro (Fumi + instruction) -> [loading -> play (timer runs only
// here) -> round end: Fumi says "You found X words!" + "Track Cleared!"
// (5+ words) or "Try Again" (fewer: lose a life, replay the round); then
// Fumi leaves and "Round N" + Start appears] x 3 -> final metrics.
// Losing the last life ends the game early with the metrics so far.
type Next = { kind: "round"; round: number; retry: boolean } | { kind: "final"; outOfLives: boolean };
type Screen =
  | { kind: "start" }
  | { kind: "intro"; round: number }
  | { kind: "play"; round: number; attempt: number }
  | { kind: "result"; result: RoundResult; livesBefore: number; livesAfter: number; next: Next }
  | { kind: "final" };

function generateSeed(): string {
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export type MinecartEscapeGameProps = {
  ageBand: AgeBand;
  seed?: string;
  onExit: () => void;
};

export function MinecartEscapeGame({ ageBand, seed, onExit }: MinecartEscapeGameProps) {
  const [sessionSeed] = useState(() => seed ?? generateSeed());
  const [game, setGame] = useState(0); // bumps on Play Again
  const [screen, setScreen] = useState<Screen>({ kind: "start" });
  const [attempts, setAttempts] = useState<RoundResult[]>([]);
  const [lives, setLives] = useState(LIVES);
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);
  const [veil, setVeil] = useState(0);

  const go = useCallback((next: Screen) => {
    setVeil(1);
    setTimeout(() => {
      setScreen(next);
      setTimeout(() => setVeil(0), 120);
    }, 320);
  }, []);

  const handleRoundDone = useCallback(
    (r: RoundResult) => {
      const livesAfter = r.passed ? lives : lives - 1;
      const next: Next = !r.passed
        ? livesAfter <= 0
          ? { kind: "final", outOfLives: true }
          : { kind: "round", round: r.round, retry: true }
        : r.round < ROUNDS.length
          ? { kind: "round", round: r.round + 1, retry: false }
          : { kind: "final", outOfLives: false };
      const all = [...attempts, r];
      setAttempts(all);
      setLives(livesAfter);
      // Save as soon as the game is over — not only on "Claim Rewards".
      if (next.kind === "final") {
        const o = computeGameOutcome(ageBand, all, livesAfter);
        reportGame(o);
        setOutcome(o);
      }
      go({ kind: "result", result: r, livesBefore: lives, livesAfter, next });
    },
    [go, lives, attempts, ageBand]
  );

  const handleNext = useCallback(
    (next: Next) => {
      if (next.kind === "final") go({ kind: "final" });
      else go({ kind: "play", round: next.round, attempt: attempts.filter((a) => a.round === next.round).length + 1 });
    },
    [go, attempts]
  );

  const playAgain = useCallback(() => {
    setGame((g) => g + 1);
    setAttempts([]);
    setLives(LIVES);
    setOutcome(null);
    go({ kind: "intro", round: 1 });
  }, [go]);

  let content: React.ReactNode = null;
  if (screen.kind === "start") content = <StartScreen onPlay={() => go({ kind: "intro", round: 1 })} />;
  else if (screen.kind === "intro") content = <RoundIntro spec={ROUNDS[screen.round - 1]} onStart={() => go({ kind: "play", round: screen.round, attempt: 1 })} />;
  else if (screen.kind === "play")
    content = (
      <RoundPlay
        key={`${game}-${screen.round}-${screen.attempt}`}
        spec={ROUNDS[screen.round - 1]}
        attempt={screen.attempt}
        lives={lives}
        seed={`${sessionSeed}-g${game}-r${screen.round}-t${screen.attempt}`}
        onDone={handleRoundDone}
        onExit={onExit}
      />
    );
  else if (screen.kind === "result")
    content = <RoundEndScreen key={`${screen.result.round}-${screen.result.attempt}`} result={screen.result} livesBefore={screen.livesBefore} livesAfter={screen.livesAfter} next={screen.next} onNext={() => handleNext(screen.next)} />;
  else if (screen.kind === "final" && outcome) content = <FinalScreen outcome={outcome} onPlayAgain={playAgain} onFinish={onExit} />;

  return (
    <div style={sceneStyle}>
      {content}
      <div style={{ position: "absolute", inset: 0, zIndex: 200, background: "#0b0c1c", opacity: veil, transition: "opacity 320ms ease", pointerEvents: veil ? "auto" : "none" }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Title + round intro
// ---------------------------------------------------------------------------

function StartScreen({ onPlay }: { onPlay: () => void }) {
  return (
    <>
      <MineBackdrop />
      <div style={{ position: "absolute", top: SAFE_AREA_TOP + 26, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ position: "relative", width: 350, animation: "bubble-pop 500ms var(--ease-pop) both" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.titlePlank} alt="" style={{ width: 350, height: "auto", display: "block", filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.5))" }} />
          <h1 style={titleSignText}>Minecart Escape</h1>
        </div>
        <div style={{ marginTop: 30 }}>
          <FumiCart size={170} />
        </div>
      </div>
      <button type="button" className="tap-scale" onClick={onPlay} style={{ ...playButtonStyle, position: "absolute", bottom: 60, left: "50%", marginLeft: -110, width: 220, fontSize: 28 }}>
        Play
      </button>
    </>
  );
}

// Before each round: Fumi front and centre with the round's theme and the
// sheet's instruction.
function RoundIntro({ spec, onStart }: { spec: RoundSpec; onStart: () => void }) {
  return (
    <>
      <MineBackdrop dim={0.25} />
      <div style={{ position: "absolute", top: SAFE_AREA_TOP + 14, left: 16, right: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
        <div style={{ zIndex: 2, marginBottom: -6, animation: "bubble-pop 400ms var(--ease-pop) both" }}>
          <Plank>ROUND {spec.round}</Plank>
        </div>
        <WoodFramePanel style={{ width: "100%", animation: "bubble-pop 450ms var(--ease-pop) 80ms both" }}>
          <div style={{ padding: "14px 12px 10px", textAlign: "center" }}>
            <div style={{ fontFamily: TEXT_DISPLAY, fontWeight: 800, fontSize: 26, color: INK, lineHeight: 1.1 }}>{spec.title}</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#5a3a1a", marginTop: 4 }}>{spec.description}</div>
          </div>
        </WoodFramePanel>
      </div>

      <div style={{ position: "absolute", top: 210, left: 0, right: 0, display: "flex", justifyContent: "center", animation: "bubble-pop 500ms var(--ease-pop) 160ms both" }}>
        <FumiCart size={190} />
      </div>

      <div style={{ position: "absolute", top: 428, left: 24, right: 24, display: "flex", justifyContent: "center", animation: "bubble-pop 500ms var(--ease-pop) 260ms both" }}>
        <div style={speechStyle}>
          {INSTRUCTION}
          <div style={{ position: "absolute", top: -9, left: "50%", marginLeft: -9, width: 18, height: 18, background: "#fffaf0", transform: "rotate(45deg)", borderLeft: "2px solid #c9a265", borderTop: "2px solid #c9a265" }} />
        </div>
      </div>


      <button type="button" className="tap-scale" onClick={onStart} style={{ ...playButtonStyle, position: "absolute", bottom: 54, left: 60, right: 60 }}>
        Start Round {spec.round}
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Playing a round
// ---------------------------------------------------------------------------

type Toast = { text: string; tone: "good" | "bad"; key: number };

function RoundPlay({ spec, attempt, lives, seed, onDone, onExit }: { spec: RoundSpec; attempt: number; lives: number; seed: string; onDone: (r: RoundResult) => void; onExit: () => void }) {
  const puzzle = useMemo(() => generatePuzzle(spec.words, spec.gridSize, seed), [spec, seed]);
  const colorOrder = useMemo(() => shuffledColors(WORD_COLORS.length, `${seed}-colors`), [seed]);
  const targets = useMemo(() => puzzle.placements.map((p) => p.word), [puzzle]);

  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [found, setFound] = useState<(FoundMark & { foundAtMs: number })[]>([]);
  const [remaining, setRemaining] = useState(spec.timeLimitMs);
  const [ended, setEnded] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const elapsedRef = useRef(0);
  const invalidRef = useRef(0);
  const repeatRef = useRef(0);
  const endedRef = useRef(false);
  const foundRef = useRef(found);
  useEffect(() => {
    foundRef.current = found;
  }, [found]);

  // "Building the mine…" — the grid (and timer) appear after this.
  useEffect(() => {
    const id = setTimeout(() => setLoading(false), LOADING_MS);
    return () => clearTimeout(id);
  }, []);

  const finish = useCallback(
    (end: RoundResult["end"]) => {
      if (endedRef.current) return;
      endedRef.current = true;
      setEnded(true);
      const timeTaken = Math.min(spec.timeLimitMs, Math.round(elapsedRef.current));
      const f = foundRef.current;
      const result: RoundResult = {
        round: spec.round,
        attempt,
        passed: f.length >= PASS_WORDS,
        title: spec.title,
        gridSize: spec.gridSize,
        timeLimitMs: spec.timeLimitMs,
        wordsTotal: targets.length,
        found: f.map((x) => ({ word: x.word, foundAtMs: x.foundAtMs, colorIndex: x.colorIndex })),
        wordsFound: f.length,
        missedWords: targets.filter((w) => !f.some((x) => x.word === w)),
        invalidSelections: invalidRef.current,
        repeatSelections: repeatRef.current,
        timeTakenMs: timeTaken,
        timeRemainingMs: Math.max(0, spec.timeLimitMs - timeTaken),
        end,
      };
      setTimeout(() => onDone(result), end === "all-found" ? 900 : 700);
    },
    [spec, attempt, targets, onDone]
  );

  // The countdown: runs only while the grid is visible, unpaused and live.
  useEffect(() => {
    if (loading || paused || ended) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      elapsedRef.current += now - last;
      last = now;
      const left = Math.max(0, spec.timeLimitMs - elapsedRef.current);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        finish("time-up");
      }
    }, 100);
    return () => clearInterval(id);
  }, [loading, paused, ended, spec.timeLimitMs, finish]);

  const showToast = (text: string, tone: Toast["tone"]) => setToast({ text, tone, key: Date.now() });

  const handleSelect = (cells: Cell[]): SelectOutcome => {
    if (endedRef.current || cells.length < 2) return "short";
    const foundWords = foundRef.current.map((f) => f.word);
    const unfound = targets.filter((w) => !foundWords.includes(w));
    const word = matchWord(cells, puzzle.grid, unfound);
    if (word) {
      const next = [...foundRef.current, { word, cells, colorIndex: colorOrder[foundRef.current.length % colorOrder.length], foundAtMs: Math.round(elapsedRef.current) }];
      foundRef.current = next;
      setFound(next);
      showToast(`${word} ✓`, "good");
      if (next.length >= targets.length) finish("all-found");
      return "found";
    }
    if (matchWord(cells, puzzle.grid, foundWords)) {
      repeatRef.current += 1;
      showToast("Already found!", "bad");
      return "repeat";
    }
    invalidRef.current += 1;
    showToast("Not a hidden word — try again!", "bad");
    return "invalid";
  };

  const boardPx = 340;
  return (
    <>
      <MineBackdrop />
      {/* ---- header: Fumi cart, round plank, theme banner, pause ---- */}
      <div style={{ position: "absolute", left: 2, top: SAFE_AREA_TOP - 4, zIndex: 5 }}>
        <FumiCart size={94} />
      </div>
      <div style={{ position: "absolute", left: 108, right: 50, top: SAFE_AREA_TOP + 2, display: "flex", flexDirection: "column", alignItems: "center", zIndex: 4 }}>
        <div style={{ zIndex: 2, marginBottom: -6 }}>
          <Plank width={112}>ROUND {spec.round}</Plank>
        </div>
        <WoodFramePanel style={{ width: "100%" }}>
          <div style={{ padding: "8px 8px 6px", textAlign: "center" }}>
            <div style={{ fontFamily: TEXT_DISPLAY, fontWeight: 800, fontSize: 19, color: INK, lineHeight: 1.1 }}>{spec.title}</div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: "#5a3a1a", marginTop: 2, lineHeight: 1.25 }}>{spec.description}</div>
          </div>
        </WoodFramePanel>
      </div>
      <button type="button" className="tap-scale" aria-label={paused ? "Resume" : "Pause"} onClick={() => setPaused((p) => !p)} disabled={loading || ended} style={{ position: "absolute", right: 6, top: SAFE_AREA_TOP + 8, width: 42, height: 42, padding: 0, border: "none", background: "none", cursor: "pointer", zIndex: 6 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ASSETS.pause} alt="" style={{ width: 42, height: 42 }} />
      </button>

      {/* ---- progress row: timer, carts, found count ---- */}
      <div style={{ position: "absolute", left: 8, right: 8, top: 146, height: 28, display: "flex", gap: 6, zIndex: 4 }}>
        <div aria-label={`Time left ${mmss(remaining)}`} role="timer" style={{ ...stripChip, width: 74, color: remaining <= 30_000 ? "#ff8f84" : "#fff4dc", animation: remaining <= 10_000 && !ended && !loading ? "glow-pulse 1s ease-in-out infinite" : undefined }}>
          ⏱ {mmss(remaining)}
        </div>
        <div role="progressbar" aria-label="Words found" aria-valuemin={0} aria-valuemax={targets.length} aria-valuenow={found.length} style={{ ...stripChip, flex: 1, justifyContent: "space-between", padding: "0 4px", gap: 0 }}>
          {targets.map((_, i) => (
            <MiniCart key={i} full={i < found.length} />
          ))}
        </div>
        <div style={{ ...stripChip, width: 66, padding: 0 }}>
          <Hearts lives={lives} size={14} />
        </div>
      </div>

      {/* ---- the grid ---- */}
      <div style={{ position: "absolute", left: (PLAY_AREA.width - (boardPx + 28)) / 2, top: 180, zIndex: 3 }}>
        {loading ? (
          <div style={{ width: boardPx + 28, height: boardPx + 28, borderRadius: 14, background: "rgba(20,14,8,0.85)", border: "2px solid #4a2a10", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#f2e3c4", fontWeight: 800 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", border: "4px solid rgba(255,214,90,0.25)", borderTopColor: "#ffd65a", animation: "mw-spin 800ms linear infinite" }} />
            Building the mine…
          </div>
        ) : (
          <WordGrid puzzle={puzzle} found={found} disabled={paused || ended} boardPx={boardPx} onSelect={handleSelect} />
        )}
      </div>

      {toast && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 530, display: "flex", justifyContent: "center", zIndex: 8, pointerEvents: "none" }}>
          <div key={toast.key} role="status" onAnimationEnd={() => setToast(null)} style={{ padding: "5px 14px", borderRadius: 999, fontWeight: 800, fontSize: 13, color: "#fff", background: toast.tone === "good" ? "#2fa84f" : "#d6453a", border: "2px solid #fff", boxShadow: "0 4px 12px rgba(0,0,0,0.5)", animation: "mw-toast 1100ms ease-out both" }}>
            {toast.text}
          </div>
        </div>
      )}

      {/* ---- found panel ---- */}
      <WoodFramePanel style={{ position: "absolute", left: 8, right: 8, top: 556, height: 128, zIndex: 3 }}>
        <div style={{ padding: "7px 10px" }}>
          <div style={{ fontFamily: TEXT_DISPLAY, fontWeight: 800, fontSize: 15, color: INK, marginBottom: 6 }}>Found:</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {spec.words.map((label, i) => {
              const f = found.find((x) => x.word === targets[i]);
              return (
                <div
                  key={label}
                  aria-label={f ? `${label}, found` : `${label}, not found yet`}
                  style={{
                    height: 26,
                    borderRadius: 999,
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: 0.2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    ...(f
                      ? { background: WORD_COLORS[f.colorIndex], color: "#fff", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 4px rgba(0,0,0,0.3)", animation: "mw-pop 320ms var(--ease-pop) both" }
                      : { background: "rgba(120,80,30,0.1)", color: "rgba(90,58,26,0.42)", border: "1.5px dashed rgba(120,80,30,0.35)" }),
                  }}
                >
                  {label.toUpperCase()}
                  {f && " ✓"}
                </div>
              );
            })}
          </div>
        </div>
      </WoodFramePanel>

      {paused && (
        <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(8,8,20,0.88)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <WoodFramePanel style={{ width: 260 }}>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, textAlign: "center" }}>
              <div style={{ fontFamily: TEXT_DISPLAY, fontWeight: 800, fontSize: 22, color: INK }}>Paused</div>
              <div style={{ fontSize: 12.5, color: "#5a3a1a", fontWeight: 600 }}>The timer is stopped.</div>
              <button type="button" className="tap-scale" onClick={() => setPaused(false)} style={playButtonStyle}>
                Resume
              </button>
              <button type="button" className="tap-scale" onClick={onExit} style={{ ...secondaryButtonStyle, background: "#6e421d" }}>
                Exit
              </button>
            </div>
          </WoodFramePanel>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Round result + final summary
// ---------------------------------------------------------------------------

const CONFETTI = ["#ffd23a", "#7b3fc9", "#2fa84f", "#1f6fd1", "#e2701b", "#d63c79"];

function Confetti() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {Array.from({ length: 22 }, (_, i) => (
        <div key={i} style={{ position: "absolute", top: -16, left: `${(i * 4.6 + 3) % 100}%`, width: 8, height: 12, borderRadius: 2, background: CONFETTI[i % CONFETTI.length], animation: `confetti-fall ${1400 + (i % 5) * 180}ms ease-in ${(i % 7) * 0.12}s both` }} />
      ))}
    </div>
  );
}

// Round end, in two beats: Fumi says "You found X words!" and then "Track
// Cleared!" or "Try Again" (a heart is lost). Then Fumi leaves and the next
// step appears: "Round N" + Start (or the results once the game is over).
function RoundEndScreen({ result, livesBefore, livesAfter, next, onNext }: { result: RoundResult; livesBefore: number; livesAfter: number; next: Next; onNext: () => void }) {
  const [beat, setBeat] = useState<"fumi" | "next">("fumi");
  useEffect(() => {
    const id = setTimeout(() => setBeat("next"), 3000);
    return () => clearTimeout(id);
  }, []);
  const passed = result.passed;
  const nextSpec = next.kind === "round" ? ROUNDS[next.round - 1] : null;
  return (
    <>
      <MineBackdrop dim={0.3} />
      {passed && <Confetti />}
      <div style={{ position: "absolute", top: SAFE_AREA_TOP + 10, right: 14 }}>
        <Hearts lives={livesAfter} losing={livesBefore > livesAfter ? livesAfter : undefined} size={22} />
      </div>

      {/* beat 1: Fumi */}
      <div aria-hidden={beat !== "fumi"} style={{ position: "absolute", inset: 0, opacity: beat === "fumi" ? 1 : 0, transform: beat === "fumi" ? "none" : "translateY(-24px) scale(0.92)", transition: "opacity 450ms ease, transform 450ms ease", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: 96, left: 20, right: 20, display: "flex", justifyContent: "center", animation: "bubble-pop 420ms var(--ease-pop) both" }}>
          <div role="status" style={{ ...speechStyle, fontFamily: TEXT_DISPLAY, padding: "12px 22px" }}>
            <div style={{ fontSize: 20 }}>{foundLine(result.wordsFound)}</div>
            <div style={{ fontSize: 28, marginTop: 4, color: passed ? "#2a7a3a" : "#c0392b", animation: "bubble-pop 420ms var(--ease-pop) 700ms both" }}>{passed ? ROUND_END_LINE : TRY_AGAIN_LINE}</div>
            <div style={{ position: "absolute", bottom: -9, left: "50%", marginLeft: -9, width: 18, height: 18, background: "#fffaf0", transform: "rotate(45deg)", borderRight: "2px solid #c9a265", borderBottom: "2px solid #c9a265" }} />
          </div>
        </div>
        <div style={{ position: "absolute", top: 262, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <FumiCart size={190} motion={passed ? "bounce" : "float"} />
        </div>
      </div>

      {/* beat 2: what comes next */}
      {beat === "next" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: "0 28px", animation: "bubble-pop 450ms var(--ease-pop) both" }}>
          {nextSpec ? (
            <>
              <div style={bigRoundText}>Round {nextSpec.round}</div>
              <WoodFramePanel style={{ width: "100%" }}>
                <div style={{ padding: "12px 12px 10px", textAlign: "center" }}>
                  <div style={{ fontFamily: TEXT_DISPLAY, fontWeight: 800, fontSize: 22, color: INK, lineHeight: 1.1 }}>{nextSpec.title}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#5a3a1a", marginTop: 4 }}>{nextSpec.description}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#7a5528", marginTop: 8 }}>{INSTRUCTION}</div>
                </div>
              </WoodFramePanel>
            </>
          ) : (
            <div style={{ ...bigRoundText, fontSize: next.kind === "final" && next.outOfLives ? 44 : 40, textAlign: "center" }}>{next.kind === "final" && next.outOfLives ? OUT_OF_LIVES_LINE : "Mine Escaped!"}</div>
          )}
          <button type="button" className="tap-scale" onClick={onNext} style={{ ...playButtonStyle, width: 230, marginTop: 10 }}>
            {nextSpec ? "Start" : "See Results"}
          </button>
        </div>
      )}
    </>
  );
}

function Hearts({ lives, losing, size }: { lives: number; losing?: number; size: number }) {
  return (
    <div role="img" aria-label={`${lives} of ${LIVES} lives left`} style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: LIVES }, (_, i) => {
        const full = i < lives;
        const breaking = i === losing;
        return (
          <span
            key={i}
            style={{
              fontSize: size,
              lineHeight: 1,
              filter: full ? "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" : "grayscale(1)",
              opacity: full ? 1 : 0.3,
              animation: breaking ? "mw-heart-lose 900ms ease-out 900ms both" : undefined,
            }}
          >
            ❤️
          </span>
        );
      })}
    </div>
  );
}

function FinalScreen({ outcome, onPlayAgain, onFinish }: { outcome: GameOutcome; onPlayAgain: () => void; onFinish: () => void }) {
  const { metrics: m, rewards } = outcome;
  const [chosen, setChosen] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);
  // The game itself was saved when it ended; this adds the accessory.
  const claim = () => {
    recordAccessory(chosen);
    setClaimed(true);
  };
  return (
    <>
      <MineBackdrop dim={0.35} />
      <Confetti />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: `${SAFE_AREA_TOP + 4}px 14px 18px`, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <FumiCart size={92} motion="still" />
          <div style={{ fontFamily: TEXT_DISPLAY, fontWeight: 800, fontSize: 23, color: "#ffe08a", textShadow: "0 2px 8px rgba(0,0,0,0.7)", lineHeight: 1.15 }}>
            {outcome.completed ? "Mine Escaped!" : OUT_OF_LIVES_LINE}
            <div style={{ fontSize: 13, color: "#f2e3c4", fontWeight: 700 }}>
              {outcome.completed ? "All 3 tracks cleared" : `${m.roundsCleared} of ${ROUNDS.length} tracks cleared`}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }} aria-label={`${outcome.starsEarned} of 3 stars`}>
          {[1, 2, 3].map((s) => (
            // Dim on a wrapper: star-pop animates opacity, which would override it.
            <span key={s} style={{ opacity: s <= outcome.starsEarned ? 1 : 0.25, filter: s <= outcome.starsEarned ? undefined : "grayscale(1)" }}>
              <span style={{ display: "inline-block", fontSize: 24, animation: `star-pop 420ms ease-out ${s * 0.12}s both` }}>⭐</span>
            </span>
          ))}
        </div>
        <WoodFramePanel style={{ width: "100%" }}>
          <div style={{ padding: "8px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1.5px dashed rgba(120,80,30,0.4)", paddingBottom: 6, marginBottom: 4 }}>
              <span style={{ fontFamily: TEXT_DISPLAY, fontWeight: 800, color: INK, fontSize: 15 }}>Words found</span>
              <span style={{ fontFamily: TEXT_DISPLAY, fontWeight: 800, color: INK, fontSize: 22 }}>
                {m.totalWordsFound} / {m.totalWords}
              </span>
            </div>
            {ROUNDS.map((spec) => {
              const r = m.byRound.find((x) => x.round === spec.round);
              return (
                <div key={spec.round} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", fontSize: 12.5, color: r ? "#4a2e12" : "rgba(74,46,18,0.45)", fontWeight: 700 }}>
                  <span style={{ width: 62, fontWeight: 800 }}>Round {spec.round}</span>
                  <span style={{ flex: 1 }}>
                    {spec.title}
                    {r && r.attempts > 1 && <span style={{ fontSize: 10.5, color: "#7a5528" }}> · {r.attempts} tries</span>}
                  </span>
                  <span style={{ width: 44, textAlign: "right" }}>{r ? `${r.wordsFound}/${r.wordsTotal}` : "—"}</span>
                  <span style={{ width: 42, textAlign: "right", color: "#7a5528" }}>{r ? mmss(r.timeTakenMs) : "—"}</span>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1.5px dashed rgba(120,80,30,0.4)", paddingTop: 5, marginTop: 4, fontSize: 12.5, fontWeight: 800, color: INK }}>
              <span>Total time</span>
              <span>{mmss(m.totalTimeMs)}</span>
            </div>
          </div>
        </WoodFramePanel>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          <RewardPill icon="✨" label={`+${rewards.xp} XP`} />
          <RewardPill icon="🪙" label={`+${rewards.coins}`} />
          <RewardPill icon="💎" label={`${rewards.gems} ${rewards.collectible}`} />
        </div>
        <div style={{ width: "100%" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#f2e3c4", textAlign: "center", marginBottom: 5 }}>{claimed ? "Accessory unlocked!" : "Choose 1 accessory"}</div>
          <div role="radiogroup" aria-label="Choose an accessory" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {REWARDS.accessoryChoices.map((name) => {
              const on = chosen === name;
              return (
                <button key={name} type="button" role="radio" aria-checked={on} className="tap-scale" onClick={() => !claimed && setChosen(name)} disabled={claimed && !on} style={{ minHeight: 40, borderRadius: 10, border: on ? "2px solid #7fd34e" : "1px solid rgba(255,220,160,0.4)", background: on ? "rgba(76,195,90,0.3)" : "rgba(40,24,10,0.8)", color: "#fff", fontSize: 11.5, fontWeight: 800, cursor: claimed ? "default" : "pointer", opacity: claimed && !on ? 0.35 : 1 }}>
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
            <button type="button" className="tap-scale" onClick={onFinish} style={{ ...playButtonStyle, flex: 1, fontSize: 18, minHeight: 48 }}>
              Finish
            </button>
          </div>
        ) : (
          <button type="button" className="tap-scale" onClick={claim} disabled={chosen === null} style={{ ...playButtonStyle, width: "100%", fontSize: 18, minHeight: 48, opacity: chosen === null ? 0.45 : 1 }}>
            Claim Rewards
          </button>
        )}
      </div>
    </>
  );
}

function RewardPill({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(40,24,10,0.85)", border: "1px solid rgba(255,220,160,0.45)", borderRadius: 999, padding: "4px 11px", fontSize: 12, fontWeight: 800, color: "#fff" }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      {label}
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
  background: "#0b0c1c",
  fontFamily: "var(--font-body), system-ui",
  userSelect: "none",
  WebkitUserSelect: "none",
};

const titleSignText: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  margin: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  paddingBottom: 6,
  fontFamily: TEXT_DISPLAY,
  fontSize: 34,
  fontWeight: 800,
  color: "#fff4dc",
  WebkitTextStroke: "2px #4a2508",
  paintOrder: "stroke fill",
  textShadow: "0 3px 0 #4a2508, 0 5px 8px rgba(30,12,0,0.55)",
  transform: "rotate(-2deg)",
};

const bigRoundText: React.CSSProperties = {
  fontFamily: TEXT_DISPLAY,
  fontSize: 52,
  fontWeight: 800,
  color: "#fff4dc",
  WebkitTextStroke: "2px #4a2508",
  paintOrder: "stroke fill",
  textShadow: "0 4px 0 #4a2508, 0 8px 16px rgba(0,0,0,0.6)",
  lineHeight: 1.05,
};

const speechStyle: React.CSSProperties = {
  position: "relative",
  background: "#fffaf0",
  border: "2px solid #c9a265",
  borderRadius: 16,
  padding: "12px 16px",
  color: INK,
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1.35,
  textAlign: "center",
  boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
};

const stripChip: React.CSSProperties = {
  height: 28,
  borderRadius: 8,
  background: "linear-gradient(180deg, #2c2118 0%, #1c140d 100%)",
  border: "2px solid #8d5a2b",
  boxShadow: "inset 0 1px 0 rgba(255,220,170,0.2), 0 3px 8px rgba(0,0,0,0.5)",
  color: "#fff4dc",
  fontWeight: 800,
  fontSize: 12.5,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  fontVariantNumeric: "tabular-nums",
};
