import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  clearWordListCache,
  generatePassphrase,
  generatePassword,
  GeneratorConfigurationError,
  loadWordList,
  mapRandomWordToIndex,
  SecureRandomUnavailableError,
  secureRandomInt,
  validatePasswordConfig,
  WORD_LISTS,
} from '../crypto';
import type { PasswordGeneratorConfig, PassphraseGeneratorConfig } from '../../types';

const BASE: PasswordGeneratorConfig = {
  length: 12,
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

function hasEveryClass(value: string): boolean {
  return (
    /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value) && /[^a-zA-Z0-9]/.test(value)
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  clearWordListCache();
});

describe('unbiased random mapping', () => {
  it('rejects the incomplete modulo tail', () => {
    expect(mapRandomWordToIndex(0, 3)).toBe(0);
    expect(mapRandomWordToIndex(1, 3)).toBe(1);
    expect(mapRandomWordToIndex(2, 3)).toBe(2);
    expect(mapRandomWordToIndex(0xffff_ffff, 3)).toBeNull();
  });

  it('rejects the full tail for a ten-way choice', () => {
    // 2^32 mod 10 = 6, so the top six words cannot be used without bias.
    expect(mapRandomWordToIndex(4_294_967_289, 10)).toBe(9);
    expect(mapRandomWordToIndex(4_294_967_290, 10)).toBeNull();
    expect(mapRandomWordToIndex(4_294_967_295, 10)).toBeNull();
  });

  it('keeps secureRandomInt inside the requested bound', () => {
    const seen = new Set<number>();
    for (let index = 0; index < 500; index += 1) {
      const value = secureRandomInt(7);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(7);
      seen.add(value);
    }
    expect(seen.size).toBe(7);
  });

  it('rejects invalid bounds', () => {
    expect(() => mapRandomWordToIndex(0, 0)).toThrow(GeneratorConfigurationError);
    expect(() => secureRandomInt(0)).toThrow(GeneratorConfigurationError);
    expect(() => secureRandomInt(2 ** 32 + 1)).toThrow(GeneratorConfigurationError);
  });
});

