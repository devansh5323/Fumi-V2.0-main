import type { SessionOutcome } from "../types";

const STORAGE_KEY = "fumi-lantern-grid-results";
const MAX_STORED_RESULTS = 100;

// Saves the session (one entry per sessionId, replaced as it updates) to
// browser localStorage AND to the local backend — called when the first
// puzzle appears, after every drop, on exit and when the game ends, so even
// a game left half-way is kept in both places.
export function saveSession(outcome: SessionOutcome): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const existing: SessionOutcome[] = raw ? JSON.parse(raw) : [];
    const i = existing.findIndex((s) => s.sessionId === outcome.sessionId);
    const next = i < 0 ? [...existing, outcome] : existing.map((s, k) => (k === i ? outcome : s));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-MAX_STORED_RESULTS)));
  } catch {
    // Storage can fail (quota, private mode) — the backend copy below still holds it.
  }
  // Local backend: data/game-results/lantern-grid.jsonl (see /api/results).
  // Each update is appended; reads keep only the latest per sessionId.
  // Fire-and-forget — the game never waits.
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
