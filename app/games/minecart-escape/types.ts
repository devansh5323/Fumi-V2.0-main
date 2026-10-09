export type AgeBand = "6-10" | "11-16";

// One round's content, from the design spreadsheet.
export type RoundSpec = {
  round: number; // 1-based
  title: string; // e.g. "Mining Tools"
  description: string; // e.g. "Things miners use to work & stay safe."
  words: string[]; // the 10 hidden words, as written in the sheet
  gridSize: number; // 12 or 13
  timeLimitMs: number;
};

export type Cell = { r: number; c: number };

export type Placement = {
  word: string; // UPPERCASE
  cells: Cell[]; // in reading order of the word
};

export type Puzzle = {
  size: number;
  grid: string[][]; // [row][col] single uppercase letters
  placements: Placement[]; // one per target word
};

export type FoundWord = {
  word: string; // UPPERCASE
  foundAtMs: number; // since the grid appeared (pauses excluded)
  colorIndex: number; // which highlight colour it was given
};

export type RoundEnd = "all-found" | "time-up";

export type RoundResult = {
  round: number;
  title: string;
  gridSize: number;
  timeLimitMs: number;
  wordsTotal: number;
  found: FoundWord[];
  wordsFound: number;
  missedWords: string[];
  invalidSelections: number; // selections of 2+ letters that matched no word
  repeatSelections: number; // re-selecting a word already found
  timeTakenMs: number;
  timeRemainingMs: number;
  end: RoundEnd;
};

export type WordSearchMetrics = {
  roundsPlayed: number;
  totalWords: number;
  totalWordsFound: number;
  accuracyPct: number; // words found / total words
  invalidSelections: number;
  repeatSelections: number;
  roundsCleared: number; // rounds where all 10 were found
  avgTimePerWordMs: number | null; // across all found words
  totalTimeMs: number;
  byRound: { round: number; title: string; wordsFound: number; wordsTotal: number; timeTakenMs: number; end: RoundEnd }[];
};

export type GameRewards = {
  xp: number;
  coins: number;
  fistAchieved: boolean;
  collectible: string;
  gems: number;
};

export type GameOutcome = {
  ageBand: AgeBand;
  rounds: RoundResult[];
  metrics: WordSearchMetrics;
  starsEarned: number;
  rewards: GameRewards;
  accessoryChosen: string | null;
};
