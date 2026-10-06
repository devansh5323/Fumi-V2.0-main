"use client";

import type { TilePosition, TileStimulus } from "../types";
import { SYMBOL_LIBRARY } from "../engine/symbolLibrary";
import { ForestPath } from "./ForestPath";
import { HexTile, type HexTileVisualState } from "./HexTile";

type SearchFieldProps = {
  tiles: TileStimulus[];
  positions: TilePosition[];
  visualStates: Record<string, HexTileVisualState>;
  interactive: boolean;
  onTapTile: (tileId: string) => void;
};

export function SearchField({ tiles, positions, visualStates, interactive, onTapTile }: SearchFieldProps) {
  const positionById = new Map(positions.map((p) => [p.tileId, p]));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(circle at 50% 0%, #1c2e20 0%, #0e1a12 45%, #060c08 100%)",
        overflow: "hidden",
      }}
    >
      <ForestPath />
      {tiles.map((tile) => {
        const position = positionById.get(tile.tileId);
        if (!position) return null;
        return (
          <HexTile
            key={tile.tileId}
            tile={tile}
            position={position}
            symbol={SYMBOL_LIBRARY[tile.symbolId]}
            visualState={visualStates[tile.tileId] ?? "idle"}
            interactive={interactive}
            onTap={onTapTile}
          />
        );
      })}
    </div>
  );
}
