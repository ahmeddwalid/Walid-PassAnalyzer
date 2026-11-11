import {
  MAX_GENERATOR_CHARACTERS,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSPHRASE_MAX_WORDS,
  PASSPHRASE_MIN_WORDS,
  SYMBOL_POOL,
  SIMILAR_CHARACTERS,
  AMBIGUOUS_CHARACTERS,
} from '../constants';
import type {
  PasswordGenerationResult,
  PasswordGeneratorConfig,
  PassphraseGenerationResult,
  PassphraseGeneratorConfig,
  PassphraseWordListId,
  WordListMeta,
} from '../types';

export class SecureRandomUnavailableError extends Error {
  constructor() {
    super(
      'This browser does not expose crypto.getRandomValues. Secure generation is unavailable, and this tool will not fall back to a non-cryptographic source.',
    );
    this.name = 'SecureRandomUnavailableError';
  }
}

export class GeneratorConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeneratorConfigurationError';
  }
}

export class WordListUnavailableError extends Error {
  constructor(message = 'The selected word list could not be loaded.') {
    super(message);
    this.name = 'WordListUnavailableError';
  }
}

export const WORD_LISTS: Record<
  Exclude<PassphraseWordListId, 'custom'>,
  Omit<WordListMeta, 'words'>
> = {
  'eff-large': {
    id: 'eff-large',
    name: 'EFF Large',
    description: '7,776 words, chosen by five dice rolls. The default: 12.92 bits per word.',
    source: 'https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt',
    license: 'CC BY 3.0 US, Electronic Frontier Foundation',
    size: 7776,
    bitsPerWord: Math.log2(7776),
  },
  'eff-short': {
    id: 'eff-short',
    name: 'EFF Short',
    description:
      '1,296 words, chosen by four dice rolls. Easier to type, with less entropy per word.',
    source: 'https://www.eff.org/files/2016/09/08/eff_short_wordlist_1.txt',
    license: 'CC BY 3.0 US, Electronic Frontier Foundation',
    size: 1296,
    bitsPerWord: Math.log2(1296),
  },
};

function cryptoProvider(): Crypto {
  if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.getRandomValues) {
    throw new SecureRandomUnavailableError();
  }
  return globalThis.crypto;
}

export function isSecureRandomAvailable(): boolean {
  return (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.getRandomValues === 'function'
  );
}

export function secureRandomBytes(length: number): Uint8Array {
  if (!Number.isInteger(length) || length <= 0) {
    throw new GeneratorConfigurationError('Random byte length must be a positive integer.');
  }
  const bytes = new Uint8Array(length);
  cryptoProvider().getRandomValues(bytes);
  return bytes;
}

export function secureRandomUint32(): number {
  const words = new Uint32Array(1);
  cryptoProvider().getRandomValues(words);
  const word = words[0];
  if (word === undefined) throw new SecureRandomUnavailableError();
  return word;
}

/**
 * Maps a 32-bit random word into [0, maxExclusive) without modulo bias.
 * Returns null when the word falls in the incomplete tail and must be rejected.
 */
export function mapRandomWordToIndex(word: number, maxExclusive: number): number | null {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new GeneratorConfigurationError('Random bound must be a positive integer.');
  }
  if (maxExclusive > 0x1_0000_0000) {
    throw new GeneratorConfigurationError('Random bound exceeds the 32-bit sampling range.');
  }
  if (!Number.isInteger(word) || word < 0 || word > 0xffff_ffff) {
    throw new GeneratorConfigurationError('Random word must be an unsigned 32-bit integer.');
  }
  const limit = Math.floor(0x1_0000_0000 / maxExclusive) * maxExclusive;
  if (word >= limit) return null;
  return word % maxExclusive;
}

export function secureRandomInt(maxExclusive: number): number {
  // Validate before entering the rejection loop.
  mapRandomWordToIndex(0, maxExclusive);
  for (;;) {
    const mapped = mapRandomWordToIndex(secureRandomUint32(), maxExclusive);
    if (mapped !== null) return mapped;
  }
}

/** Uniform floating point value in [0, 1), built from 53 random bits. */
export function secureRandomUnit(): number {
  const words = new Uint32Array(2);
  cryptoProvider().getRandomValues(words);
  const high = words[0];
  const low = words[1];
  if (high === undefined || low === undefined) throw new SecureRandomUnavailableError();
  const value = high * 2 ** 21 + (low >>> 11);
  return value / 2 ** 53;
}

interface CharacterClass {
  key: string;
  label: string;
  characters: string;
}

