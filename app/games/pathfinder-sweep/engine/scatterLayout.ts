import type { PlayAreaSize, ReservedZone, TilePosition } from "../types";
import { MAX_TILE_SIZE_PX, MIN_TILE_SIZE_PX } from "../config";
import { createRng, randInt, randRange, type Rng } from "./rng";

const REGION_COLS = 3;
const REGION_ROWS = 2;
export const REGION_COUNT = REGION_COLS * REGION_ROWS;

const MAX_ATTEMPTS_PER_TILE = 60;
const MIN_DIST_RELAX_ROUNDS = 2;
const MIN_DIST_RELAX_FACTOR = 0.85;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function tileSizeForCount(tileCount: number): number {
  const t = clamp((tileCount - 8) / 8, 0, 1);
  return lerp(MAX_TILE_SIZE_PX, MIN_TILE_SIZE_PX, t);
}

export function regionOf(x: number, y: number, playArea: PlayAreaSize): number {
  const col = clamp(Math.floor((x / playArea.width) * REGION_COLS), 0, REGION_COLS - 1);
  const row = clamp(Math.floor((y / playArea.height) * REGION_ROWS), 0, REGION_ROWS - 1);
  return row * REGION_COLS + col;
}

export function regionCenter(regionId: number, playArea: PlayAreaSize): { x: number; y: number } {
  const col = regionId % REGION_COLS;
  const row = Math.floor(regionId / REGION_COLS);
  const cellW = playArea.width / REGION_COLS;
  const cellH = playArea.height / REGION_ROWS;
  return { x: cellW * col + cellW / 2, y: cellH * row + cellH / 2 };
}

function overlapsReservedZone(x: number, y: number, size: number, zones: ReservedZone[]): boolean {
  const half = size / 2;
  return zones.some(
    (zone) => x + half > zone.x && x - half < zone.x + zone.width && y + half > zone.y && y - half < zone.y + zone.height
  );
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function sampleFreePoint(
  playArea: PlayAreaSize,
  size: number,
  reservedZones: ReservedZone[],
  placed: TilePosition[],
  minDist: number,
  rng: Rng,
  centerBias: number
): { x: number; y: number } | null {
  const half = size / 2;
  const cx = playArea.width / 2;
  const cy = playArea.height / 2;
  for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_TILE; attempt++) {
    const x = randRange(rng, [half, playArea.width - half]);
    const y = randRange(rng, [half, playArea.height - half]);
    if (centerBias > 0) {
      const distFromCenter = distance(x, y, cx, cy) / Math.hypot(cx, cy);
      if (distFromCenter < centerBias * 0.5) continue;
    }
    if (overlapsReservedZone(x, y, size, reservedZones)) continue;
    if (placed.some((p) => distance(p.x, p.y, x, y) < minDist)) continue;
    return { x, y };
  }
  return null;
}

function fallbackGridPlacement(index: number, playArea: PlayAreaSize, size: number, reservedZones: ReservedZone[]): { x: number; y: number } {
  const cols = 4;
  const cellW = playArea.width / cols;
  const cellH = size * 1.3;
  const col = index % cols;
  const row = Math.floor(index / cols);
  let x = cellW * col + cellW / 2;
  let y = size + row * cellH;
  const half = size / 2;
  if (overlapsReservedZone(x, y, size, reservedZones)) {
    y += size * 1.4;
  }
  x = clamp(x, half, playArea.width - half);
  y = clamp(y, half, playArea.height - half);
  return { x, y };
}

export function layoutTiles(
  tileIds: string[],
  targetTileId: string,
  playArea: PlayAreaSize,
  reservedZones: ReservedZone[],
  seed: string,
  eccentricityBias: number
): TilePosition[] {
  const rng = createRng(seed);
  const size = tileSizeForCount(tileIds.length);
  const baseMinDist = size * 1.15;
  const placed: TilePosition[] = [];

  const orderedIds = [targetTileId, ...tileIds.filter((id) => id !== targetTileId)];

  orderedIds.forEach((tileId, i) => {
    const centerBias = i === 0 ? eccentricityBias : 0;
    let point = sampleFreePoint(playArea, size, reservedZones, placed, baseMinDist, rng, centerBias);
    let round = 0;
    let minDist = baseMinDist;
    while (!point && round < MIN_DIST_RELAX_ROUNDS) {
      minDist *= MIN_DIST_RELAX_FACTOR;
      point = sampleFreePoint(playArea, size, reservedZones, placed, minDist, rng, 0);
      round++;
    }
    if (!point) {
      point = fallbackGridPlacement(i, playArea, size, reservedZones);
    }
    placed.push({
      tileId,
      x: point.x,
      y: point.y,
      tileSizePx: size,
      placementTiltDeg: randRange(rng, [-8, 8]),
      regionId: regionOf(point.x, point.y, playArea),
    });
  });

  return placed;
}

export function pickCueSector(
  cueType: "valid" | "neutral" | "invalid",
  positions: TilePosition[],
  targetTileId: string,
  rng: Rng
): number | null {
  if (cueType === "neutral") return null;
  const target = positions.find((p) => p.tileId === targetTileId);
  if (!target) return null;
  if (cueType === "valid") return target.regionId;

  const otherRegions = Array.from(new Set(positions.filter((p) => p.tileId !== targetTileId).map((p) => p.regionId))).filter(
    (r) => r !== target.regionId
  );
  if (otherRegions.length === 0) return target.regionId;
  return otherRegions[randInt(rng, otherRegions.length)];
}
