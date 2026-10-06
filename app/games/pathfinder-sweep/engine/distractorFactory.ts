import type { DistractorKind, MarkVariant, SymbolDefinition, SymbolId, TileStimulus } from "../types";
import { KIND_POOL_BY_TIER, MAGNITUDE_BY_TIER } from "../config";
import { ALL_SYMBOL_IDS } from "./symbolLibrary";
import { pickRandom, randInt, randRange, randSign, shuffle, type Rng } from "./rng";

// Idle-state rendering must never branch color/fill on isTarget or similarity —
// only post-tap feedback (correct glow / wrong dissolve) may differ. Enforced
// by convention in HexTile.tsx/SymbolGlyph.tsx; keep target identification
// shape-only, never color-only.

function cycleKindsWithoutImmediateRepeat(pool: DistractorKind[], count: number, rng: Rng): DistractorKind[] {
  const out: DistractorKind[] = [];
  let lastKind: DistractorKind | null = null;
  while (out.length < count) {
    const cycle = shuffle(pool, rng);
    for (const kind of cycle) {
      if (out.length >= count) break;
      if (kind === lastKind && pool.length > 1) continue;
      out.push(kind);
      lastKind = kind;
    }
  }
  return out;
}

function makeSingleTransformTile(
  target: SymbolDefinition,
  kind: DistractorKind,
  tierIndex: number,
  rng: Rng,
  tileId: string
): TileStimulus {
  const magnitude = MAGNITUDE_BY_TIER[tierIndex];
  const base: TileStimulus = {
    tileId,
    symbolId: target.id,
    isTarget: false,
    similarity: "high",
    distractorKind: kind,
    symbolRotationDeg: 0,
    mirrored: false,
    markVariant: "canonical",
    markShiftDeg: 0,
  };

  switch (kind) {
    case "mirror":
      base.mirrored = true;
      break;
    case "rotate":
      base.symbolRotationDeg = randRange(rng, magnitude.rotateDeg) * randSign(rng);
      break;
    case "mark-removed":
      base.markVariant = "removed" as MarkVariant;
      break;
    case "mark-duplicated":
      base.markVariant = "duplicated" as MarkVariant;
      break;
    case "mark-shifted":
      base.markVariant = "shifted" as MarkVariant;
      base.markShiftDeg = randRange(rng, magnitude.shiftDeg) * randSign(rng);
      break;
  }

  return base;
}

export function buildHighSimilarityDistractors(
  target: SymbolDefinition,
  count: number,
  tierIndex: number,
  rng: Rng,
  idPrefix: string
): TileStimulus[] {
  if (count <= 0) return [];
  const pool = KIND_POOL_BY_TIER[tierIndex];
  const kinds = cycleKindsWithoutImmediateRepeat(pool, count, rng);
  return kinds.map((kind, i) => makeSingleTransformTile(target, kind, tierIndex, rng, `${idPrefix}-hi${i}`));
}

export function buildLowSimilarityDistractors(
  targetSymbolId: SymbolId,
  count: number,
  rng: Rng,
  idPrefix: string
): TileStimulus[] {
  if (count <= 0) return [];
  const others = shuffle(
    ALL_SYMBOL_IDS.filter((id) => id !== targetSymbolId),
    rng
  );
  const out: TileStimulus[] = [];
  for (let i = 0; i < count; i++) {
    const symbolId = others[i % others.length];
    out.push({
      tileId: `${idPrefix}-lo${i}`,
      symbolId,
      isTarget: false,
      similarity: "low",
      distractorKind: null,
      symbolRotationDeg: randInt(rng, 360),
      mirrored: rng() < 0.5,
      markVariant: "canonical",
      markShiftDeg: 0,
    });
  }
  return out;
}

export function buildTileSet(
  targetSymbolId: SymbolId,
  tileCount: number,
  highSimilarityCount: number,
  tierIndex: number,
  rng: Rng,
  idPrefix: string,
  symbolLibrary: Record<SymbolId, SymbolDefinition>
): TileStimulus[] {
  const target = symbolLibrary[targetSymbolId];
  const targetTile: TileStimulus = {
    tileId: `${idPrefix}-target`,
    symbolId: targetSymbolId,
    isTarget: true,
    similarity: "target",
    distractorKind: null,
    symbolRotationDeg: 0,
    mirrored: false,
    markVariant: "canonical",
    markShiftDeg: 0,
  };

  const highCount = Math.min(highSimilarityCount, tileCount - 1);
  const lowCount = tileCount - 1 - highCount;

  const highTiles = buildHighSimilarityDistractors(target, highCount, tierIndex, rng, idPrefix);
  const lowTiles = buildLowSimilarityDistractors(targetSymbolId, lowCount, rng, idPrefix);

  return shuffle([targetTile, ...highTiles, ...lowTiles], rng);
}

export function pickTargetSymbol(rng: Rng, excludeLastId?: SymbolId): SymbolId {
  const candidates = excludeLastId ? ALL_SYMBOL_IDS.filter((id) => id !== excludeLastId) : ALL_SYMBOL_IDS;
  return pickRandom(candidates, rng);
}
