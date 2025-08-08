// Service interfaces for the password analyzer enhancements

export interface GeneratorConfig {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeSimilar: boolean;
  excludeAmbiguous: boolean;
  customCharacters?: string;
  excludeCharacters?: string;
}

export interface PassphraseConfig {
  wordCount: number;
  wordList: 'eff' | 'eff-short' | 'original' | 'custom';
  separator: string;
  capitalize: 'none' | 'first' | 'all' | 'random';
  includeNumbers: boolean;
}

export interface ClipboardOptions {
  autoClean?: boolean;
  cleanupDelay?: number;
  showFeedback?: boolean;
}

export interface Dictionary {
  id: string;
  name: string;
  words: string[];
  enabled: boolean;
  source: 'builtin' | 'user';
}

export interface AnalysisData {
  timestamp: Date;
  passwordLength: number;
  strengthScore: number;
  crackTimes: {
    online_no_throttling_10_per_second: string;
    online_throttling_100_per_hour: string;
    offline_slow_hashing_1e4_per_second: string;
    offline_fast_hashing_1e10_per_second: string;
  };
  feedback: {
    warning: string;
    suggestions: string[];
  };
  customNotes?: string;
}

export interface PDFOptions {
  title?: string;
  includeTimestamp?: boolean;
  includeRecommendations?: boolean;
}

// Service Interfaces
export interface CryptoService {
  generateSecureRandom(length: number): Uint8Array;
  generatePassword(config: GeneratorConfig): string;
  generatePassphrase(config: PassphraseConfig): Promise<string>;
  calculateEntropy(password: string): number;
  isWebCryptoSupported(): boolean;
}

export interface ClipboardService {
  copy(text: string, options?: ClipboardOptions): Promise<boolean>;
  isSupported(): boolean;
  scheduleCleanup(delay: number): void;
  hasClipboardPermission(): Promise<boolean>;
  getClipboardErrorMessage(error: unknown): string;
  cleanup(): void;
}

export interface ExportService {
  exportToPDF(data: AnalysisData, options?: PDFOptions): Promise<Blob>;
  exportToText(data: AnalysisData): string;
  downloadFile(blob: Blob, filename: string): void;
}

export interface DictionaryService {
  loadDictionary(file: File): Promise<Dictionary>;
  addDictionary(dictionary: Dictionary): void;
  removeDictionary(id: string): void;
  getDictionaries(): Dictionary[];
  validateDictionary(data: unknown): boolean;
  toggleDictionary(id: string, enabled: boolean): void;
  getWordList(listType: 'eff' | 'eff-short' | 'original'): string[];
  getWordListEntropy(listType: 'eff' | 'eff-short' | 'original'): number;
  getEnabledDictionaries(): Dictionary[];
  ensureInitialized(): Promise<void>;
}