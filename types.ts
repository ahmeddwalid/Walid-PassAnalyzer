export interface ZxcvbnResult {
  score: 0 | 1 | 2 | 3 | 4;
  feedback: {
    warning: string;
    suggestions: string[];
  };
  crack_times_display: {
    online_no_throttling_10_per_second: string;
    online_throttling_100_per_hour: string;
    offline_slow_hashing_1e4_per_second: string;
    offline_fast_hashing_1e10_per_second: string;
  };
  calc_time: number; // Time in ms zxcvbn took to calculate
}

export interface StrengthLevelInfo {
  label: string;
  color: string; // Tailwind background color class
  textColor: string; // Tailwind text color class
  barWidthClass: string; // Tailwind width class for the meter bar
}

// Enhanced types for password analyzer enhancements
export interface DictionaryMatch {
  dictionaryName: string;
  matchedWord: string;
  position: number;
  severity: 'low' | 'medium' | 'high';
}

export interface EnhancedAnalysisResult extends ZxcvbnResult {
  entropy: number;
  customDictionaryMatches: DictionaryMatch[];
  generationMethod?: 'manual' | 'generated' | 'passphrase';
}

export interface GeneratedPassword {
  password: string;
  config: any; // Will reference GeneratorConfig from services
  entropy: number;
  analysis: EnhancedAnalysisResult;
  timestamp: Date;
}

export interface ComparisonResult {
  password: string;
  analysis: ZxcvbnResult;
  rank: number;
  isStrongest: boolean;
}

export interface ComparisonSession {
  id: string;
  passwords: ComparisonResult[];
  timestamp: Date;
}

export interface WordList {
  name: string;
  description: string;
  words: string[];
  entropy_per_word: number;
}

// Error handling types
export enum ErrorType {
  CRYPTO_NOT_SUPPORTED = 'CRYPTO_NOT_SUPPORTED',
  CLIPBOARD_ACCESS_DENIED = 'CLIPBOARD_ACCESS_DENIED',
  DICTIONARY_INVALID = 'DICTIONARY_INVALID',
  EXPORT_FAILED = 'EXPORT_FAILED',
  WORDLIST_LOAD_FAILED = 'WORDLIST_LOAD_FAILED'
}

export class AppError extends Error {
  public type: ErrorType;
  public details?: unknown;
  public recoverable: boolean;

  constructor(options: {
    type: ErrorType;
    message: string;
    details?: unknown;
    recoverable: boolean;
  }) {
    super(options.message);
    this.name = 'AppError';
    this.type = options.type;
    this.details = options.details;
    this.recoverable = options.recoverable;
  }
}
