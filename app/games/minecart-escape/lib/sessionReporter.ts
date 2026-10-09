import type { GameOutcome } from "../types";

const STORAGE_KEY = "fumi-minecart-escape-results";
const MAX_STORED_RESULTS = 100;

// localStorage holds one entry per game (by gameId), replaced as it updates.
function saveLocal(update: (games: GameOutcome[]) => GameOutcome[]): void {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const existing: GameOutcome[] = raw ? JSON.parse(raw) : [];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(update(existing).slice(-MAX_STORED_RESULTS)));
  } catch {
    // Storage can fail (quota, private mode) — non-critical, fail silently.
  }
}

function upsert(outcome: GameOutcome): void {
  saveLocal((games) => {
    const i = games.findIndex((g) => g.gameId === outcome.gameId);
    if (i < 0) return [...games, outcome];
    const next = [...games];
    next[i] = outcome;
    return next;
  });
}

// After every round attempt: keeps the game so far in localStorage
// (status "in-progress"), so a game left half-way isn't lost.
export function saveProgress(outcome: GameOutcome): void {
  if (typeof window === "undefined") return;
  upsert(outcome);
}

// Once, when the game ends (all rounds cleared or out of lives): final
// localStorage update, and sent to the local backend.
export function reportGame(outcome: GameOutcome): void {
  if (typeof window === "undefined") return;
  upsert(outcome);
  // Store on the local backend (data/game-results/minecart-escape.jsonl) for
  // engineers; see /api/results. Fire-and-forget — the game never waits.
  const body = JSON.stringify(outcome);
  void fetch("/api/results/minecart-escape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    // keepalive lets the save finish if the page closes, but browsers cap
    // keepalive bodies at 64 KB.
    keepalive: body.length < 60_000,
  }).catch(() => {
    // Offline / server unavailable — the localStorage copy still holds it.
  });
}

// "Claim Rewards" fills in the accessory on the stored game.
export function recordAccessory(gameId: string, accessoryChosen: string | null): void {
  if (typeof window === "undefined") return;
  saveLocal((games) => games.map((g) => (g.gameId === gameId ? { ...g, accessoryChosen } : g)));
}
