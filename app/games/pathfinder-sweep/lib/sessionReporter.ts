import type { GameOutcome } from "../types";

const STORAGE_KEY = "fumi-game-results";
const MAX_STORED_RESULTS = 100;

// The single seam a backend integration swaps for a real API call later —
// everything upstream already produces a fully-typed GameOutcome, so this
// function is the only place that needs to change.
export function reportGame(result: GameOutcome): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const existing: GameOutcome[] = raw ? JSON.parse(raw) : [];
    const next = [...existing, result].slice(-MAX_STORED_RESULTS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can fail (quota, private mode) — result data is non-critical
    // to app function, so fail silently rather than breaking the game.
  }
}
