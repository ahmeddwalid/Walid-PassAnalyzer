import { beforeAll, describe, expect, it } from 'vitest';
import {
  AnalysisError,
  analyzePassword,
  isAnalyzerReady,
  loadAnalyzer,
  verdictFor,
} from '../analysis';
import type { Dictionary } from '../../types';

const customDictionary: Dictionary = {
  id: 'org-terms',
  name: 'Org terms',
  words: ['falcon', 'orion'],
  enabled: true,
  source: 'user',
  importedAt: new Date('2026-01-01T00:00:00Z'),
};

beforeAll(async () => {
  await loadAnalyzer();
});

describe('password analysis', () => {
  it('loads the model and reports the coarse score and attacks', async () => {
    expect(isAnalyzerReady()).toBe(true);
    const result = await analyzePassword('Tr0ub4dor&3');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(4);
    expect(result.attacks).toHaveLength(4);
    expect(result.guessesLog10).toBeGreaterThan(0);
    expect(result.calcTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.codePointLength).toBe(11);
    expect(verdictFor(result.score).label).toBeTruthy();
  });

  it('does not retain the candidate or a matched token in the result object', async () => {
    const candidate = 'Tr0ub4dor&3';
    const result = await analyzePassword(candidate);
    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toContain(candidate.toLowerCase());
    expect(serialized).not.toContain('tr0ub4dor');
    expect(result.patterns.length).toBeGreaterThan(0);
  });

  it('analyzes whitespace-only input instead of silently clearing it', async () => {
    const result = await analyzePassword('   ');
    expect(result.onlyWhitespace).toBe(true);
    expect(result.score).toBe(0);
    expect(result.codePointLength).toBe(3);
  });

  it('supports Unicode candidates and keeps code-point length', async () => {
    const result = await analyzePassword('pässwörd-☃-2026');
    expect(result.hasUnicode).toBe(true);
    expect(result.codePointLength).toBe(15);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('re-estimates with imported dictionary terms without exposing them', async () => {
    const result = await analyzePassword('orion-falcon-2024', [customDictionary]);
    expect(result.customMatches).toHaveLength(2);
    expect(result.customMatches[0]).toMatchObject({ start: 1, end: 5 });
    expect(result.customMatches[1]).toMatchObject({ start: 7, end: 12 });
    expect(result.dictionaryAdjusted).toBe(true);
    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toContain('falcon');
    expect(serialized).not.toContain('"orion"');
  });

  it('ignores disabled dictionaries', async () => {
    const result = await analyzePassword('orion-falcon-2024', [
      { ...customDictionary, enabled: false },
    ]);
    expect(result.customMatches).toHaveLength(0);
  });

  it('rejects an empty candidate at the service boundary', async () => {
    await expect(analyzePassword('')).rejects.toBeInstanceOf(AnalysisError);
  });

  it('computes pattern coverage without treating brute force as a pattern', async () => {
    const result = await analyzePassword('correcthorsebatterystaple');
    expect(result.patternCoverage).toBeGreaterThan(0);
    expect(result.patternCoverage).toBeLessThanOrEqual(1);
    for (const pattern of result.patterns) {
      expect(pattern.start).toBeGreaterThanOrEqual(1);
      expect(pattern.end).toBeGreaterThanOrEqual(pattern.start);
      expect(pattern.note.length).toBeGreaterThan(0);
    }
  });

  it('refuses to truncate a candidate above the model limit', async () => {
    await expect(analyzePassword('a'.repeat(257))).rejects.toThrow(/256 characters/);
  });
});
