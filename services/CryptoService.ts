import { CryptoService, GeneratorConfig, PassphraseConfig } from './interfaces';
import { DictionaryServiceImpl } from './DictionaryService';

export class CryptoServiceImpl implements CryptoService {
  private static instance: CryptoServiceImpl;
  private fallbackSeed: number = Date.now();

  public static getInstance(): CryptoServiceImpl {
    if (!CryptoServiceImpl.instance) {
      CryptoServiceImpl.instance = new CryptoServiceImpl();
    }
    return CryptoServiceImpl.instance;
  }

  isWebCryptoSupported(): boolean {
    return typeof window !== 'undefined' && 
           window.crypto && 
           window.crypto.getRandomValues !== undefined;
  }

  generateSecureRandom(length: number): Uint8Array {
    if (length <= 0) {
      throw new Error('Length must be greater than 0');
    }

    const array = new Uint8Array(length);
    
    if (this.isWebCryptoSupported()) {
      window.crypto.getRandomValues(array);
    } else {
      // Fallback for browsers without Web Crypto API
      this.generateFallbackRandom(array);
    }
    
    return array;
  }

  private generateFallbackRandom(array: Uint8Array): void {
    // Use multiple entropy sources for better randomness
    const now = Date.now();
    const performance = typeof window !== 'undefined' && window.performance ? window.performance.now() : 0;
    const random = Math.random();
    
    // Simple PRNG with multiple seeds (not cryptographically secure, but better than nothing)
    let seed = this.fallbackSeed ^ now ^ (performance * 1000) ^ (random * 0xFFFFFFFF);
    
    for (let i = 0; i < array.length; i++) {
      // Linear congruential generator
      seed = (seed * 1664525 + 1013904223) % 0x100000000;
      array[i] = (seed >>> 24) & 0xFF;
    }
    
    // Update fallback seed for next call
    this.fallbackSeed = seed;
  }

