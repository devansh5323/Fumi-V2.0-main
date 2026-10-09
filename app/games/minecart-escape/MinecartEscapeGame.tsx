"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgeBand, Cell, GameOutcome, RoundResult, RoundSpec } from "./types";
import {
  ALL_FOUND_HINGLISH,
  ASSETS,
  INSTRUCTION,
  LOADING_MS,
  PLAY_AREA,
  REWARDS,
  ROUND_END_LINE,
  ROUNDS,
  SAFE_AREA_TOP,
  WORD_COLORS,
  timeUpHinglish,
} from "./config";
import { generatePuzzle, matchWord, shuffledColors } from "./engine/wordsearch";
import { computeGameOutcome } from "./engine/metrics";
import { WordGrid, type FoundMark, type SelectOutcome } from "./components/WordGrid";
import { FumiCart, INK, MiniCart, MineBackdrop, Plank, TEXT_DISPLAY, WoodFramePanel, playButtonStyle, secondaryButtonStyle } from "./components/MineArt";
import { reportGame } from "./lib/sessionReporter";

// start -> for each of the 3 rounds: intro (Fumi + instruction) -> loading
// -> play (timer runs only here) -> result (Fumi: "Track Cleared!") ->
// final summary across all rounds (+ rewards).
type Screen = { kind: "start" } | { kind: "intro"; round: number } | { kind: "play"; round: number } | { kind: "result"; round: number } | { kind: "final" };

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
  const [attempt, setAttempt] = useState(0);
  const [screen, setScreen] = useState<Screen>({ kind: "start" });
  const [results, setResults] = useState<RoundResult[]>([]);
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
      setResults((prev) => [...prev.filter((x) => x.round !== r.round), r]);
      go({ kind: "result", round: r.round });
    },
    [go]
  );

  const handleContinue = useCallback(
    (round: number) => {
      if (round < ROUNDS.length) go({ kind: "intro", round: round + 1 });
      else {
        setOutcome(computeGameOutcome(ageBand, results));
        go({ kind: "final" });
      }
    },
    [go, ageBand, results]
  );

  const playAgain = useCallback(() => {
    setAttempt((a) => a + 1);
    setResults([]);
    setOutcome(null);
    go({ kind: "intro", round: 1 });
  }, [go]);

  let content: React.ReactNode = null;
  if (screen.kind === "start") content = <StartScreen onPlay={() => go({ kind: "intro", round: 1 })} />;
  else if (screen.kind === "intro") content = <RoundIntro spec={ROUNDS[screen.round - 1]} onStart={() => go({ kind: "play", round: screen.round })} />;
  else if (screen.kind === "play")
    content = <RoundPlay key={`${attempt}-${screen.round}`} spec={ROUNDS[screen.round - 1]} seed={`${sessionSeed}-a${attempt}-r${screen.round}`} onDone={handleRoundDone} onExit={onExit} />;
  else if (screen.kind === "result") {
    const r = results.find((x) => x.round === screen.round);
    if (r) content = <RoundResultScreen result={r} isLast={screen.round === ROUNDS.length} onContinue={() => handleContinue(screen.round)} />;
  } else if (screen.kind === "final" && outcome) content = <FinalScreen outcome={outcome} onPlayAgain={playAgain} onFinish={onExit} />;

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

      <div style={{ position: "absolute", top: 530, left: 0, right: 0, textAlign: "center", color: "#f2e3c4", fontSize: 13, fontWeight: 700 }}>
        {spec.words.length} words · {spec.gridSize}×{spec.gridSize} grid · {mmss(spec.timeLimitMs)}
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

