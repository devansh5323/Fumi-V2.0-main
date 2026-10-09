import type { SessionOutcome } from "../types";

const STORAGE_KEY = "fumi-lantern-grid-results";
const MAX_STORED_RESULTS = 100;

// localStorage holds one entry per session (by sessionId), replaced as the
// session updates — after every solved puzzle and when it ends — so a game
// left half-way is still kept.
export function saveProgress(outcome: SessionOutcome): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const existing: SessionOutcome[] = raw ? JSON.parse(raw) : [];
    const i = existing.findIndex((s) => s.sessionId === outcome.sessionId);
    const next = i < 0 ? [...existing, outcome] : existing.map((s, k) => (k === i ? outcome : s));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-MAX_STORED_RESULTS)));
  } catch {
    // Storage can fail (quota, private mode) — non-critical, fail silently.
  }
}

// When the session ends (all 10 solved, or out of lives): final local save,
// and sent to the local backend (data/game-results/lantern-grid.jsonl, see
// /api/results). Fire-and-forget — the game never waits.
export function reportSession(outcome: SessionOutcome): void {
  if (typeof window === "undefined") return;
  saveProgress(outcome);
  const body = JSON.stringify(outcome);
  void fetch("/api/results/lantern-grid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    // keepalive lets the save finish if the page closes (bodies under 64 KB).
    keepalive: body.length < 60_000,
  }).catch(() => {
    // Offline / server unavailable — the localStorage copy still holds it.
  });
}
