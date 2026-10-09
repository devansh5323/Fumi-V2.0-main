import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

// Server-side only (imported by the /api/results route handlers).
// Local results store for engineers: every completed game session is
// appended as one JSON line to data/game-results/<game>.jsonl in the
// project folder. Read it back through /api/results/<game> (JSON or CSV).

export const GAMES = ["signal-watch", "twin-current", "minecart-escape", "lantern-grid"] as const;
export type GameId = (typeof GAMES)[number];

export function isGameId(value: string): value is GameId {
  return (GAMES as readonly string[]).includes(value);
}

const DATA_DIR = path.join(process.cwd(), "data", "game-results");

function fileFor(game: GameId): string {
  return path.join(DATA_DIR, `${game}.jsonl`);
}

export type StoredSession = {
  sessionId: string;
  game: GameId;
  receivedAt: string; // ISO timestamp
  outcome: Record<string, unknown>;
};

export async function appendSession(game: GameId, outcome: Record<string, unknown>): Promise<StoredSession> {
  const record: StoredSession = { sessionId: crypto.randomUUID(), game, receivedAt: new Date().toISOString(), outcome };
  await mkdir(DATA_DIR, { recursive: true });
  await appendFile(fileFor(game), JSON.stringify(record) + "\n", "utf8");
  return record;
}

export async function readSessions(game: GameId): Promise<StoredSession[]> {
  let raw: string;
  try {
    raw = await readFile(fileFor(game), "utf8");
  } catch {
    return [];
  }
  const out: StoredSession[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as StoredSession);
    } catch {
      // Skip a partially written line rather than failing the whole read.
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

// Flattens nested objects/arrays into dot-separated keys:
// { a: { b: 1 }, c: [ { d: 2 } ] } -> { "a.b": 1, "c.0.d": 2 }
export function flatten(value: unknown, prefix = "", out: Record<string, unknown> = {}): Record<string, unknown> {
  if (value !== null && typeof value === "object") {
    const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v] as const) : Object.entries(value);
    if (entries.length === 0 && prefix) out[prefix] = Array.isArray(value) ? "" : "";
    for (const [k, v] of entries) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else if (prefix) {
    out[prefix] = value;
  }
  return out;
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const r of rows)
    for (const k of Object.keys(r))
      if (!seen.has(k)) {
        seen.add(k);
        columns.push(k);
      }
  const lines = [columns.join(","), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(","))];
  return lines.join("\n") + "\n";
}

// One row per session: id, time, and every summary metric/reward field.
export function sessionRows(sessions: StoredSession[]): Record<string, unknown>[] {
  return sessions.map((s) => {
    const { stageResults, roundResults, rounds, puzzles, ...summary } = s.outcome as Record<string, unknown>;
    void stageResults;
    void roundResults;
    void rounds;
    void puzzles;
    return { sessionId: s.sessionId, receivedAt: s.receivedAt, ...flatten(summary) };
  });
}

// One row per trial: each signal (Signal Watch), each round (Twin Current) or
// each word per round (Minecart Escape) or each puzzle (Lantern Grid).
export function trialRows(game: GameId, sessions: StoredSession[]): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const s of sessions) {
    const base = { sessionId: s.sessionId, receivedAt: s.receivedAt, ageBand: (s.outcome as { ageBand?: string }).ageBand };
    if (game === "signal-watch") {
      const stages = ((s.outcome as { stageResults?: { signals?: unknown[]; strayTaps?: unknown[] }[] }).stageResults ?? []);
      for (const st of stages) {
        for (const sig of st.signals ?? []) rows.push({ ...base, rowType: "signal", ...flatten(sig) });
        for (const tap of st.strayTaps ?? []) rows.push({ ...base, rowType: "stray-tap", ...flatten(tap) });
      }
    } else if (game === "lantern-grid") {
      // One row per puzzle reached: solved?, wrong drops, background time.
      const o = s.outcome as { sessionId?: string; status?: string; puzzles?: { puzzle: number; answer: string; solved: boolean; wrongAttempts: number; timeToSolveMs: number | null; attempts: { optionLetter: string; option: string; correct: boolean; atMs: number }[] }[] };
      for (const p of o.puzzles ?? []) {
        rows.push({
          ...base,
          rowType: "puzzle",
          gameSessionId: o.sessionId ?? "",
          sessionStatus: o.status ?? "",
          puzzle: p.puzzle,
          answer: p.answer,
          solved: p.solved,
          wrongAttempts: p.wrongAttempts,
          timeToSolveMs: p.timeToSolveMs ?? "",
          picks: p.attempts.map((a) => `${a.optionLetter}:${a.option}${a.correct ? "✓" : "✗"}@${a.atMs}`).join(" "),
        });
      }
    } else if (game === "minecart-escape") {
      // One row per word per round attempt: found (with when) or missed.
      const rounds = (s.outcome as { rounds?: { round: number; attempt?: number; passed?: boolean; title: string; gridSize: number; found: { word: string; foundAtMs: number }[]; missedWords: string[]; invalidSelections: number; timeTakenMs: number; end: string }[] }).rounds ?? [];
      for (const r of rounds) {
        const roundInfo = { round: r.round, attempt: r.attempt ?? 1, roundPassed: r.passed ?? "", title: r.title, gridSize: r.gridSize, roundEnd: r.end, roundTimeTakenMs: r.timeTakenMs, roundInvalidSelections: r.invalidSelections };
        for (const f of r.found) rows.push({ ...base, rowType: "word", ...roundInfo, word: f.word, found: true, foundAtMs: f.foundAtMs });
        for (const w of r.missedWords) rows.push({ ...base, rowType: "word", ...roundInfo, word: w, found: false, foundAtMs: "" });
      }
    } else {
      const rounds = ((s.outcome as { roundResults?: Record<string, unknown>[] }).roundResults ?? []);
      for (const r of rounds) {
        const { picks, ...rest } = r;
        rows.push({ ...base, rowType: "round", ...flatten(rest), picks: JSON.stringify(picks ?? []) });
      }
    }
  }
  return rows;
}
