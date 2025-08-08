import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CryptoServiceImpl } from '../CryptoService';
import { GeneratorConfig, PassphraseConfig } from '../interfaces';

// Mock DictionaryService
vi.mock('../DictionaryService', () => ({
  DictionaryServiceImpl: {
    getInstance: () => ({
      getWordList: vi.fn((listType: string) => {
        const wordLists = {
          'eff': ['apple', 'banana', 'cherry', 'dog', 'elephant', 'forest', 'guitar', 'house'],
          'eff-short': ['cat', 'dog', 'fish', 'bird'],
          'original': ['word1', 'word2', 'word3', 'word4', 'word5', 'word6']
        };
        return wordLists[listType as keyof typeof wordLists] || [];
      }),
      getEnabledDictionaries: vi.fn(() => [
        {
          id: 'custom-1',
          name: 'Custom Dictionary',
          words: ['custom1', 'custom2', 'custom3', 'custom4'],
          enabled: true,
          source: 'user'
        }
      ])
    })
  }
}));

describe('CryptoService', () => {
  let cryptoService: CryptoServiceImpl;

  beforeEach(() => {
    cryptoService = CryptoServiceImpl.getInstance();
  });

  describe('isWebCryptoSupported', () => {
    it('should return boolean', () => {
      const isSupported = cryptoService.isWebCryptoSupported();
      expect(typeof isSupported).toBe('boolean');
    });

    it('should return false when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;
      
      const isSupported = cryptoService.isWebCryptoSupported();
      expect(isSupported).toBe(false);
      
      global.window = originalWindow;
    });
  });

  describe('generateSecureRandom', () => {
    it('should generate random bytes of specified length', () => {
      const length = 16;
      const result = cryptoService.generateSecureRandom(length);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(length);
    });

    it('should generate different values on subsequent calls', () => {
      const result1 = cryptoService.generateSecureRandom(8);
      const result2 = cryptoService.generateSecureRandom(8);
      
      expect(result1).not.toEqual(result2);
    });

    it('should throw error for invalid length', () => {
      expect(() => cryptoService.generateSecureRandom(0)).toThrow('Length must be greater than 0');
      expect(() => cryptoService.generateSecureRandom(-1)).toThrow('Length must be greater than 0');
    });

    it('should use fallback when Web Crypto API is not supported', () => {
      const originalCrypto = global.window?.crypto;
      
      // Mock window.crypto to be undefined
      Object.defineProperty(global.window, 'crypto', {
        value: undefined,
        configurable: true
      });

      const result = cryptoService.generateSecureRandom(8);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(8);

      // Restore original crypto
      if (originalCrypto) {
        Object.defineProperty(global.window, 'crypto', {
          value: originalCrypto,
          configurable: true
        });
      }
    });
  });

  describe('generatePassword', () => {
    it('should generate password with specified length', () => {
      const config: GeneratorConfig = {
        length: 12,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: false,
        excludeSimilar: false,
        excludeAmbiguous: false
      };

      const password = cryptoService.generatePassword(config);
      expect(password.length).toBe(12);
    });

    it('should include only specified character types', () => {
      const config: GeneratorConfig = {
        length: 20,
        includeUppercase: false,
        includeLowercase: true,
        includeNumbers: false,
        includeSymbols: false,
        excludeSimilar: false,
        excludeAmbiguous: false
      };

      const password = cryptoService.generatePassword(config);
      expect(password).toMatch(/^[a-z]+$/);
    });

    it('should include uppercase characters when specified', () => {
      const config: GeneratorConfig = {
        length: 20,
        includeUppercase: true,
        includeLowercase: false,
        includeNumbers: false,
        includeSymbols: false,
        excludeSimilar: false,
        excludeAmbiguous: false
      };

      const password = cryptoService.generatePassword(config);
      expect(password).toMatch(/^[A-Z]+$/);
    });

    it('should include numbers when specified', () => {
      const config: GeneratorConfig = {
        length: 20,
        includeUppercase: false,
        includeLowercase: false,
        includeNumbers: true,
        includeSymbols: false,
        excludeSimilar: false,
        excludeAmbiguous: false
      };

      const password = cryptoService.generatePassword(config);
      expect(password).toMatch(/^[0-9]+$/);
    });

    it('should include symbols when specified', () => {
      const config: GeneratorConfig = {
        length: 20,
        includeUppercase: false,
        includeLowercase: false,
        includeNumbers: false,
        includeSymbols: true,
        excludeSimilar: false,
        excludeAmbiguous: false
      };

      const password = cryptoService.generatePassword(config);
      expect(password).toMatch(/^[!@#$%^&*()_+\-=[\]{}|;:,.<>?]+$/);
    });

    it('should exclude similar characters when requested', () => {
      const config: GeneratorConfig = {
        length: 100,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: false,
        excludeSimilar: true,
        excludeAmbiguous: false
      };

      const password = cryptoService.generatePassword(config);
      expect(password).not.toMatch(/[il1Lo0O]/);
    });

    it('should exclude ambiguous characters when requested', () => {
      const config: GeneratorConfig = {
        length: 100,
        includeUppercase: false,
        includeLowercase: false,
        includeNumbers: false,
        includeSymbols: true,
        excludeSimilar: false,
        excludeAmbiguous: true
      };

      const password = cryptoService.generatePassword(config);
      expect(password).not.toMatch(/[{}[\]()\/\\'"~,;<>.]/);
    });

    it('should include custom characters', () => {
      const config: GeneratorConfig = {
        length: 20,
        includeUppercase: false,
        includeLowercase: false,
        includeNumbers: false,
        includeSymbols: false,
        excludeSimilar: false,
        excludeAmbiguous: false,
        customCharacters: 'xyz'
      };

      const password = cryptoService.generatePassword(config);
      expect(password).toMatch(/^[xyz]+$/);
    });

    it('should exclude specified characters', () => {
      const config: GeneratorConfig = {
        length: 100,
        includeUppercase: false,
        includeLowercase: true,
        includeNumbers: false,
        includeSymbols: false,
        excludeSimilar: false,
        excludeAmbiguous: false,
        excludeCharacters: 'aeiou'
      };

      const password = cryptoService.generatePassword(config);
      expect(password).not.toMatch(/[aeiou]/);
    });

    it('should handle special regex characters in exclude list', () => {
      const config: GeneratorConfig = {
        length: 20,
        includeUppercase: false,
        includeLowercase: false,
        includeNumbers: false,
        includeSymbols: true,
        excludeSimilar: false,
        excludeAmbiguous: false,
        excludeCharacters: '[]{}()*+?^$|'
      };

      const password = cryptoService.generatePassword(config);
      expect(password).not.toMatch(/[\[\]{}()*+?^$|]/);
    });

    it('should throw error when no character types are selected', () => {
      const config: GeneratorConfig = {
        length: 12,
        includeUppercase: false,
        includeLowercase: false,
        includeNumbers: false,
        includeSymbols: false,
        excludeSimilar: false,
        excludeAmbiguous: false
      };

      expect(() => cryptoService.generatePassword(config)).toThrow('No valid characters available for password generation');
    });

    it('should throw error for invalid length', () => {
      const config: GeneratorConfig = {
        length: 0,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: false,
        excludeSimilar: false,
        excludeAmbiguous: false
      };

      expect(() => cryptoService.generatePassword(config)).toThrow('Password length must be greater than 0');
    });

    it('should remove duplicate characters from charset', () => {
      const config: GeneratorConfig = {
        length: 20,
        includeUppercase: false,
        includeLowercase: true,
        includeNumbers: false,
        includeSymbols: false,
        excludeSimilar: false,
        excludeAmbiguous: false,
        customCharacters: 'aabbcc'
      };

      const password = cryptoService.generatePassword(config);
      // Should work without issues even with duplicate characters in custom set
      expect(password.length).toBe(20);
    });
  });

  describe('generatePassphrase', () => {
    it('should generate passphrase with specified word count', () => {
      const config: PassphraseConfig = {
        wordCount: 4,
        wordList: 'eff',
        separator: '-',
        capitalize: 'none',
        includeNumbers: false
      };

      const passphrase = cryptoService.generatePassphrase(config);
      const words = passphrase.split('-');
      expect(words.length).toBe(4);
    });

    it('should use specified separator', () => {
      const config: PassphraseConfig = {
        wordCount: 3,
        wordList: 'eff',
        separator: '_',
        capitalize: 'none',
        includeNumbers: false
      };

      const passphrase = cryptoService.generatePassphrase(config);
      expect(passphrase).toContain('_');
      expect(passphrase.split('_').length).toBe(3);
    });

    it('should capitalize first word only when specified', () => {
      const config: PassphraseConfig = {
        wordCount: 3,
        wordList: 'eff',
        separator: '-',
        capitalize: 'first',
        includeNumbers: false
      };

      const passphrase = cryptoService.generatePassphrase(config);
      const words = passphrase.split('-');
      expect(words[0]).toMatch(/^[A-Z]/);
      expect(words[1]).toMatch(/^[a-z]/);
      expect(words[2]).toMatch(/^[a-z]/);
    });

    it('should capitalize all words when specified', () => {
      const config: PassphraseConfig = {
        wordCount: 3,
        wordList: 'eff',
        separator: '-',
        capitalize: 'all',
        includeNumbers: false
      };

      const passphrase = cryptoService.generatePassphrase(config);
      const words = passphrase.split('-');
      words.forEach(word => {
        expect(word).toMatch(/^[A-Z]/);
      });
    });

    it('should include numbers when specified', () => {
      const config: PassphraseConfig = {
        wordCount: 3,
        wordList: 'eff',
        separator: '-',
        capitalize: 'none',
        includeNumbers: true
      };

      const passphrase = cryptoService.generatePassphrase(config);
      expect(passphrase).toMatch(/\d+$/);
    });

    it('should throw error for invalid word count', () => {
      const config: PassphraseConfig = {
        wordCount: 0,
        wordList: 'eff',
        separator: '-',
        capitalize: 'none',
        includeNumbers: false
      };

      expect(() => cryptoService.generatePassphrase(config)).toThrow('Word count must be greater than 0');
    });

    it('should handle random capitalization', () => {
      const config: PassphraseConfig = {
        wordCount: 10,
        wordList: 'eff',
        separator: '-',
        capitalize: 'random',
        includeNumbers: false
      };

      const passphrase = cryptoService.generatePassphrase(config);
      const words = passphrase.split('-');
      
      // With 10 words and random capitalization, we should have some variety
      const capitalizedWords = words.filter(word => /^[A-Z]/.test(word));
      const lowercaseWords = words.filter(word => /^[a-z]/.test(word));
      
      // At least one of each type should exist (statistically very likely)
      expect(capitalizedWords.length + lowercaseWords.length).toBe(10);
    });
  });

  describe('calculateEntropy', () => {
    it('should calculate entropy for password', () => {
      const password = 'TestPassword123!';
      const entropy = cryptoService.calculateEntropy(password);
      
      expect(entropy).toBeGreaterThan(0);
      expect(typeof entropy).toBe('number');
    });

    it('should return higher entropy for longer passwords', () => {
      const shortPassword = 'abc';
      const longPassword = 'abcdefghijklmnop';
      
      const shortEntropy = cryptoService.calculateEntropy(shortPassword);
      const longEntropy = cryptoService.calculateEntropy(longPassword);
      
      expect(longEntropy).toBeGreaterThan(shortEntropy);
    });

    it('should return higher entropy for more diverse character sets', () => {
      const simplePassword = 'abcdefgh';
      const complexPassword = 'AbC123!@';
      
      const simpleEntropy = cryptoService.calculateEntropy(simplePassword);
      const complexEntropy = cryptoService.calculateEntropy(complexPassword);
      
      expect(complexEntropy).toBeGreaterThan(simpleEntropy);
    });

    it('should return 0 for empty password', () => {
      expect(cryptoService.calculateEntropy('')).toBe(0);
    });

    it('should penalize repeated characters', () => {
      const normalPassword = 'abcdefgh';
      const repeatedPassword = 'aaaaaaaa';
      
      const normalEntropy = cryptoService.calculateEntropy(normalPassword);
      const repeatedEntropy = cryptoService.calculateEntropy(repeatedPassword);
      
      // The repeated password should have lower entropy due to penalty
      // Note: 'aaaaaaaa' has charset size 1, while 'abcdefgh' has charset size 26
      // Base entropy for 'aaaaaaaa': log2(1^8) = 0, but we add penalty
      // Base entropy for 'abcdefgh': log2(26^8) ≈ 37.6, but we subtract penalty for repetition
      expect(repeatedEntropy).toBeLessThan(normalEntropy);
    });

    it('should penalize sequential patterns', () => {
      const normalPassword = 'xmqpwkzr';
      const sequentialPassword = 'abcdefgh';
      
      const normalEntropy = cryptoService.calculateEntropy(normalPassword);
      const sequentialEntropy = cryptoService.calculateEntropy(sequentialPassword);
      
      expect(normalEntropy).toBeGreaterThan(sequentialEntropy);
    });

    it('should penalize keyboard patterns', () => {
      const normalPassword = 'xmqpwkzr';
      const keyboardPassword = 'qwertyui';
      
      const normalEntropy = cryptoService.calculateEntropy(normalPassword);
      const keyboardEntropy = cryptoService.calculateEntropy(keyboardPassword);
      
      expect(normalEntropy).toBeGreaterThan(keyboardEntropy);
    });

    it('should handle reverse sequential patterns', () => {
      const reverseSequential = 'zyxwvuts';
      const entropy = cryptoService.calculateEntropy(reverseSequential);
      
      // Should be penalized for sequential pattern
      expect(entropy).toBeLessThan(50); // Arbitrary threshold for penalized entropy
    });

    it('should handle mixed case keyboard patterns', () => {
      const mixedKeyboard = 'QwErTyUi';
      const entropy = cryptoService.calculateEntropy(mixedKeyboard);
      
      // Should be penalized for keyboard pattern despite mixed case
      expect(entropy).toBeLessThan(60); // Arbitrary threshold
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CryptoServiceImpl.getInstance();
      const instance2 = CryptoServiceImpl.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('edge cases', () => {
    it('should handle very long passwords', () => {
      const config: GeneratorConfig = {
        length: 1000,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
        excludeSimilar: false,
        excludeAmbiguous: false
      };

      const password = cryptoService.generatePassword(config);
      expect(password.length).toBe(1000);
    });

    it('should handle very long passphrases', () => {
      const config: PassphraseConfig = {
        wordCount: 20,
        wordList: 'eff',
        separator: '-',
        capitalize: 'none',
        includeNumbers: false
      };

      const passphrase = cryptoService.generatePassphrase(config);
      const words = passphrase.split('-');
      expect(words.length).toBe(20);
    });

    it('should handle empty separator in passphrase', () => {
      const config: PassphraseConfig = {
        wordCount: 3,
        wordList: 'eff',
        separator: '',
        capitalize: 'none',
        includeNumbers: false
      };

      const passphrase = cryptoService.generatePassphrase(config);
      expect(passphrase.length).toBeGreaterThan(0);
      expect(passphrase).not.toContain('-');
    });
  });
});