import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PasswordAnalysisServiceImpl } from '../PasswordAnalysisService';
import { Dictionary } from '../interfaces';

// Mock zxcvbn
vi.mock('zxcvbn', () => ({
  default: vi.fn((password: string) => ({
    score: 2,
    feedback: {
      warning: '',
      suggestions: ['Add another word or two']
    },
    crack_times_display: {
      online_no_throttling_10_per_second: '2 hours',
      online_throttling_100_per_hour: '2 days',
      offline_slow_hashing_1e4_per_second: '2 weeks',
      offline_fast_hashing_1e10_per_second: '2 minutes'
    },
    calc_time: 5
  }))
}));

describe('PasswordAnalysisService', () => {
  let passwordAnalysisService: PasswordAnalysisServiceImpl;
  let mockDictionaries: Dictionary[];

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton instance for each test
    (PasswordAnalysisServiceImpl as any).instance = undefined;
    passwordAnalysisService = PasswordAnalysisServiceImpl.getInstance();

    mockDictionaries = [
      {
        id: 'company-dict',
        name: 'Company Dictionary',
        words: ['company', 'password', 'admin', 'test'],
        enabled: true,
        source: 'user'
      },
      {
        id: 'disabled-dict',
        name: 'Disabled Dictionary',
        words: ['disabled', 'word'],
        enabled: false,
        source: 'user'
      }
    ];
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = PasswordAnalysisServiceImpl.getInstance();
      const instance2 = PasswordAnalysisServiceImpl.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('analyzePassword', () => {
    it('should analyze password without custom dictionaries', () => {
      const result = passwordAnalysisService.analyzePassword('testpassword123');

      expect(result.score).toBe(2);
      expect(result.entropy).toBeGreaterThan(0);
      expect(result.customDictionaryMatches).toEqual([]);
      expect(result.generationMethod).toBe('manual');
    });

    it('should analyze password with custom dictionaries', () => {
      const result = passwordAnalysisService.analyzePassword('companypassword123', mockDictionaries);

      expect(result.customDictionaryMatches).toHaveLength(2);
      expect(result.customDictionaryMatches[0].matchedWord).toBe('company');
      expect(result.customDictionaryMatches[1].matchedWord).toBe('password');
    });

    it('should only use enabled dictionaries', () => {
      const result = passwordAnalysisService.analyzePassword('disabledword', mockDictionaries);

      expect(result.customDictionaryMatches).toHaveLength(0);
    });

    it('should reduce score for high severity matches', () => {
      const longWordDict: Dictionary = {
        id: 'long-words',
        name: 'Long Words',
        words: ['verylongword'],
        enabled: true,
        source: 'user'
      };

      const result = passwordAnalysisService.analyzePassword('verylongword123', [longWordDict]);

      expect(result.score).toBe(0); // Reduced from base score of 2
      expect(result.customDictionaryMatches[0].severity).toBe('high');
    });

    it('should add custom feedback for dictionary matches', () => {
      const result = passwordAnalysisService.analyzePassword('companytest', mockDictionaries);

      expect(result.feedback.warning).toContain('Company Dictionary');
      expect(result.feedback.suggestions).toContain('Avoid using words from organization-specific dictionaries');
    });
  });

  describe('findDictionaryMatches', () => {
    it('should find exact word matches', () => {
      const matches = passwordAnalysisService.findDictionaryMatches('password123', mockDictionaries);

      expect(matches.length).toBeGreaterThanOrEqual(1);
      const passwordMatch = matches.find(m => m.matchedWord === 'password');
      expect(passwordMatch).toBeDefined();
      expect(passwordMatch?.position).toBe(0);
      expect(passwordMatch?.dictionaryName).toBe('Company Dictionary');
    });

    it('should find multiple matches', () => {
      const matches = passwordAnalysisService.findDictionaryMatches('companypassword', mockDictionaries);

      expect(matches.length).toBeGreaterThanOrEqual(2);
      const companyMatch = matches.find(m => m.matchedWord === 'company');
      const passwordMatch = matches.find(m => m.matchedWord === 'password');
      expect(companyMatch).toBeDefined();
      expect(passwordMatch).toBeDefined();
    });

    it('should be case insensitive', () => {
      const matches = passwordAnalysisService.findDictionaryMatches('COMPANY', mockDictionaries);

      expect(matches).toHaveLength(1);
      expect(matches[0].matchedWord).toBe('company');
    });

    it('should find overlapping matches', () => {
      const overlapDict: Dictionary = {
        id: 'overlap',
        name: 'Overlap Dict',
        words: ['test', 'testing'],
        enabled: true,
        source: 'user'
      };

      const matches = passwordAnalysisService.findDictionaryMatches('testing', [overlapDict]);

      expect(matches).toHaveLength(2);
      expect(matches.map(m => m.matchedWord)).toContain('test');
      expect(matches.map(m => m.matchedWord)).toContain('testing');
    });

    it('should determine severity based on word length', () => {
      const severityDict: Dictionary = {
        id: 'severity',
        name: 'Severity Dict',
        words: ['ab', 'test', 'verylongword'],
        enabled: true,
        source: 'user'
      };

      // Test words in middle of password to avoid position-based severity increase
      const shortMatch = passwordAnalysisService.findDictionaryMatches('xabx', [severityDict]);
      const mediumMatch = passwordAnalysisService.findDictionaryMatches('xtestx', [severityDict]);
      const longMatch = passwordAnalysisService.findDictionaryMatches('xverylongwordx', [severityDict]);

      expect(shortMatch[0].severity).toBe('low');
      expect(mediumMatch[0].severity).toBe('medium');
      expect(longMatch[0].severity).toBe('high');
    });

    it('should increase severity for words at beginning or end', () => {
      const matches1 = passwordAnalysisService.findDictionaryMatches('test123', mockDictionaries);
      const matches2 = passwordAnalysisService.findDictionaryMatches('123test', mockDictionaries);

      expect(matches1[0].severity).toBe('high'); // 'test' at beginning
      expect(matches2[0].severity).toBe('high'); // 'test' at end
    });

    it('should remove duplicate matches', () => {
      const duplicateDict: Dictionary = {
        id: 'duplicate',
        name: 'Duplicate Dict',
        words: ['test', 'test'], // Duplicate word
        enabled: true,
        source: 'user'
      };

      const matches = passwordAnalysisService.findDictionaryMatches('test', [duplicateDict]);

      expect(matches).toHaveLength(1);
    });

    it('should sort matches by position', () => {
      const matches = passwordAnalysisService.findDictionaryMatches('admincompany', mockDictionaries);

      expect(matches[0].matchedWord).toBe('admin'); // Position 0
      expect(matches[1].matchedWord).toBe('company'); // Position 5
    });
  });

  describe('entropy calculation', () => {
    it('should calculate entropy for different character sets', () => {
      const lowercase = passwordAnalysisService.analyzePassword('abcdef');
      const mixed = passwordAnalysisService.analyzePassword('AbCdEf');
      const withNumbers = passwordAnalysisService.analyzePassword('AbCdEf123');
      const withSymbols = passwordAnalysisService.analyzePassword('AbCdEf123!');

      expect(mixed.entropy).toBeGreaterThan(lowercase.entropy);
      expect(withNumbers.entropy).toBeGreaterThan(mixed.entropy);
      expect(withSymbols.entropy).toBeGreaterThan(withNumbers.entropy);
    });

    it('should increase entropy with password length', () => {
      const short = passwordAnalysisService.analyzePassword('abc');
      const long = passwordAnalysisService.analyzePassword('abcdefghijk');

      expect(long.entropy).toBeGreaterThan(short.entropy);
    });
  });
});