  generatePassword(config: GeneratorConfig): string {
    if (config.length <= 0) {
      throw new Error('Password length must be greater than 0');
    }

    const {
      length,
      includeUppercase,
      includeLowercase,
      includeNumbers,
      includeSymbols,
      excludeSimilar,
      excludeAmbiguous,
      customCharacters,
      excludeCharacters
    } = config;

    // Build character set
    let charset = '';
    
    if (includeLowercase) {
      charset += 'abcdefghijklmnopqrstuvwxyz';
    }
    
    if (includeUppercase) {
      charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    }
    
    if (includeNumbers) {
      charset += '0123456789';
    }
    
    if (includeSymbols) {
      charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    }
    
    if (customCharacters) {
      charset += customCharacters;
    }

    // Remove duplicate characters
    charset = [...new Set(charset)].join('');

    // Remove similar characters if requested
    if (excludeSimilar) {
      charset = charset.replace(/[il1Lo0O]/g, '');
    }

    // Remove ambiguous characters if requested
    if (excludeAmbiguous) {
      charset = charset.replace(/[{}[\]()\/\\'"~,;<>.]/g, '');
    }

    // Remove excluded characters
    if (excludeCharacters) {
      // Properly escape special regex characters
      const escapedExcludeChars = excludeCharacters.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const excludeRegex = new RegExp(`[${escapedExcludeChars}]`, 'g');
      charset = charset.replace(excludeRegex, '');
    }

    if (charset.length === 0) {
      throw new Error('No valid characters available for password generation');
    }

    // Generate password with better distribution
    const randomValues = this.generateSecureRandom(length);
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset[randomValues[i] % charset.length];
    }

    // Ensure password meets minimum requirements if specified
    if (!this.validatePasswordRequirements(password, config)) {
      // Regenerate if requirements not met (up to 10 attempts)
      for (let attempt = 0; attempt < 10; attempt++) {
        const newRandomValues = this.generateSecureRandom(length);
        let newPassword = '';
        
        for (let i = 0; i < length; i++) {
          newPassword += charset[newRandomValues[i] % charset.length];
        }
        
        if (this.validatePasswordRequirements(newPassword, config)) {
          password = newPassword;
          break;
        }
      }
    }

    return password;
  }

  private validatePasswordRequirements(password: string, config: GeneratorConfig): boolean {
    // Check if password contains at least one character from each required type
    if (config.includeUppercase && !/[A-Z]/.test(password)) return false;
    if (config.includeLowercase && !/[a-z]/.test(password)) return false;
    if (config.includeNumbers && !/[0-9]/.test(password)) return false;
    if (config.includeSymbols && !/[^a-zA-Z0-9]/.test(password)) return false;
    
    return true;
  }

  async generatePassphrase(config: PassphraseConfig): Promise<string> {
    if (config.wordCount <= 0) {
      throw new Error('Word count must be greater than 0');
    }

    const { wordCount, wordList, separator, capitalize, includeNumbers } = config;
    
    // Get word list from DictionaryService
    const dictionaryService = DictionaryServiceImpl.getInstance();
    
    // Ensure dictionary service is initialized
    await dictionaryService.ensureInitialized();
    
    let words: string[];
    
    if (wordList === 'custom') {
      // Use first enabled custom dictionary
      const customDictionaries = dictionaryService.getEnabledDictionaries()
        .filter(d => d.source === 'user');
      
      if (customDictionaries.length === 0) {
        throw new Error('No custom dictionaries available. Please load a custom dictionary first.');
      }
      
      words = customDictionaries[0].words;
    } else {
      // Use built-in word list
      words = await dictionaryService.getWordList(wordList);
      
      if (words.length === 0) {
        throw new Error(`Word list '${wordList}' is not available. Please check if word lists are loaded.`);
      }
    }
    
    // Generate secure random indices for word selection
    const randomValues = this.generateSecureRandom(wordCount * 2); // Extra bytes for better distribution
    
    let selectedWords: string[] = [];
    for (let i = 0; i < wordCount; i++) {
      // Use two bytes for better distribution across large word lists
      const randomIndex = (randomValues[i * 2] << 8) | randomValues[i * 2 + 1];
      let word = words[randomIndex % words.length];
      
      // Apply capitalization
      switch (capitalize) {
        case 'first':
          word = i === 0 ? this.capitalizeFirst(word) : word;
          break;
        case 'all':
          word = this.capitalizeFirst(word);
          break;
        case 'random':
          // Use secure random for capitalization decision
          const capRandomValue = this.generateSecureRandom(1);
          if (capRandomValue[0] % 2 === 0) {
            word = this.capitalizeFirst(word);
          }
          break;
        case 'none':
        default:
          // Keep word as-is
          break;
      }
      
      selectedWords.push(word);
    }

    let passphrase = selectedWords.join(separator);
    
    // Add numbers if requested
    if (includeNumbers) {
      const numberValues = this.generateSecureRandom(2);
      const number = (numberValues[0] % 90) + 10; // 10-99
      passphrase += number.toString();
    }

    return passphrase;
  }

  calculateEntropy(password: string): number {
    if (!password || password.length === 0) {
      return 0;
    }

    // Enhanced entropy calculation
    const charsetSize = this.estimateCharsetSize(password);
    const baseEntropy = Math.log2(Math.pow(charsetSize, password.length));
    
    // Apply penalty for common patterns
    let patternPenalty = 0;
    
    // Check for repeated characters - more aggressive penalty
    const repeatedChars = this.countRepeatedCharacters(password);
    const repetitionRatio = repeatedChars / password.length;
    if (repetitionRatio > 0.2) {
      patternPenalty += Math.min(30, repetitionRatio * 50); // Scale penalty with repetition
    }
    
    // Check for sequential patterns
    if (this.hasSequentialPattern(password)) {
      patternPenalty += 15;
    }
    
    // Check for keyboard patterns
    if (this.hasKeyboardPattern(password)) {
      patternPenalty += 10;
    }
    
    return Math.max(0, baseEntropy - patternPenalty);
  }

  private capitalizeFirst(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  private estimateCharsetSize(password: string): number {
    let size = 0;
    
    if (/[a-z]/.test(password)) size += 26;
    if (/[A-Z]/.test(password)) size += 26;
    if (/[0-9]/.test(password)) size += 10;
    if (/[^a-zA-Z0-9]/.test(password)) {
      // Count unique symbols for more accurate estimation
      const symbols = password.match(/[^a-zA-Z0-9]/g) || [];
      const uniqueSymbols = new Set(symbols);
      size += Math.max(uniqueSymbols.size, 10); // Minimum 10 for common symbols
    }
    
    return size;
  }

  private countRepeatedCharacters(password: string): number {
    const charCount: { [key: string]: number } = {};
    let totalRepeated = 0;
    
    for (const char of password) {
      charCount[char] = (charCount[char] || 0) + 1;
    }
    
    // Count total repeated occurrences (beyond the first occurrence)
    for (const count of Object.values(charCount)) {
      if (count > 1) {
        totalRepeated += count - 1;
      }
    }
    
    return totalRepeated;
  }

  private hasSequentialPattern(password: string): boolean {
    // Check for sequences like "abc", "123", "xyz"
    for (let i = 0; i < password.length - 2; i++) {
      const char1 = password.charCodeAt(i);
      const char2 = password.charCodeAt(i + 1);
      const char3 = password.charCodeAt(i + 2);
      
      if (char2 === char1 + 1 && char3 === char2 + 1) {
        return true;
      }
      if (char2 === char1 - 1 && char3 === char2 - 1) {
        return true;
      }
    }
    
    return false;
  }

  private hasKeyboardPattern(password: string): boolean {
    // Common keyboard patterns
    const patterns = [
      'qwerty', 'asdf', 'zxcv', '1234', 'qwer', 'asdfg', 'zxcvb',
      'yuiop', 'hjkl', 'bnm', '567', '890', 'tyui', 'fghj', 'cvbn'
    ];
    
    const lowerPassword = password.toLowerCase();
    
    for (const pattern of patterns) {
      if (lowerPassword.includes(pattern) || lowerPassword.includes(pattern.split('').reverse().join(''))) {
        return true;
      }
    }
    
    return false;
  }
}