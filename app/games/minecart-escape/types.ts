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

// One attempt at a round (a round replayed after "Try Again" has several).
export type RoundResult = {
  round: number;
  attempt: number; // 1-based, per round
  passed: boolean; // found at least PASS_WORDS words
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

// Word counts use each round's last attempt; time and selection counts
// include every attempt.
export type WordSearchMetrics = {
  roundsPlayed: number;
  attemptsPlayed: number;
  livesLost: number;
  totalWords: number; // all 30 words in the game
  totalWordsFound: number;
  accuracyPct: number; // words found / total words
  invalidSelections: number;
  repeatSelections: number;
  roundsCleared: number; // rounds passed (PASS_WORDS or more found)
  roundsAllFound: number; // rounds where all 10 were found
  avgTimePerWordMs: number | null; // across all found words
  totalTimeMs: number;
  byRound: { round: number; title: string; wordsFound: number; wordsTotal: number; timeTakenMs: number; end: RoundEnd; passed: boolean; attempts: number }[];
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
  rounds: RoundResult[]; // every attempt, in play order
  completed: boolean; // all 3 rounds cleared (false = ran out of lives)
  livesLeft: number;
  metrics: WordSearchMetrics;
  starsEarned: number;
  rewards: GameRewards;
  accessoryChosen: string | null;
};
