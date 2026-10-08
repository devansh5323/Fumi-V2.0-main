import { appendSession, isGameId, readSessions, sessionRows, toCsv, trialRows } from "../../../lib/server/resultsStore";

const MAX_BODY_BYTES = 2_000_000;

// POST /api/results/<game>   body: the game's GameOutcome JSON -> stored
// GET  /api/results/<game>                       -> all sessions (JSON)
// GET  /api/results/<game>?format=csv            -> one row per session
// GET  /api/results/<game>?format=csv&level=trials -> one row per signal/round
export async function POST(request: Request, { params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!isGameId(game)) return Response.json({ error: `Unknown game "${game}"` }, { status: 404 });

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return Response.json({ error: "Payload too large" }, { status: 413 });
  let outcome: unknown;
  try {
    outcome = JSON.parse(text);
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  if (!outcome || typeof outcome !== "object" || Array.isArray(outcome) || !("metrics" in outcome)) {
    return Response.json({ error: "Expected a game outcome object with metrics" }, { status: 400 });
  }

  const saved = await appendSession(game, outcome as Record<string, unknown>);
  return Response.json({ ok: true, sessionId: saved.sessionId, receivedAt: saved.receivedAt }, { status: 201 });
}

export async function GET(request: Request, { params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!isGameId(game)) return Response.json({ error: `Unknown game "${game}"` }, { status: 404 });

  const url = new URL(request.url);
  const sessions = await readSessions(game);

  if (url.searchParams.get("format") === "csv") {
    const trials = url.searchParams.get("level") === "trials";
    const csv = toCsv(trials ? trialRows(game, sessions) : sessionRows(sessions));
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${game}-${trials ? "trials" : "sessions"}.csv"`,
      },
    });
  }
  return Response.json({ game, count: sessions.length, sessions });
}
