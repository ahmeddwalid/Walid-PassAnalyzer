import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DictionaryServiceImpl } from '../DictionaryService';
import { Dictionary } from '../interfaces';

// Mock fetch for testing
global.fetch = vi.fn();

describe('DictionaryService', () => {
  let dictionaryService: DictionaryServiceImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton instance for each test
    (DictionaryServiceImpl as any).instance = undefined;
    dictionaryService = DictionaryServiceImpl.getInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = DictionaryServiceImpl.getInstance();
      const instance2 = DictionaryServiceImpl.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('validateDictionary', () => {
    it('should validate dictionary with words array', () => {
      const validDictionary = {
        name: 'Test Dictionary',
        words: ['word1', 'word2', 'word3']
      };
      expect(dictionaryService.validateDictionary(validDictionary)).toBe(true);
    });

    it('should validate simple array of words', () => {
      const validArray = ['word1', 'word2', 'word3'];
      expect(dictionaryService.validateDictionary(validArray)).toBe(true);
    });

    it('should reject invalid data types', () => {
      expect(dictionaryService.validateDictionary(null)).toBe(false);
      expect(dictionaryService.validateDictionary(undefined)).toBe(false);
      expect(dictionaryService.validateDictionary('string')).toBe(false);
      expect(dictionaryService.validateDictionary(123)).toBe(false);
    });

    it('should reject empty arrays', () => {
      expect(dictionaryService.validateDictionary([])).toBe(false);
      expect(dictionaryService.validateDictionary({ words: [] })).toBe(false);
    });

    it('should reject arrays with non-string elements', () => {
      expect(dictionaryService.validateDictionary([1, 2, 3])).toBe(false);
      expect(dictionaryService.validateDictionary(['word1', 123, 'word3'])).toBe(false);
    });
  });

  describe('loadDictionary', () => {
    it('should load dictionary from valid JSON file', async () => {
      const mockFile = new File(['{"words": ["test1", "test2"]}'], 'test.json', {
        type: 'application/json'
      });

      const dictionary = await dictionaryService.loadDictionary(mockFile);

      expect(dictionary.name).toBe('test');
      expect(dictionary.words).toEqual(['test1', 'test2']);
      expect(dictionary.enabled).toBe(true);
      expect(dictionary.source).toBe('user');
      expect(dictionary.id).toMatch(/^custom-\d+-[a-z0-9]+$/);
    });

    it('should load dictionary from simple array', async () => {
      const mockFile = new File(['["word1", "word2", "word3"]'], 'simple.json', {
        type: 'application/json'
      });

      const dictionary = await dictionaryService.loadDictionary(mockFile);

      expect(dictionary.words).toEqual(['word1', 'word2', 'word3']);
    });

    it('should reject invalid JSON', async () => {
      const mockFile = new File(['invalid json'], 'invalid.json', {
        type: 'application/json'
      });

      await expect(dictionaryService.loadDictionary(mockFile)).rejects.toThrow('Invalid JSON format. Please check your file syntax.');
    });

    it('should reject invalid dictionary format', async () => {
      const mockFile = new File(['{"invalid": "format"}'], 'invalid.json', {
        type: 'application/json'
      });

      await expect(dictionaryService.loadDictionary(mockFile)).rejects.toThrow('Invalid dictionary format');
    });
  });

  describe('dictionary management', () => {
    let testDictionary: Dictionary;

    beforeEach(() => {
      testDictionary = {
        id: 'test-dict',
        name: 'Test Dictionary',
        words: ['test1', 'test2', 'test3'],
        enabled: true,
        source: 'user'
      };
    });

    it('should add dictionary', () => {
      dictionaryService.addDictionary(testDictionary);
      const dictionaries = dictionaryService.getDictionaries();
      
      expect(dictionaries).toContainEqual(testDictionary);
    });

    it('should replace existing dictionary with same ID', () => {
      dictionaryService.addDictionary(testDictionary);
      
      const updatedDictionary = { ...testDictionary, name: 'Updated Dictionary' };
      dictionaryService.addDictionary(updatedDictionary);
      
      const dictionaries = dictionaryService.getDictionaries();
      const matchingDicts = dictionaries.filter(d => d.id === 'test-dict');
      
      expect(matchingDicts).toHaveLength(1);
      expect(matchingDicts[0].name).toBe('Updated Dictionary');
    });

    it('should remove dictionary', () => {
      dictionaryService.addDictionary(testDictionary);
      dictionaryService.removeDictionary('test-dict');
      
      const dictionaries = dictionaryService.getDictionaries();
      expect(dictionaries.find(d => d.id === 'test-dict')).toBeUndefined();
    });

    it('should toggle dictionary enabled state', () => {
      dictionaryService.addDictionary(testDictionary);
      dictionaryService.toggleDictionary('test-dict', false);
      
      const dictionaries = dictionaryService.getDictionaries();
      const dictionary = dictionaries.find(d => d.id === 'test-dict');
      
      expect(dictionary?.enabled).toBe(false);
    });

    it('should get enabled dictionaries only', () => {
      const enabledDict = { ...testDictionary, id: 'enabled', enabled: true };
      const disabledDict = { ...testDictionary, id: 'disabled', enabled: false };
      
      dictionaryService.addDictionary(enabledDict);
      dictionaryService.addDictionary(disabledDict);
      
      const enabledDictionaries = dictionaryService.getEnabledDictionaries();
      
      expect(enabledDictionaries).toHaveLength(1);
      expect(enabledDictionaries[0].id).toBe('enabled');
    });
  });

  describe('word list methods', () => {
    beforeEach(() => {
      // Manually add word lists for testing since initialization is skipped in test environment
      const testWordLists = [
        {
          key: 'eff',
          wordList: {
            name: 'EFF Large',
            words: ['apple', 'banana', 'cherry'],
            entropy_per_word: 12.925,
            description: 'Test EFF Large'
          }
        },
        {
          key: 'eff-short',
          wordList: {
            name: 'EFF Short',
            words: ['cat', 'dog', 'fish'],
            entropy_per_word: 10.339,
            description: 'Test EFF Short'
          }
        },
        {
          key: 'original',
          wordList: {
            name: 'Original Diceware',
            words: ['word1', 'word2', 'word3'],
            entropy_per_word: 12.925,
            description: 'Test Original'
          }
        }
      ];

      // Access private properties for testing
      const wordListsMap = (dictionaryService as any).wordLists;
      const dictionaries = (dictionaryService as any).dictionaries;
      
      testWordLists.forEach(({ key, wordList }) => {
        wordListsMap.set(key, wordList);
        dictionaries.push({
          id: key,
          name: wordList.name,
          words: wordList.words,
          enabled: true,
          source: 'builtin'
        });
      });
    });

    it('should get word list for eff', () => {
      const words = dictionaryService.getWordList('eff');
      expect(words).toEqual(['apple', 'banana', 'cherry']);
    });

    it('should get word list for eff-short', () => {
      const words = dictionaryService.getWordList('eff-short');
      expect(words).toEqual(['cat', 'dog', 'fish']);
    });

    it('should get word list for original', () => {
      const words = dictionaryService.getWordList('original');
      expect(words).toEqual(['word1', 'word2', 'word3']);
    });

    it('should get word list entropy', () => {
      const entropy = dictionaryService.getWordListEntropy('eff');
      expect(entropy).toBe(12.925);
    });

    it('should get word list entropy for eff-short', () => {
      const entropy = dictionaryService.getWordListEntropy('eff-short');
      expect(entropy).toBe(10.339);
    });

    it('should return empty array for unknown word list', () => {
      const words = dictionaryService.getWordList('unknown' as any);
      expect(words).toEqual([]);
    });

    it('should return 0 entropy for unknown word list', () => {
      const entropy = dictionaryService.getWordListEntropy('unknown' as any);
      expect(entropy).toBe(0);
    });
  });
});  describe
('lazy loading', () => {
    beforeEach(() => {
      // Mock successful fetch responses
      (global.fetch as any).mockImplementation((url: string) => {
        const mockWordList = {
          name: 'Test Wordlist',
          description: 'Test description',
          entropy_per_word: 12.9,
          words: ['test1', 'test2', 'test3']
        };

        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockWordList)
        });
      });
    });

    it('should load word lists on demand', async () => {
      const words = await dictionaryService.getWordList('eff');
      expect(words).toEqual(['test1', 'test2', 'test3']);
      expect(global.fetch).toHaveBeenCalledWith('/Walid-PassAnalyzer/wordlists/eff-large.json');
    });

    it('should cache loaded word lists', async () => {
      // First call
      await dictionaryService.getWordList('eff');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const words = await dictionaryService.getWordList('eff');
      expect(words).toEqual(['test1', 'test2', 'test3']);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No additional fetch
    });

    it('should handle different word list types', async () => {
      await dictionaryService.getWordList('eff-short');
      expect(global.fetch).toHaveBeenCalledWith('/Walid-PassAnalyzer/wordlists/eff-short.json');

      await dictionaryService.getWordList('original');
      expect(global.fetch).toHaveBeenCalledWith('/Walid-PassAnalyzer/wordlists/original-diceware.json');
    });

    it('should return empty array for failed loads', async () => {
      (global.fetch as any).mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        })
      );

      const words = await dictionaryService.getWordList('eff');
      expect(words).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockImplementationOnce(() => 
        Promise.reject(new Error('Network error'))
      );

      const words = await dictionaryService.getWordList('eff');
      expect(words).toEqual([]);
    });

    it('should get entropy for loaded word lists', async () => {
      const entropy = await dictionaryService.getWordListEntropy('eff');
      expect(entropy).toBe(12.9);
    });

    it('should return 0 entropy for failed loads', async () => {
      (global.fetch as any).mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          status: 404
        })
      );

      const entropy = await dictionaryService.getWordListEntropy('eff');
      expect(entropy).toBe(0);
    });
  });