describe('password generation', () => {
  it('satisfies all four class guarantees and the exact length', () => {
    for (let index = 0; index < 80; index += 1) {
      const result = generatePassword(BASE);
      expect(Array.from(result.value)).toHaveLength(BASE.length);
      expect(hasEveryClass(result.value)).toBe(true);
      expect(result.requiredClasses).toHaveLength(4);
      expect(result.entropyBits).toBeGreaterThan(0);
    }
  });

  it('returns an exact uniform-search-space entropy for one class', () => {
    const result = generatePassword({
      ...BASE,
      length: 20,
      includeUppercase: false,
      includeDigits: false,
      includeSymbols: false,
    });
    expect(result.entropyBits).toBeCloseTo(20 * Math.log2(26), 8);
    expect(result.poolSize).toBe(26);
  });

  it('never includes excluded look-alikes', () => {
    const result = generatePassword({
      ...BASE,
      length: 40,
      excludeSimilar: true,
    });
    expect(result.value).not.toMatch(/[Il1Lo0O]/);
  });

  it('adds a space to the pool without silently forcing it to appear', () => {
    const without = generatePassword(BASE);
    const withSpace = generatePassword({ ...BASE, includeSpace: true });
    expect(withSpace.poolSize).toBe(without.poolSize + 1);
  });

  it('fails closed when every character in a selected class is excluded', () => {
    const errors = validatePasswordConfig({
      ...BASE,
      excludeCharacters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    });
    expect(errors.join(' ')).toMatch(/uppercase/i);
    expect(() =>
      generatePassword({ ...BASE, excludeCharacters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' }),
    ).toThrow(GeneratorConfigurationError);
  });

  it('rejects impossible length and empty class configurations', () => {
    expect(validatePasswordConfig({ ...BASE, length: 3 }).join(' ')).toMatch(/length/i);
    expect(
      validatePasswordConfig({
        ...BASE,
        includeLowercase: false,
        includeUppercase: false,
        includeDigits: false,
        includeSymbols: false,
      }).join(' '),
    ).toMatch(/at least one/i);
  });

  it('handles Unicode custom characters by code point', () => {
    const result = generatePassword({
      ...BASE,
      length: 14,
      customCharacters: 'é☃',
    });
    expect(Array.from(result.value)).toHaveLength(14);
    expect(result.entropyBits).toBeGreaterThan(14 * Math.log2(26));
  });

  it('throws a specific error when secure randomness is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => generatePassword(BASE)).toThrow(SecureRandomUnavailableError);
  });
});

describe('passphrase generation', () => {
  const mockWords = Array.from({ length: 100 }, (_, index) => `word${index}`);
  const config: PassphraseGeneratorConfig = {
    wordCount: 6,
    wordList: 'eff-large',
    customWords: [],
    separator: '-',
    capitalization: 'none',
    includeNumber: false,
  };

  function mockWordList(words = mockWords): void {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ words }),
      })),
    );
  }

  it('selects the requested number of words and computes entropy from the list size', async () => {
    mockWordList();
    const result = await generatePassphrase(config);
    expect(result.value.split('-')).toHaveLength(6);
    expect(result.entropyBits).toBeCloseTo(6 * Math.log2(100), 8);
    expect(result.listSize).toBe(100);
    for (const word of result.value.split('-')) {
      expect(mockWords).toContain(word);
    }
  });

  it('adds the two-digit suffix and its entropy', async () => {
    mockWordList();
    const result = await generatePassphrase({ ...config, includeNumber: true });
    expect(result.value).toMatch(/\d{2}$/);
    expect(result.entropyBits).toBeCloseTo(6 * Math.log2(100) + Math.log2(90), 8);
    expect(result.breakdown.number).toBeCloseTo(Math.log2(90), 8);
  });

  it('adds one independent case decision per word for random capitalization', async () => {
    mockWordList();
    const result = await generatePassphrase({ ...config, capitalization: 'random' });
    expect(result.breakdown.capitalization).toBeCloseTo(6, 8);
  });

  it('does not claim entropy for deterministic capitalization', async () => {
    mockWordList();
    const result = await generatePassphrase({ ...config, capitalization: 'all' });
    expect(result.breakdown.capitalization).toBe(0);
    expect(result.warnings.join(' ')).toMatch(/no entropy/i);
  });

  it('rejects one-word custom lists and invalid word counts/separators', async () => {
    await expect(
      generatePassphrase({
        ...config,
        wordList: 'custom',
        customWords: ['onlyone'],
      }),
    ).rejects.toBeInstanceOf(GeneratorConfigurationError);
    await expect(generatePassphrase({ ...config, wordCount: 2 })).rejects.toThrow(/at least 3/i);
    await expect(generatePassphrase({ ...config, separator: '-----------' })).rejects.toThrow(
      /separator/i,
    );
  });

  it('reports a word list load failure without returning a weak fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503 })),
    );
    await expect(generatePassphrase(config)).rejects.toThrow(/could not be loaded/i);
  });

  it('ships complete, unique official EFF word lists', async () => {
    for (const [id, expectedSize] of [
      ['eff-large', 7776],
      ['eff-short', 1296],
    ] as const) {
      const raw = readFileSync(resolve(process.cwd(), 'public', 'wordlists', `${id}.json`), 'utf8');
      const parsed = JSON.parse(raw) as { words: string[] };
      expect(parsed.words).toHaveLength(expectedSize);
      expect(new Set(parsed.words).size).toBe(expectedSize);
      expect(WORD_LISTS[id].size).toBe(expectedSize);
    }
  });

  it('loads a real word list through the base-relative fetch path', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        expect(String(url)).toContain('wordlists/eff-large.json');
        return {
          ok: true,
          json: async () => ({
            words: Array.from({ length: 7776 }, (_, index) => `w${index}`),
          }),
        };
      }),
    );
    const words = await loadWordList('eff-large');
    expect(words).toHaveLength(7776);
  });
});
