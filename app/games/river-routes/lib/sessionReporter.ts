import type { SessionOutcome } from "../types";

const STORAGE_KEY = "fumi-river-routes-results";
const MAX_STORED_RESULTS = 100;

// Saves the session (one entry per sessionId, replaced as it updates) to
// browser localStorage and the local backend — after every finished round,
// on exit and at the end, so a game left half-way is kept too.
export function saveSession(outcome: SessionOutcome): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const existing: SessionOutcome[] = raw ? JSON.parse(raw) : [];
    const i = existing.findIndex((s) => s.sessionId === outcome.sessionId);
    const next = i < 0 ? [...existing, outcome] : existing.map((s, k) => (k === i ? outcome : s));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-MAX_STORED_RESULTS)));
  } catch {
    // Storage can fail (quota, private mode) — the backend copy still holds it.
  }
  // Local backend: data/game-results/river-routes.jsonl (see /api/results);
  // reads keep only the latest copy per sessionId. Fire-and-forget.
  const body = JSON.stringify(outcome);
  void fetch("/api/results/river-routes", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: body.length < 60_000 }).catch(() => {});
}
