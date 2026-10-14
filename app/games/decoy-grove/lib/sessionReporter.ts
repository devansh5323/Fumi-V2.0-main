import type { SessionOutcome } from "../types";

const STORAGE_KEY = "fumi-decoy-grove-results";
const MAX_STORED_RESULTS = 100;

// Saves the session (one entry per sessionId, replaced as it updates) to
// browser localStorage and the local backend — when play starts, after every
// answer, on exit / tab hide and at the end, so unfinished games are kept.
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
  // Local backend: data/game-results/decoy-grove.jsonl (see /api/results);
  // reads keep only the latest copy per sessionId. Fire-and-forget.
  const body = JSON.stringify(outcome);
  void fetch("/api/results/decoy-grove", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: body.length < 60_000 }).catch(() => {});
}
