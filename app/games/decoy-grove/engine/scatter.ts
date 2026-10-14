import type { Placed, RoundSpec } from "../types";
import { FIELD } from "../config";

// Star Search style scatter: the objects take random cells of a loose grid
// over the play area (some cells stay empty) with a small random offset, so
// the layout looks scattered but nothing overlaps or gets clipped.
export function layoutRound(round: RoundSpec, rand: () => number = Math.random): Placed[] {
  const items = [...round.decoys.flatMap((d) => Array.from({ length: d.count }, () => ({ ...d, isOdd: false }))), { ...round.odd, isOdd: true }];
  const n = items.length;
  // enough cells for ~1.5x the objects, never fewer than 3 columns
  const cols = n <= 6 ? 3 : 4;
  const rows = Math.max(Math.ceil((n * 1.5) / cols), Math.ceil(n / cols));
  const cw = FIELD.width / cols;
  const ch = FIELD.height / rows;
  const size = Math.min(84, cw * 0.74, ch * 0.74);
  const cells = Array.from({ length: cols * rows }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  // drifting objects travel a little, so they get more room from the edges
  const order = items.map((_, i) => i).sort(() => rand() - 0.5);
  return order.map((itemIdx, k) => {
    const it = items[itemIdx];
    const cell = cells[k];
    const c = cell % cols;
    const r = Math.floor(cell / cols);
    const slackX = Math.max(0, (cw - size) / 2 - (it.drift ? 12 : 2));
    const slackY = Math.max(0, (ch - size) / 2 - 2);
    const x = FIELD.left + c * cw + cw / 2 + (rand() * 2 - 1) * slackX * 0.8;
    const y = FIELD.top + r * ch + ch / 2 + (rand() * 2 - 1) * slackY * 0.8;
    return { ...it, key: `${k}-${it.kind}`, x, y, size };
  });
}

export function describe(p: { kind: string; facing?: string; upsideDown?: boolean; drift?: string }): string {
  const bits = [p.facing === "left" ? "facing left" : null, p.upsideDown ? "upside down" : null, p.drift ? `drifting ${p.drift}` : null].filter(Boolean);
  return bits.length ? `${p.kind} (${bits.join(", ")})` : p.kind;
}