function RoundPlay({ spec, seed, onDone, onExit }: { spec: RoundSpec; seed: string; onDone: (r: RoundResult) => void; onExit: () => void }) {
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
    [spec, targets, onDone]
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
        <div aria-label={`Time left ${mmss(remaining)}`} role="timer" style={{ ...stripChip, width: 78, color: remaining <= 30_000 ? "#ff8f84" : "#fff4dc", animation: remaining <= 10_000 && !ended && !loading ? "glow-pulse 1s ease-in-out infinite" : undefined }}>
          ⏱ {mmss(remaining)}
        </div>
        <div role="progressbar" aria-label="Words found" aria-valuemin={0} aria-valuemax={targets.length} aria-valuenow={found.length} style={{ ...stripChip, flex: 1, justifyContent: "space-between", padding: "0 6px" }}>
          {targets.map((_, i) => (
            <MiniCart key={i} full={i < found.length} />
          ))}
        </div>
        <div style={{ ...stripChip, width: 80, whiteSpace: "nowrap", fontSize: 11.5 }}>
          {found.length} / {targets.length} found
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
            {targets.map((_, i) => {
              const f = found[i];
              return f ? (
                <div key={i} style={{ height: 26, borderRadius: 999, background: WORD_COLORS[f.colorIndex], color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 2, letterSpacing: 0.2, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 4px rgba(0,0,0,0.3)", animation: "mw-pop 320ms var(--ease-pop) both", whiteSpace: "nowrap", overflow: "hidden" }}>
                  {f.word} ✓
                </div>
              ) : (
                <div key={i} aria-label="Word not found yet" style={{ height: 26, borderRadius: 999, border: "1.5px dashed rgba(120,80,30,0.45)" }} />
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

function RoundResultScreen({ result, isLast, onContinue }: { result: RoundResult; isLast: boolean; onContinue: () => void }) {
  const all = result.end === "all-found";
  return (
    <>
      <MineBackdrop dim={0.3} />
      <Confetti />
      <div style={{ position: "absolute", top: SAFE_AREA_TOP + 14, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Plank>ROUND {result.round}</Plank>
      </div>
      {/* Fumi's line from the sheet */}
      <div style={{ position: "absolute", top: SAFE_AREA_TOP + 58, left: 0, right: 0, display: "flex", justifyContent: "center", animation: "bubble-pop 420ms var(--ease-pop) both" }}>
        <div style={{ ...speechStyle, fontSize: 24, fontFamily: TEXT_DISPLAY, fontWeight: 800, padding: "10px 22px" }}>
          {ROUND_END_LINE}
          <div style={{ position: "absolute", bottom: -9, left: "50%", marginLeft: -9, width: 18, height: 18, background: "#fffaf0", transform: "rotate(45deg)", borderRight: "2px solid #c9a265", borderBottom: "2px solid #c9a265" }} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 168, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <FumiCart size={176} bounce />
      </div>
      <div style={{ position: "absolute", top: 368, left: 16, right: 16 }}>
        <WoodFramePanel>
          <div style={{ padding: "12px 12px 10px", textAlign: "center" }}>
            <div style={{ fontFamily: TEXT_DISPLAY, fontWeight: 800, fontSize: 19, color: all ? "#2a7a3a" : "#8a4a10" }}>{all ? ALL_FOUND_HINGLISH : "Time's up!"}</div>
            {!all && <div style={{ fontSize: 13, fontWeight: 700, color: "#5a3a1a", marginTop: 2 }}>{timeUpHinglish(result.wordsFound, result.wordsTotal)}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", marginTop: 10, gap: 4 }}>
              <ResultStat label="Words found" value={`${result.wordsFound} / ${result.wordsTotal}`} />
              <ResultStat label="Time taken" value={mmss(result.timeTakenMs)} />
              <ResultStat label="Time left" value={mmss(result.timeRemainingMs)} />
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 10 }}>
              {Array.from({ length: result.wordsTotal }, (_, i) => (
                <MiniCart key={i} full={i < result.wordsFound} />
              ))}
            </div>
          </div>
        </WoodFramePanel>
      </div>
      <button type="button" className="tap-scale" onClick={onContinue} style={{ ...playButtonStyle, position: "absolute", bottom: 50, left: 60, right: 60 }}>
        {isLast ? "See Results" : "Continue"}
      </button>
    </>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: TEXT_DISPLAY, fontWeight: 800, fontSize: 18, color: INK }}>{value}</div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#7a5528" }}>{label}</div>
    </div>
  );
}

function FinalScreen({ outcome, onPlayAgain, onFinish }: { outcome: GameOutcome; onPlayAgain: () => void; onFinish: () => void }) {
  const { metrics: m, rewards } = outcome;
  const [chosen, setChosen] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);
  const claim = () => {
    reportGame({ ...outcome, accessoryChosen: chosen });
    setClaimed(true);
  };
  return (
    <>
      <MineBackdrop dim={0.35} />
      <Confetti />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: `${SAFE_AREA_TOP + 4}px 14px 18px`, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <FumiCart size={92} bounce />
          <div style={{ fontFamily: TEXT_DISPLAY, fontWeight: 800, fontSize: 23, color: "#ffe08a", textShadow: "0 2px 8px rgba(0,0,0,0.7)", lineHeight: 1.15 }}>
            Mine Escaped!
            <div style={{ fontSize: 13, color: "#f2e3c4", fontWeight: 700 }}>{m.roundsCleared === m.roundsPlayed ? "All tracks cleared" : `${m.roundsCleared} of ${m.roundsPlayed} tracks fully cleared`}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }} aria-label={`${outcome.starsEarned} of 3 stars`}>
          {[1, 2, 3].map((s) => (
            <span key={s} style={{ fontSize: 24, opacity: s <= outcome.starsEarned ? 1 : 0.25, animation: `star-pop 420ms ease-out ${s * 0.12}s both` }}>
              ⭐
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
            {m.byRound.map((r) => (
              <div key={r.round} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", fontSize: 12.5, color: "#4a2e12", fontWeight: 700 }}>
                <span style={{ width: 62, fontWeight: 800 }}>Round {r.round}</span>
                <span style={{ flex: 1 }}>{r.title}</span>
                <span style={{ width: 44, textAlign: "right" }}>
                  {r.wordsFound}/{r.wordsTotal}
                </span>
                <span style={{ width: 42, textAlign: "right", color: "#7a5528" }}>{mmss(r.timeTakenMs)}</span>
              </div>
            ))}
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
