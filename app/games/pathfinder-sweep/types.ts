export type SymbolId =
  | "three-leaf-branch"
  | "spiral"
  | "double-chevron"
  | "crescent"
  | "forked-twig"
  | "diamond-with-line"
  | "three-point-star"
  | "broken-circle";

export type SymbolDefinition = {
  id: SymbolId;
  viewBox: string;
  corePaths: string[];
  markPath: string;
};

export type SimilarityTier = "target" | "high" | "low";

export type DistractorKind = "mirror" | "rotate" | "mark-removed" | "mark-duplicated" | "mark-shifted";

export type MarkVariant = "canonical" | "removed" | "duplicated" | "shifted";

export type TileStimulus = {
  tileId: string;
  symbolId: SymbolId;
  isTarget: boolean;
  similarity: SimilarityTier;
  distractorKind: DistractorKind | null;
  symbolRotationDeg: number;
  mirrored: boolean;
  markVariant: MarkVariant;
  markShiftDeg: number;
};

export type TilePosition = {
  tileId: string;
  x: number;
  y: number;
  tileSizePx: number;
  placementTiltDeg: number;
  regionId: number;
};

export type CueType = "valid" | "neutral" | "invalid";

export type AgeBand = "6-10" | "11-16";

export type TrialPlan = {
  trialIndex: number;
  tileCount: number;
  cueType: CueType;
  targetSymbolId: SymbolId;
  tiles: TileStimulus[];
};

export type TrialResult = {
  trialIndex: number;
  cueType: CueType;
  tileCount: number;
  targetSymbolId: SymbolId;
  searchFieldShownAt: number;
  respondedAt: number;
  reactionTimeMs: number;
  incorrectTaps: number;
  incorrectTapKinds: DistractorKind[];
};

export type QuestContext = {
  day: number;
  region: string;
  city: string;
  questId: string;
  part: "A" | "B";
};

export type ReservedZone = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PlayAreaSize = {
  width: number;
  height: number;
};

// What the finished game leaves behind: enough to render the closing screen
// (stars, stats, rewards). One continuous playthrough, not a per-level
// result — there is no level/mission breakdown to grade separately.
export type GameOutcome = {
  trialResults: TrialResult[];
  timedOut: boolean;
  starsEarned: number;
  timeTakenMs: number;
  tilesScanned: number;
  correctMatches: number;
};
