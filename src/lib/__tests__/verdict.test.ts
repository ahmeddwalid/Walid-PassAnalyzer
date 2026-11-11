import { describe, expect, it } from 'vitest';
import { buildRecommendations } from '../recommendations';
import { buildVerdict } from '../verdict';
import type { AnalysisResult } from '../../types';

function makeResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    score: 4,
    guesses: 1e18,
    guessesLog10: 18,
    attacks: [
      {
        key: 'online_throttling_100_per_hour',
        label: 'Throttled online',
        model: 'online',
        rateLabel: '100 attempts / hour',
        seconds: 1e16,
        display: 'centuries',
      },
      {
        key: 'online_no_throttling_10_per_second',
        label: 'Unthrottled online',
        model: 'online',
        rateLabel: '10 attempts / second',
        seconds: 1e15,
        display: 'centuries',
      },
      {
        key: 'offline_slow_hashing_1e4_per_second',
        label: 'Offline, slow hash',
        model: 'offline',
        rateLabel: '10,000 guesses / second',
        seconds: 1e14,
        display: 'centuries',
      },
      {
        key: 'offline_fast_hashing_1e10_per_second',
        label: 'Offline, fast hash',
        model: 'offline',
        rateLabel: '10 billion guesses / second',
        seconds: 1e10,
        display: 'centuries',
      },
    ],
    patterns: [],
    feedback: { warning: '', suggestions: [] },
    customMatches: [],
    dictionaryAdjusted: false,
    calcTimeMs: 2,
    codePointLength: 20,
    onlyWhitespace: false,
    hasUnicode: false,
    patternCoverage: 0,
    ...overrides,
  };
}

describe('buildVerdict', () => {
  it('marks strong candidates as Strong when fast offline resistance exceeds a year', () => {
    const verdict = buildVerdict(makeResult({ score: 4 }));
    expect(verdict.tier).toBe(4);
    expect(verdict.label).toBe('Strong');
    expect(verdict.qualifier).toBeNull();
  });

  it('caps high zxcvbn scores when a fast offline attack is under one year', () => {
    const result = makeResult({
      score: 4,
      patterns: [
        {
          kind: 'dictionary',
          start: 1,
          end: 7,
          length: 7,
          guessesLog10: 3,
          note: 'Matches a common word.',
        },
      ],
      attacks: [
        ...makeResult().attacks.slice(0, 3),
        {
          key: 'offline_fast_hashing_1e10_per_second',
          label: 'Offline, fast hash',
          model: 'offline',
          rateLabel: '10 billion guesses / second',
          seconds: 28_800,
          display: '8 hours',
        },
      ],
    });
    const verdict = buildVerdict(result);
    expect(verdict.tier).toBe(2);
    expect(verdict.label).toBe('Fair');
    expect(verdict.qualifier).toBe('Fast offline risk');
    expect(verdict.explanation).toContain('8 hours');
  });

  it('rates high-score candidates surviving days to months on fast hashes as Good', () => {
    const result = makeResult({
      score: 4,
      attacks: [
        ...makeResult().attacks.slice(0, 3),
        {
          key: 'offline_fast_hashing_1e10_per_second',
          label: 'Offline, fast hash',
          model: 'offline',
          rateLabel: '10 billion guesses / second',
          seconds: 10_000_000,
          display: '4 months',
        },
      ],
    });
    const verdict = buildVerdict(result);
    expect(verdict.tier).toBe(3);
    expect(verdict.label).toBe('Good');
    expect(verdict.qualifier).toBeNull();
    expect(verdict.explanation).toContain('4 months');
  });

  it('caps score when high-severity custom dictionary terms match', () => {
    const verdict = buildVerdict(
      makeResult({
        score: 4,
        customMatches: [
          {
            dictionaryId: 'org',
            dictionaryName: 'Corp',
            start: 1,
            end: 6,
            wordLength: 6,
            severity: 'high',
          },
        ],
      }),
    );
    expect(verdict.tier).toBe(2);
    expect(verdict.label).toBe('Fair');
    expect(verdict.qualifier).toBe('Custom list match');
  });

  it('flags whitespace-only candidates as Very weak', () => {
    const verdict = buildVerdict(makeResult({ score: 0, onlyWhitespace: true }));
    expect(verdict.tier).toBe(0);
    expect(verdict.label).toBe('Very weak');
  });

  it('recommends adding length when score is high but fast offline attacks succeed under a year', () => {
    const recs = buildRecommendations(
      makeResult({
        score: 4,
        attacks: [
          ...makeResult().attacks.slice(0, 3),
          {
            key: 'offline_fast_hashing_1e10_per_second',
            label: 'Offline, fast hash',
            model: 'offline',
            rateLabel: '10 billion guesses / second',
            seconds: 10,
            display: '10 seconds',
          },
        ],
      }),
    );
    expect(recs[0]?.title).toMatch(/fast offline attacks/i);
  });
});
