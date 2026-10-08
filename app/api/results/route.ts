import { GAMES, readSessions } from "../../lib/server/resultsStore";

// GET /api/results -> which games have data, how much, and where to get it.
export async function GET() {
  const games = await Promise.all(
    GAMES.map(async (game) => {
      const sessions = await readSessions(game);
      return {
        game,
        sessions: sessions.length,
        lastReceivedAt: sessions.at(-1)?.receivedAt ?? null,
        json: `/api/results/${game}`,
        sessionsCsv: `/api/results/${game}?format=csv`,
        trialsCsv: `/api/results/${game}?format=csv&level=trials`,
      };
    })
  );
  return Response.json({ storedIn: "data/game-results/<game>.jsonl", games });
}
