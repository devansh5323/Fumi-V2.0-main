import type { GameOutcome } from "../types";
import { DEFAULT_QUEST } from "../config";
import { recordCompletion } from "../../../lib/dayProgress";

const STORAGE_KEY = "fumi-twin-current-results";
const MAX_STORED_RESULTS = 100;

// Sends the finished game to the local backend, and keeps a localStorage copy.
// Also records Twin Current as complete for its quest day (Day 2 bonus).
export function reportGame(result: GameOutcome): void {
  if (typeof window === "undefined") return;
  // Store on the local backend (data/game-results/twin-current.jsonl) for
  // engineers; see /api/results. Fire-and-forget — the game never waits.
  const body = JSON.stringify(result);
  void fetch("/api/results/twin-current", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    // keepalive lets the save finish if the page closes, but browsers cap
    // keepalive bodies at 64 KB.
    keepalive: body.length < 60_000,
  }).catch(() => {
    // Offline / server unavailable — the localStorage copy below still holds it.
  });
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const existing: GameOutcome[] = raw ? JSON.parse(raw) : [];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, result].slice(-MAX_STORED_RESULTS)));
  } catch {
    // Storage can fail (quota, private mode) — non-critical, fail silently.
  }
  recordCompletion(DEFAULT_QUEST.day, "twin-current");
}
