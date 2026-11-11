export type Route = 'analyze' | 'generate' | 'compare' | 'dictionaries' | 'learn' | 'privacy';

export type Theme = 'light' | 'dark';

export type Score = 0 | 1 | 2 | 3 | 4;

export type PatternKind =
  'dictionary' | 'spatial' | 'repeat' | 'sequence' | 'regex' | 'date' | 'bruteforce' | 'unknown';

export type AttackKey =
  | 'online_throttling_100_per_hour'
  | 'online_no_throttling_10_per_second'
  | 'offline_slow_hashing_1e4_per_second'
  | 'offline_fast_hashing_1e10_per_second';

export interface PatternFinding {
  kind: PatternKind;
  /** 1-based inclusive character position in the candidate. */
  start: number;
  /** 1-based inclusive character position in the candidate. */
  end: number;
  length: number;
  guessesLog10: number;
  dictionaryName?: string;
  note: string;
}

export interface AttackScenario {
  key: AttackKey;
  label: string;
  model: 'online' | 'offline';
  rateLabel: string;
  seconds: number;
  display: string;
}

export interface DictionaryMatch {
  dictionaryId: string;
  dictionaryName: string;
  start: number;
  end: number;
  wordLength: number;
  severity: 'low' | 'medium' | 'high';
}

export interface AnalysisResult {
  score: Score;
  guesses: number;
  guessesLog10: number;
  attacks: AttackScenario[];
  patterns: PatternFinding[];
  feedback: {
    warning: string;
    suggestions: string[];
  };
  customMatches: DictionaryMatch[];
  dictionaryAdjusted: boolean;
  calcTimeMs: number;
  codePointLength: number;
  onlyWhitespace: boolean;
  hasUnicode: boolean;
  /** Share of characters that fall inside a recognized, non-brute-force pattern. */
  patternCoverage: number;
}

export interface BreachResult {
  found: boolean;
  count: number;
  checkedAt: Date;
}

export interface Dictionary {
  id: string;
  name: string;
  words: string[];
  enabled: boolean;
  source: 'user';
  importedAt: Date;
}

export interface DictionaryImportStats {
  totalCandidates: number;
  uniqueWords: number;
  duplicatesRemoved: number;
}

export interface DictionaryImport {
  dictionary: Dictionary;
  stats: DictionaryImportStats;
}

export interface WordListMeta {
  id: 'eff-large' | 'eff-short';
  name: string;
  description: string;
  source: string;
  license: string;
  size: number;
  bitsPerWord: number;
  words: string[];
}

export interface PasswordGeneratorConfig {
  length: number;
  includeLowercase: boolean;
  includeUppercase: boolean;
  includeDigits: boolean;
  includeSymbols: boolean;
  includeSpace: boolean;
  excludeSimilar: boolean;
  excludeAmbiguous: boolean;
  customCharacters: string;
  excludeCharacters: string;
}

export type PasswordPreset = 'recommended' | 'compatibility' | 'high-security' | 'custom';

export interface PasswordGenerationResult {
  value: string;
  entropyBits: number;
  searchSpaceLog10: number;
  poolSize: number;
  requiredClasses: string[];
}

export type PassphraseWordListId = 'eff-large' | 'eff-short' | 'custom';

export interface PassphraseGeneratorConfig {
  wordCount: number;
  wordList: PassphraseWordListId;
  customWords: string[];
  separator: string;
  capitalization: 'none' | 'first' | 'all' | 'random';
  includeNumber: boolean;
}

export interface PassphraseGenerationResult {
  value: string;
  entropyBits: number;
  listSize: number;
  wordListName: string;
  wordCount: number;
  breakdown: {
    words: number;
    capitalization: number;
    number: number;
  };
  warnings: string[];
}

export interface ComparisonEntry {
  id: string;
  label: string;
  analysis: AnalysisResult;
  rank: number;
}

export interface ReportData {
  generatedAt: Date;
  analysis: AnalysisResult;
  breach: BreachResult | null;
}