const BASE_CLASSES: CharacterClass[] = [
  { key: 'lowercase', label: 'lowercase letters', characters: 'abcdefghijklmnopqrstuvwxyz' },
  { key: 'uppercase', label: 'uppercase letters', characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  { key: 'digits', label: 'digits', characters: '0123456789' },
  { key: 'symbols', label: 'symbols', characters: SYMBOL_POOL },
];

interface PoolEntry {
  character: string;
  /** Bitmask of the required classes this character can satisfy. */
  mask: number;
}

function characterSet(value: string): Set<string> {
  return new Set(Array.from(value));
}

function activeClasses(config: PasswordGeneratorConfig): CharacterClass[] {
  return BASE_CLASSES.filter((characterClass) => {
    switch (characterClass.key) {
      case 'lowercase':
        return config.includeLowercase;
      case 'uppercase':
        return config.includeUppercase;
      case 'digits':
        return config.includeDigits;
      case 'symbols':
        return config.includeSymbols;
      default:
        return false;
    }
  });
}

export function validatePasswordConfig(config: PasswordGeneratorConfig): string[] {
  const errors: string[] = [];

  if (!Number.isInteger(config.length)) {
    errors.push('Length must be a whole number.');
  } else if (config.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Length must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  } else if (config.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Length must be ${PASSWORD_MAX_LENGTH} characters or fewer.`);
  }

  const classes = activeClasses(config);
  if (classes.length === 0) {
    errors.push('Select at least one character class.');
  }

  const customLength = Array.from(config.customCharacters).length;
  if (customLength > MAX_GENERATOR_CHARACTERS) {
    errors.push(`Custom characters are limited to ${MAX_GENERATOR_CHARACTERS}.`);
  }
  if (Array.from(config.excludeCharacters).length > MAX_GENERATOR_CHARACTERS) {
    errors.push(`Excluded characters are limited to ${MAX_GENERATOR_CHARACTERS}.`);
  }

  if (classes.length > config.length && Number.isInteger(config.length)) {
    errors.push(
      'Length is smaller than the number of required character classes. One character cannot satisfy two guarantees.',
    );
  }

  const excluded = characterSet(config.excludeCharacters);
  const filteredClasses = classes.map((characterClass) => {
    const remaining = Array.from(characterClass.characters).filter(
      (character) => !excluded.has(character) && !isExcludedByCompatibilityFlags(character, config),
    );
    return { ...characterClass, remaining };
  });

  for (const characterClass of filteredClasses) {
    if (characterClass.remaining.length === 0) {
      errors.push(
        `The ${characterClass.label} class is selected, but every character in it is excluded.`,
      );
    }
  }

  return errors;
}

function isExcludedByCompatibilityFlags(
  character: string,
  config: PasswordGeneratorConfig,
): boolean {
  if (config.excludeSimilar && SIMILAR_CHARACTERS.includes(character)) return true;
  if (config.excludeAmbiguous && AMBIGUOUS_CHARACTERS.includes(character)) return true;
  return false;
}

function buildPool(config: PasswordGeneratorConfig): {
  pool: PoolEntry[];
  requiredMask: number;
  classLabels: string[];
} {
  const errors = validatePasswordConfig(config);
  if (errors.length > 0) throw new GeneratorConfigurationError(errors.join(' '));

  const classes = activeClasses(config);
  const excluded = characterSet(config.excludeCharacters);
  const poolMap = new Map<string, number>();
  let requiredMask = 0;
  const classLabels: string[] = [];

  classes.forEach((characterClass, index) => {
    const bit = 1 << index;
    requiredMask |= bit;
    classLabels.push(characterClass.label);
    for (const character of Array.from(characterClass.characters)) {
      if (excluded.has(character)) continue;
      if (isExcludedByCompatibilityFlags(character, config)) continue;
      poolMap.set(character, (poolMap.get(character) ?? 0) | bit);
    }
  });

  // Custom characters expand the pool but are not a required class. This is
  // deliberate: requiring a custom character would surprise users who add a
  // few extra symbols to increase the search space.
  for (const character of Array.from(config.customCharacters)) {
    if (excluded.has(character)) continue;
    if (!poolMap.has(character)) poolMap.set(character, 0);
  }

  if (config.includeSpace && !excluded.has(' ')) {
    if (!poolMap.has(' ')) poolMap.set(' ', 0);
  }

  const pool = Array.from(poolMap, ([character, mask]) => ({ character, mask }));
  if (pool.length === 0) {
    throw new GeneratorConfigurationError(
      'No characters remain after applying the selected exclusions.',
    );
  }

  return { pool, requiredMask, classLabels };
}

function logAdd(left: number, right: number): number {
  if (left === -Infinity) return right;
  if (right === -Infinity) return left;
  const max = Math.max(left, right);
  return max + Math.log1p(Math.exp(-Math.abs(left - right)));
}

/**
 * Generates a password uniformly from the space of strings that satisfy every
 * selected class guarantee. The exact constrained search space is computed with
 * dynamic programming, then sampled position by position.
 */
export function generatePassword(config: PasswordGeneratorConfig): PasswordGenerationResult {
  const { pool, requiredMask, classLabels } = buildPool(config);
  const classCount = classLabels.length;
  const maskCount = 1 << classCount;
  const length = config.length;

  const logCounts: number[][] = Array.from({ length: length + 1 }, () =>
    Array<number>(maskCount).fill(-Infinity),
  );
  const firstRow = logCounts[0];
  if (!firstRow) throw new Error('Internal DP allocation failed.');
  firstRow[0] = 0;

  for (let remainingLength = 1; remainingLength <= length; remainingLength += 1) {
    const row = logCounts[remainingLength];
    const previous = logCounts[remainingLength - 1];
    if (!row || !previous) throw new Error('Internal DP allocation failed.');
    for (let mask = 0; mask < maskCount; mask += 1) {
      let total = -Infinity;
      for (const entry of pool) {
        const nextMask = mask & ~entry.mask;
        const count = previous[nextMask] ?? -Infinity;
        total = logAdd(total, count);
      }
      row[mask] = total;
    }
  }

  const finalRow = logCounts[length];
  const totalLogCount = finalRow?.[requiredMask] ?? -Infinity;
  if (!Number.isFinite(totalLogCount) || totalLogCount === -Infinity) {
    throw new GeneratorConfigurationError(
      'The selected constraints produce no possible passwords at this length.',
    );
  }

  const selected: string[] = [];
  let remainingMask = requiredMask;

  for (let remainingLength = length; remainingLength > 0; remainingLength -= 1) {
    const previous = logCounts[remainingLength - 1];
    if (!previous) throw new Error('Internal DP allocation failed.');

    const weights: number[] = [];
    let maxWeight = -Infinity;
    for (const entry of pool) {
      const weightLog = previous[remainingMask & ~entry.mask] ?? -Infinity;
      weights.push(weightLog);
      if (weightLog > maxWeight) maxWeight = weightLog;
    }

    if (!Number.isFinite(maxWeight)) {
      throw new GeneratorConfigurationError(
        'The selected constraints cannot be satisfied with the current character pool.',
      );
    }

    const normalized = weights.map((weight) =>
      weight === -Infinity ? 0 : Math.exp(weight - maxWeight),
    );
    const totalWeight = normalized.reduce((sum, weight) => sum + weight, 0);
    let choice = secureRandomUnit() * totalWeight;
    let chosenIndex = normalized.length - 1;

    for (let index = 0; index < normalized.length; index += 1) {
      choice -= normalized[index] ?? 0;
      if (choice < 0) {
        chosenIndex = index;
        break;
      }
    }

    const chosen = pool[chosenIndex];
    if (!chosen) throw new Error('Internal sampling failure.');
    selected.push(chosen.character);
    remainingMask &= ~chosen.mask;
  }

  if (remainingMask !== 0) {
    throw new GeneratorConfigurationError(
      'The generated candidate failed an internal constraint check. No password was returned.',
    );
  }

  const entropyBits = totalLogCount / Math.LN2;
  return {
    value: selected.join(''),
    entropyBits,
    searchSpaceLog10: entropyBits / Math.log2(10),
    poolSize: pool.length,
    requiredClasses: classLabels,
  };
}

function validatePassphraseConfig(config: PassphraseGeneratorConfig): void {
  if (!Number.isInteger(config.wordCount)) {
    throw new GeneratorConfigurationError('Word count must be a whole number.');
  }
  if (config.wordCount < PASSPHRASE_MIN_WORDS) {
    throw new GeneratorConfigurationError(`Use at least ${PASSPHRASE_MIN_WORDS} words.`);
  }
  if (config.wordCount > PASSPHRASE_MAX_WORDS) {
    throw new GeneratorConfigurationError(`Use no more than ${PASSPHRASE_MAX_WORDS} words.`);
  }
  if (Array.from(config.separator).length > 8) {
    throw new GeneratorConfigurationError('The separator must be 8 characters or fewer.');
  }
}

const wordListCache = new Map<string, Promise<string[]>>();

function baseUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

export function loadWordList(id: 'eff-large' | 'eff-short'): Promise<string[]> {
  const cached = wordListCache.get(id);
  if (cached) return cached;

  const request = (async () => {
    let response: Response;
    try {
      response = await fetch(`${baseUrl()}wordlists/${id}.json`, {
        cache: 'force-cache',
        credentials: 'same-origin',
      });
    } catch {
      throw new WordListUnavailableError(
        'The word list could not be loaded. Check your connection and try again.',
      );
    }
    if (!response.ok) {
      throw new WordListUnavailableError(
        `The word list could not be loaded (HTTP ${response.status}).`,
      );
    }
    const data: unknown = await response.json();
    if (
      typeof data !== 'object' ||
      data === null ||
      !Array.isArray((data as { words?: unknown }).words)
    ) {
      throw new WordListUnavailableError('The word list has an unexpected format.');
    }
    const words = (data as { words: unknown[] }).words;
    if (words.length < 2 || !words.every((word) => typeof word === 'string' && word.length > 0)) {
      throw new WordListUnavailableError('The word list contains invalid entries.');
    }
    return Array.from(new Set(words as string[]));
  })();

  wordListCache.set(id, request);
  request.catch(() => wordListCache.delete(id));
  return request;
}

function capitalizeFirst(word: string): string {
  const characters = Array.from(word);
  const first = characters.shift();
  if (!first) return word;
  return first.toUpperCase() + characters.join('');
}

export async function generatePassphrase(
  config: PassphraseGeneratorConfig,
): Promise<PassphraseGenerationResult> {
  validatePassphraseConfig(config);

  let words: string[];
  let listSize: number;
  let wordListName: string;

  if (config.wordList === 'custom') {
    words = Array.from(new Set(config.customWords.filter((word) => word.length > 0)));
    listSize = words.length;
    wordListName = 'Custom dictionary';
    if (listSize < 2) {
      throw new GeneratorConfigurationError(
        'The custom dictionary needs at least two distinct words for a passphrase.',
      );
    }
  } else {
    words = await loadWordList(config.wordList);
    listSize = words.length;
    wordListName = WORD_LISTS[config.wordList].name;
  }

  const selectedWords: string[] = [];
  let capitalizationBits = 0;

  for (let index = 0; index < config.wordCount; index += 1) {
    const word = words[secureRandomInt(words.length)];
    if (!word) throw new WordListUnavailableError('The word list is empty.');
    let rendered = word;

    switch (config.capitalization) {
      case 'first':
        if (index === 0) rendered = capitalizeFirst(word);
        break;
      case 'all':
        rendered = capitalizeFirst(word);
        break;
      case 'random': {
        const variants = new Set([word, capitalizeFirst(word)]);
        capitalizationBits += Math.log2(variants.size);
        if (secureRandomInt(2) === 1) rendered = capitalizeFirst(word);
        break;
      }
      case 'none':
      default:
        break;
    }

    selectedWords.push(rendered);
  }

  let value = selectedWords.join(config.separator);
  let numberBits = 0;
  if (config.includeNumber) {
    const number = 10 + secureRandomInt(90);
    value += String(number);
    numberBits = Math.log2(90);
  }

  const wordBits = config.wordCount * Math.log2(listSize);
  const entropyBits = wordBits + capitalizationBits + numberBits;
  const warnings: string[] = [];

  if (config.wordList === 'custom' && listSize < 1296) {
    warnings.push(
      `This custom list has ${listSize.toLocaleString('en-US')} distinct words, so each word adds only ${Math.log2(listSize).toFixed(1)} bits.`,
    );
  }
  if (config.wordCount < 5) {
    warnings.push(
      'Fewer than five words is below the EFF recommendation. Six words is a stronger default.',
    );
  }
  if (config.capitalization === 'first' || config.capitalization === 'all') {
    warnings.push('Deterministic capitalization is known to the attacker and adds no entropy.');
  }
  if (config.includeNumber) {
    warnings.push(
      'A two-digit suffix adds about 6.5 bits. It is not a substitute for another word.',
    );
  }

  return {
    value,
    entropyBits,
    listSize,
    wordListName,
    wordCount: config.wordCount,
    breakdown: {
      words: wordBits,
      capitalization: capitalizationBits,
      number: numberBits,
    },
    warnings,
  };
}

export function clearWordListCache(): void {
  wordListCache.clear();
}
