import type { GameOutcome } from "../types";

const STORAGE_KEY = "fumi-signal-watch-results";
const COMPLETED_KEY = "fumi-completed-games";
const MAX_STORED_RESULTS = 100;

// The single seam a backend integration swaps for a real API call later.
// Also records "signal-watch" in a shared completed-games list so a future
// Day 2 bonus check can read it.
export function reportGame(result: GameOutcome): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const existing: GameOutcome[] = raw ? JSON.parse(raw) : [];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, result].slice(-MAX_STORED_RESULTS)));

    const completedRaw = window.localStorage.getItem(COMPLETED_KEY);
    const completed: string[] = completedRaw ? JSON.parse(completedRaw) : [];
    if (!completed.includes("signal-watch")) {
      window.localStorage.setItem(COMPLETED_KEY, JSON.stringify([...completed, "signal-watch"]));
    }
  } catch {
    // Storage can fail (quota, private mode) — non-critical, fail silently.
  }
}
