import type { AttackKey, PasswordGeneratorConfig, Score } from './types';

export const APP_NAME = 'Walid PassAnalyzer';
export const APP_VERSION = '3.0.0';
export const REPOSITORY_URL = 'https://github.com/ahmeddwalid/Walid-PassAnalyzer';
export const LICENSE_URL = `${REPOSITORY_URL}/blob/main/LICENSE.txt`;
export const ZXCVBN_URL = 'https://github.com/dropbox/zxcvbn';
export const HIBP_PASSWORDS_URL = 'https://haveibeenpwned.com/Passwords';
export const HIBP_RANGE_ENDPOINT = 'https://api.pwnedpasswords.com/range/';

export const ANALYSIS_DEBOUNCE_MS = 220;
export const MAX_MODEL_INPUT_LENGTH = 256;
export const COMPARISON_DEBOUNCE_MS = 320;
export const PASSWORD_MIN_LENGTH = 4;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSPHRASE_MIN_WORDS = 3;
export const PASSPHRASE_MAX_WORDS = 10;
export const MAX_COMPARISON_CANDIDATES = 6;
export const MIN_COMPARISON_CANDIDATES = 2;
export const MAX_DICTIONARY_WORDS = 50_000;
export const MAX_DICTIONARY_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_DICTIONARY_WORD_LENGTH = 128;
export const MAX_CUSTOM_DICTIONARIES = 10;
export const MAX_GENERATOR_CHARACTERS = 128;

export const SYMBOL_POOL = '!@#$%^&*()-_=+[]{};:,.?/';
export const SIMILAR_CHARACTERS = 'Il1Lo0O';
export const AMBIGUOUS_CHARACTERS = '{}[]()/\\\'"`~,;<>.';

export interface ScoreVerdict {
  label: string;
  shortLabel: string;
  summary: string;
  tone: 'danger' | 'warning' | 'caution' | 'positive' | 'strong';
}

export const SCORE_VERDICTS: Record<Score, ScoreVerdict> = {
  0: {
    label: 'Extremely guessable',
    shortLabel: 'Trivial',
    summary:
      'A targeted or automated attacker is likely to reach this almost immediately. Treat it as public.',
    tone: 'danger',
  },
  1: {
    label: 'Very guessable',
    shortLabel: 'Weak',
    summary:
      'This resists only casual attempts. Common patterns and small search spaces make it a likely early hit.',
    tone: 'danger',
  },
  2: {
    label: 'Guessable',
    shortLabel: 'Fair',
    summary:
      'This may survive a rate-limited login, but it is unlikely to hold up against a determined offline attack.',
    tone: 'warning',
  },
  3: {
    label: 'Moderately resistant',
    shortLabel: 'Strong',
    summary:
      'The slow-hash search space is meaningful. A fast-hash database or a recognizable pattern can still be a much cheaper route.',
    tone: 'positive',
  },
  4: {
    label: 'Resistant to slow hashing',
    shortLabel: 'Resilient',
    summary:
      'The slow-hash search space is large. A fast-hash database remains a different and much cheaper route, and no score makes a leaked password safe.',
    tone: 'strong',
  },
};

export interface AttackDefinition {
  key: AttackKey;
  label: string;
  model: 'online' | 'offline';
  rateLabel: string;
  assumption: string;
}

export const ATTACK_DEFINITIONS: AttackDefinition[] = [
  {
    key: 'online_throttling_100_per_hour',
    label: 'Throttled online',
    model: 'online',
    rateLabel: '100 attempts / hour',
    assumption:
      'A login endpoint enforces meaningful rate limits or lockouts. The attacker guesses through the public interface.',
  },
  {
    key: 'online_no_throttling_10_per_second',
    label: 'Unthrottled online',
    model: 'online',
    rateLabel: '10 attempts / second',
    assumption:
      'A login endpoint does not rate-limit, or the attacker has a way around it. Still constrained by network round trips.',
  },
  {
    key: 'offline_slow_hashing_1e4_per_second',
    label: 'Offline, slow hash',
    model: 'offline',
    rateLabel: '10,000 guesses / second',
    assumption:
      'A stolen hash database uses a deliberately slow function such as bcrypt, scrypt, or Argon2 with a tuned work factor. Rates vary widely with cost settings and hardware.',
  },
  {
    key: 'offline_fast_hashing_1e10_per_second',
    label: 'Offline, fast hash',
    model: 'offline',
    rateLabel: '10 billion guesses / second',
    assumption:
      'A stolen hash database uses a fast function such as unsalted MD5 or SHA-1, or an attacker has substantial GPU capacity. This is the weakest plausible route.',
  },
];

export const DEFAULT_PASSWORD_CONFIG: PasswordGeneratorConfig = {
  length: 20,
  includeLowercase: true,
  includeUppercase: true,
  includeDigits: true,
  includeSymbols: true,
  includeSpace: false,
  excludeSimilar: false,
  excludeAmbiguous: false,
  customCharacters: '',
  excludeCharacters: '',
};

export const PASSWORD_PRESETS: Record<
  Exclude<PasswordPresetName, 'custom'>,
  { name: string; description: string; config: PasswordGeneratorConfig }
> = {
  recommended: {
    name: 'Recommended',
    description: '20 characters, all four common classes',
    config: { ...DEFAULT_PASSWORD_CONFIG },
  },
  compatibility: {
    name: 'Maximum compatibility',
    description: '16 characters, letters and digits, no look-alikes',
    config: {
      ...DEFAULT_PASSWORD_CONFIG,
      length: 16,
      includeSymbols: false,
      excludeSimilar: true,
    },
  },
  'high-security': {
    name: 'High security',
    description: '32 characters, every class, full symbol pool',
    config: {
      ...DEFAULT_PASSWORD_CONFIG,
      length: 32,
      excludeSimilar: false,
      excludeAmbiguous: false,
    },
  },
};

type PasswordPresetName = 'recommended' | 'compatibility' | 'high-security';

export const DEFAULT_PASSPHRASE_CONFIG = {
  wordCount: 6,
  wordList: 'eff-large' as const,
  customWords: [] as string[],
  separator: '-',
  capitalization: 'none' as const,
  includeNumber: false,
};

export const NAV_ITEMS = [
  { route: 'analyze', label: 'Analyze', number: '01' },
  { route: 'generate', label: 'Generate', number: '02' },
  { route: 'compare', label: 'Compare', number: '03' },
  { route: 'dictionaries', label: 'Dictionaries', number: '04' },
  { route: 'learn', label: 'Learn', number: '05' },
] as const;

export const ROUTE_TITLES = {
  analyze: 'Password analysis',
  generate: 'Password generation',
  compare: 'Password comparison',
  dictionaries: 'Dictionary management',
  learn: 'Password security field guide',
  privacy: 'Privacy and data handling',
} as const;

export const ANALYZER_EXAMPLES = [
  {
    id: 'common-words',
    label: 'Four common words',
    value: 'correcthorsebatterystaple',
  },
  {
    id: 'predictable-format',
    label: 'Predictable format',
    value: 'Summer2024',
  },
  {
    id: 'leet',
    label: 'Letter substitutions',
    value: 'Tr0ub4dor&3',
  },
] as const;

export const STORAGE_KEYS = {
  theme: 'pa.theme',
  autoClear: 'pa.autoClear',
} as const;
