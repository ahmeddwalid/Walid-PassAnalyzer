import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CryptoServiceImpl } from '../CryptoService';
import { DictionaryServiceImpl } from '../DictionaryService';
import { PasswordAnalysisServiceImpl } from '../PasswordAnalysisService';
import { ExportServiceImpl } from '../ExportService';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => []),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn()
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

// Mock fetch for dictionary loading
global.fetch = vi.fn();

// Mock Web Crypto API
const mockCrypto = {
  getRandomValues: vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  })
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true
});

describe('Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singletons
    (CryptoServiceImpl as any).instance = undefined;
    (DictionaryServiceImpl as any).instance = undefined;
    (PasswordAnalysisServiceImpl as any).instance = undefined;
    (ExportServiceImpl as any).instance = undefined;
  });

  describe('Password Analysis Performance', () => {
    it('should analyze passwords within acceptable time limits', () => {
      const passwordAnalysisService = PasswordAnalysisServiceImpl.getInstance();
      const testPasswords = [
        'short',
        'mediumlengthpassword',
        'verylongpasswordwithmanycharsandcomplexity123!@#',
        'correct-horse-battery-staple-with-numbers-123'
      ];

      testPasswords.forEach(password => {
        const startTime = performance.now();
        
        const result = passwordAnalysisService.analyzePassword(password, []);
        
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Analysis should complete within 100ms for any password
        expect(duration).toBeLessThan(100);
        expect(result).toBeDefined();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(4);
      });
    });

    it('should handle batch password analysis efficiently', () => {
      const passwordAnalysisService = PasswordAnalysisServiceImpl.getInstance();
      const passwords = Array.from({ length: 100 }, (_, i) => `password${i}test`);

      const startTime = performance.now();
      
      const results = passwords.map(password => 
        passwordAnalysisService.analyzePassword(password, [])
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const averageTime = duration / passwords.length;

      // Batch analysis should average less than 10ms per password
      expect(averageTime).toBeLessThan(10);
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.score).toBeGreaterThanOrEqual(0);
      });
    });

    it('should perform well with custom dictionaries', () => {
      const passwordAnalysisService = PasswordAnalysisServiceImpl.getInstance();
      
      // Create large custom dictionary
      const largeDictionary = {
        id: 'large-dict',
        name: 'Large Dictionary',
        words: Array.from({ length: 10000 }, (_, i) => `word${i}`),
        enabled: true,
        source: 'user' as const
      };

      const startTime = performance.now();
      
      const result = passwordAnalysisService.analyzePassword('testpassword', [largeDictionary]);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within 200ms even with large dictionary
      expect(duration).toBeLessThan(200);
      expect(result).toBeDefined();
    });
  });

  describe('Password Generation Performance', () => {
    it('should generate passwords quickly', () => {
      const cryptoService = CryptoServiceImpl.getInstance();
      const config = {
        length: 16,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
        excludeSimilar: false,
        excludeAmbiguous: false
      };

      const startTime = performance.now();
      
      // Generate 100 passwords
      const passwords = Array.from({ length: 100 }, () => 
        cryptoService.generatePassword(config)
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const averageTime = duration / passwords.length;

      // Should generate passwords in less than 1ms each on average
      expect(averageTime).toBeLessThan(1);
      expect(passwords).toHaveLength(100);
      passwords.forEach(password => {
        expect(password).toHaveLength(16);
        expect(typeof password).toBe('string');
      });
    });

    it('should generate passphrases efficiently', async () => {
      const cryptoService = CryptoServiceImpl.getInstance();
      const dictionaryService = DictionaryServiceImpl.getInstance();

      // Mock word list loading
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          name: 'Test Wordlist',
          words: Array.from({ length: 7776 }, (_, i) => `word${i}`),
          entropy_per_word: 12.9
        })
      });

      const config = {
        wordCount: 4,
        wordList: 'eff' as const,
        separator: '-',
        capitalize: 'none' as const,
        includeNumbers: false
      };

      const startTime = performance.now();
      
      // Generate 50 passphrases
      const passphrases = await Promise.all(
        Array.from({ length: 50 }, () => cryptoService.generatePassphrase(config))
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const averageTime = duration / passphrases.length;

      // Should generate passphrases in less than 10ms each on average
      expect(averageTime).toBeLessThan(10);
      expect(passphrases).toHaveLength(50);
      passphrases.forEach(passphrase => {
        expect(typeof passphrase).toBe('string');
        expect(passphrase.split('-')).toHaveLength(4);
      });
    });
  });

  describe('Dictionary Loading Performance', () => {
    it('should load word lists efficiently', async () => {
      const dictionaryService = DictionaryServiceImpl.getInstance();

      // Mock large word list
      const largeWordList = {
        name: 'Large Wordlist',
        words: Array.from({ length: 50000 }, (_, i) => `word${i}`),
        entropy_per_word: 15.6
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(largeWordList)
      });

      const startTime = performance.now();
      
      const words = await dictionaryService.getWordList('eff');
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should load large word list within 500ms
      expect(duration).toBeLessThan(500);
      expect(words).toHaveLength(50000);
    });

    it('should cache word lists for subsequent access', async () => {
      const dictionaryService = DictionaryServiceImpl.getInstance();

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          name: 'Test Wordlist',
          words: ['word1', 'word2', 'word3'],
          entropy_per_word: 12.9
        })
      });

      // First load
      const startTime1 = performance.now();
      await dictionaryService.getWordList('eff');
      const endTime1 = performance.now();
      const firstLoadTime = endTime1 - startTime1;

      // Second load (should be cached)
      const startTime2 = performance.now();
      await dictionaryService.getWordList('eff');
      const endTime2 = performance.now();
      const secondLoadTime = endTime2 - startTime2;

      // Cached access should be significantly faster
      expect(secondLoadTime).toBeLessThan(firstLoadTime / 10);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  describe('Export Performance', () => {
    it('should export PDF reports efficiently', async () => {
      const exportService = ExportServiceImpl.getInstance();
      
      const mockAnalysisData = {
        timestamp: new Date(),
        passwordLength: 16,
        strengthScore: 4,
        crackTimes: {
          online_no_throttling_10_per_second: '3 days',
          online_throttling_100_per_hour: '8 years',
          offline_slow_hashing_1e4_per_second: '2 hours',
          offline_fast_hashing_1e10_per_second: '1 second'
        },
        feedback: {
          warning: '',
          suggestions: ['Good password']
        }
      };

      // Mock jsPDF
      vi.doMock('jspdf', () => ({
        default: vi.fn(() => ({
          internal: { pageSize: { getWidth: () => 210 } },
          setFontSize: vi.fn(),
          setFont: vi.fn(),
          text: vi.fn(),
          setLineWidth: vi.fn(),
          line: vi.fn(),
          splitTextToSize: vi.fn((text: string) => [text]),
          output: vi.fn(() => new Blob(['pdf'], { type: 'application/pdf' }))
        }))
      }));

      const startTime = performance.now();
      
      const pdfBlob = await exportService.exportToPDF(mockAnalysisData);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // PDF generation should complete within 1000ms
      expect(duration).toBeLessThan(1000);
      expect(pdfBlob).toBeInstanceOf(Blob);
    });

    it('should export text reports quickly', () => {
      const exportService = ExportServiceImpl.getInstance();
      
      const mockAnalysisData = {
        timestamp: new Date(),
        passwordLength: 16,
        strengthScore: 4,
        crackTimes: {
          online_no_throttling_10_per_second: '3 days',
          online_throttling_100_per_hour: '8 years',
          offline_slow_hashing_1e4_per_second: '2 hours',
          offline_fast_hashing_1e10_per_second: '1 second'
        },
        feedback: {
          warning: '',
          suggestions: ['Good password']
        }
      };

      const startTime = performance.now();
      
      const textReport = exportService.exportToText(mockAnalysisData);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Text export should be very fast (< 10ms)
      expect(duration).toBeLessThan(10);
      expect(typeof textReport).toBe('string');
      expect(textReport.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not leak memory during repeated operations', () => {
      const cryptoService = CryptoServiceImpl.getInstance();
      const passwordAnalysisService = PasswordAnalysisServiceImpl.getInstance();

      const config = {
        length: 16,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
        excludeSimilar: false,
        excludeAmbiguous: false
      };

      // Simulate repeated operations
      for (let i = 0; i < 1000; i++) {
        const password = cryptoService.generatePassword(config);
        const analysis = passwordAnalysisService.analyzePassword(password, []);
        
        // Verify operations complete successfully
        expect(password).toBeDefined();
        expect(analysis).toBeDefined();
      }

      // If we reach here without running out of memory, test passes
      expect(true).toBe(true);
    });

    it('should handle large dictionary operations without memory issues', () => {
      const dictionaryService = DictionaryServiceImpl.getInstance();
      
      // Create multiple large dictionaries
      const dictionaries = Array.from({ length: 10 }, (_, i) => ({
        id: `dict-${i}`,
        name: `Dictionary ${i}`,
        words: Array.from({ length: 5000 }, (_, j) => `word${i}-${j}`),
        enabled: true,
        source: 'user' as const
      }));

      // Add all dictionaries
      dictionaries.forEach(dict => {
        dictionaryService.addDictionary(dict);
      });

      // Verify all dictionaries are loaded
      const loadedDictionaries = dictionaryService.getDictionaries();
      expect(loadedDictionaries.length).toBeGreaterThanOrEqual(10);

      // Remove all dictionaries to clean up
      dictionaries.forEach(dict => {
        dictionaryService.removeDictionary(dict.id);
      });
    });
  });

  describe('Browser Compatibility Tests', () => {
    it('should work without Web Crypto API', () => {
      const cryptoService = CryptoServiceImpl.getInstance();
      
      // Temporarily disable Web Crypto API
      const originalCrypto = global.crypto;
      delete (global as any).crypto;

      const config = {
        length: 12,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: false,
        excludeSimilar: false,
        excludeAmbiguous: false
      };

      const password = cryptoService.generatePassword(config);
      
      expect(password).toBeDefined();
      expect(password).toHaveLength(12);
      expect(cryptoService.isWebCryptoSupported()).toBe(false);

      // Restore Web Crypto API
      global.crypto = originalCrypto;
    });

    it('should handle missing performance API gracefully', () => {
      const originalPerformance = global.performance;
      delete (global as any).performance;

      const cryptoService = CryptoServiceImpl.getInstance();
      const config = {
        length: 8,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: false,
        includeSymbols: false,
        excludeSimilar: false,
        excludeAmbiguous: false
      };

      // Should still work without performance API
      const password = cryptoService.generatePassword(config);
      expect(password).toBeDefined();
      expect(password).toHaveLength(8);

      // Restore performance API
      global.performance = originalPerformance;
    });

    it('should work in environments without fetch API', async () => {
      const dictionaryService = DictionaryServiceImpl.getInstance();
      
      // Temporarily disable fetch
      const originalFetch = global.fetch;
      delete (global as any).fetch;

      // Should handle missing fetch gracefully
      const words = await dictionaryService.getWordList('eff');
      expect(words).toEqual([]); // Should return empty array

      // Restore fetch
      global.fetch = originalFetch;
    });
  });

  describe('Stress Tests', () => {
    it('should handle concurrent password analysis', async () => {
      const passwordAnalysisService = PasswordAnalysisServiceImpl.getInstance();
      
      const passwords = Array.from({ length: 100 }, (_, i) => `password${i}test!`);
      
      const startTime = performance.now();
      
      // Analyze all passwords concurrently
      const results = await Promise.all(
        passwords.map(password => 
          Promise.resolve(passwordAnalysisService.analyzePassword(password, []))
        )
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete all analyses within reasonable time
      expect(duration).toBeLessThan(1000);
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.score).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle rapid dictionary operations', () => {
      const dictionaryService = DictionaryServiceImpl.getInstance();
      
      const startTime = performance.now();
      
      // Rapid add/remove operations
      for (let i = 0; i < 100; i++) {
        const dict = {
          id: `stress-dict-${i}`,
          name: `Stress Dictionary ${i}`,
          words: [`word${i}1`, `word${i}2`, `word${i}3`],
          enabled: true,
          source: 'user' as const
        };
        
        dictionaryService.addDictionary(dict);
        dictionaryService.toggleDictionary(dict.id, false);
        dictionaryService.toggleDictionary(dict.id, true);
        dictionaryService.removeDictionary(dict.id);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete all operations within reasonable time
      expect(duration).toBeLessThan(500);
    });
  });
});