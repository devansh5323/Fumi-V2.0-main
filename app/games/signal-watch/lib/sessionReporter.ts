import type { GameOutcome } from "../types";
import { recordCompletion } from "../../../lib/dayProgress";

const STORAGE_KEY = "fumi-signal-watch-results";
const MAX_STORED_RESULTS = 100;

// Sends the finished game to the local backend, and keeps a localStorage copy.
// Also records Signal Watch as complete for Day 2 (see app/lib/dayProgress).
export function reportGame(result: GameOutcome): void {
  if (typeof window === "undefined") return;
  // Store on the local backend (data/game-results/signal-watch.jsonl) for
  // engineers; see /api/results. Fire-and-forget — the game never waits.
  const body = JSON.stringify(result);
  void fetch("/api/results/signal-watch", {
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
  recordCompletion(2, "signal-watch");
}
