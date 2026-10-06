// Cross-game quest-day progress, shared by every game on a given day.
// Lives in localStorage today; a backend integration replaces this file.

const COMPLETED_KEY = "fumi-completed-games";
const BONUS_CLAIMED_KEY = "fumi-day-bonus-claimed";

export const DAY_GAMES: Record<number, string[]> = {
  2: ["signal-watch", "twin-current"],
};

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Storage can fail (quota, private mode) — non-critical.
  }
}

// Would finishing `gameId` now complete its day for the first time? Call
// before recordCompletion() to decide whether to show the day bonus.
export function completesDay(day: number, gameId: string): boolean {
  const games = DAY_GAMES[day] ?? [];
  if (!games.includes(gameId)) return false;
  if (readList(BONUS_CLAIMED_KEY).includes(String(day))) return false;
  const done = new Set([...readList(COMPLETED_KEY), gameId]);
  return games.every((g) => done.has(g));
}

// Marks `gameId` complete; if that completes its day, also marks the day's
// bonus as claimed so it is only ever awarded once.
export function recordCompletion(day: number, gameId: string): void {
  if (typeof window === "undefined") return;
  const awardBonus = completesDay(day, gameId);
  const completed = readList(COMPLETED_KEY);
  if (!completed.includes(gameId)) writeList(COMPLETED_KEY, [...completed, gameId]);
  if (awardBonus) writeList(BONUS_CLAIMED_KEY, [...readList(BONUS_CLAIMED_KEY), String(day)]);
}
