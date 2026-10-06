import type { GameOutcome } from "../types";
import { DEFAULT_QUEST } from "../config";
import { recordCompletion } from "../../../lib/dayProgress";

const STORAGE_KEY = "fumi-twin-current-results";
const MAX_STORED_RESULTS = 100;

// The single seam a backend integration swaps for a real API call later.
// Also records Twin Current as complete for its quest day (Day 2 bonus).
export function reportGame(result: GameOutcome): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const existing: GameOutcome[] = raw ? JSON.parse(raw) : [];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, result].slice(-MAX_STORED_RESULTS)));
  } catch {
    // Storage can fail (quota, private mode) — non-critical, fail silently.
  }
  recordCompletion(DEFAULT_QUEST.day, "twin-current");
}
