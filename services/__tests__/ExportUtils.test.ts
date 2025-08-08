import { describe, it, expect, beforeEach } from 'vitest';
import { createAnalysisData, generateExportFilename, validateAnalysisData } from '../ExportUtils';
import { ZxcvbnResult } from '../../types';
import { AnalysisData } from '../interfaces';

describe('ExportUtils', () => {
  let mockZxcvbnResult: ZxcvbnResult;

  beforeEach(() => {
    mockZxcvbnResult = {
      score: 3,
      feedback: {
        warning: 'This is a common password',
        suggestions: ['Add more words', 'Use uppercase letters']
      },
      crack_times_display: {
        online_no_throttling_10_per_second: '3 days',
        online_throttling_100_per_hour: '8 years',
        offline_slow_hashing_1e4_per_second: '2 hours',
        offline_fast_hashing_1e10_per_second: '1 second'
      },
      calc_time: 5
    };
  });

  describe('createAnalysisData', () => {
    it('should convert zxcvbn result to AnalysisData format', () => {
      const password = 'testpassword123';
      const customNotes = 'Test analysis notes';

      const result = createAnalysisData(password, mockZxcvbnResult, customNotes);

      expect(result).toEqual({
        timestamp: expect.any(Date),
        passwordLength: password.length,
        strengthScore: mockZxcvbnResult.score,
        crackTimes: {
          online_no_throttling_10_per_second: '3 days',
          online_throttling_100_per_hour: '8 years',
          offline_slow_hashing_1e4_per_second: '2 hours',
          offline_fast_hashing_1e10_per_second: '1 second'
        },
        feedback: {
          warning: 'This is a common password',
          suggestions: ['Add more words', 'Use uppercase letters']
        },
        customNotes: 'Test analysis notes'
      });
    });

    it('should handle missing custom notes', () => {
      const password = 'testpassword123';

      const result = createAnalysisData(password, mockZxcvbnResult);

      expect(result.customNotes).toBeUndefined();
      expect(result.passwordLength).toBe(password.length);
      expect(result.strengthScore).toBe(mockZxcvbnResult.score);
    });

    it('should handle empty feedback', () => {
      const zxcvbnWithEmptyFeedback: ZxcvbnResult = {
        ...mockZxcvbnResult,
        feedback: {
          warning: '',
          suggestions: []
        }
      };

      const result = createAnalysisData('password', zxcvbnWithEmptyFeedback);

      expect(result.feedback.warning).toBe('');
      expect(result.feedback.suggestions).toEqual([]);
    });

    it('should set timestamp to current date', () => {
      const beforeTime = new Date();
      const result = createAnalysisData('password', mockZxcvbnResult);
      const afterTime = new Date();

      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('generateExportFilename', () => {
    it('should generate PDF filename with default prefix', () => {
      const result = generateExportFilename('pdf');
      
      expect(result).toMatch(/^password-analysis-\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    it('should generate text filename with default prefix', () => {
      const result = generateExportFilename('text');
      
      expect(result).toMatch(/^password-analysis-\d{4}-\d{2}-\d{2}\.txt$/);
    });

    it('should use custom prefix when provided', () => {
      const result = generateExportFilename('pdf', 'custom-report');
      
      expect(result).toMatch(/^custom-report-\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    it('should include current date in filename', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = generateExportFilename('pdf');
      
      expect(result).toContain(today);
    });

    it('should handle different formats correctly', () => {
      const pdfResult = generateExportFilename('pdf');
      const textResult = generateExportFilename('text');
      
      expect(pdfResult.endsWith('.pdf')).toBe(true);
      expect(textResult.endsWith('.txt')).toBe(true);
    });
  });

  describe('validateAnalysisData', () => {
    let validAnalysisData: AnalysisData;

    beforeEach(() => {
      validAnalysisData = {
        timestamp: new Date(),
        passwordLength: 12,
        strengthScore: 3,
        crackTimes: {
          online_no_throttling_10_per_second: '3 days',
          online_throttling_100_per_hour: '8 years',
          offline_slow_hashing_1e4_per_second: '2 hours',
          offline_fast_hashing_1e10_per_second: '1 second'
        },
        feedback: {
          warning: 'Warning message',
          suggestions: ['Suggestion 1', 'Suggestion 2']
        }
      };
    });

    it('should return true for valid analysis data', () => {
      const result = validateAnalysisData(validAnalysisData);
      
      expect(result).toBe(true);
    });

    it('should return false when timestamp is missing', () => {
      const invalidData = { ...validAnalysisData, timestamp: null as any };
      
      const result = validateAnalysisData(invalidData);
      
      expect(result).toBe(false);
    });

    it('should return false when passwordLength is not a number', () => {
      const invalidData = { ...validAnalysisData, passwordLength: 'invalid' as any };
      
      const result = validateAnalysisData(invalidData);
      
      expect(result).toBe(false);
    });

    it('should return false when strengthScore is not a number', () => {
      const invalidData = { ...validAnalysisData, strengthScore: 'invalid' as any };
      
      const result = validateAnalysisData(invalidData);
      
      expect(result).toBe(false);
    });

    it('should return false when crackTimes is missing', () => {
      const invalidData = { ...validAnalysisData, crackTimes: null as any };
      
      const result = validateAnalysisData(invalidData);
      
      expect(result).toBe(false);
    });

    it('should return false when feedback is missing', () => {
      const invalidData = { ...validAnalysisData, feedback: null as any };
      
      const result = validateAnalysisData(invalidData);
      
      expect(result).toBe(false);
    });

    it('should return true when optional customNotes is missing', () => {
      const dataWithoutNotes = { ...validAnalysisData };
      delete dataWithoutNotes.customNotes;
      
      const result = validateAnalysisData(dataWithoutNotes);
      
      expect(result).toBe(true);
    });

    it('should handle completely invalid data', () => {
      const result = validateAnalysisData(null as any);
      
      expect(result).toBe(false);
    });

    it('should handle empty object', () => {
      const result = validateAnalysisData({} as any);
      
      expect(result).toBe(false);
    });
  });
});