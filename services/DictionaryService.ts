import { DictionaryService, Dictionary } from './interfaces';

interface WordList {
  name: string;
  description: string;
  entropy_per_word: number;
  words: string[];
}

export class DictionaryServiceImpl implements DictionaryService {
  private static instance: DictionaryServiceImpl;
  private dictionaries: Dictionary[] = [];
  private wordLists: Map<string, WordList> = new Map();

  public static getInstance(): DictionaryServiceImpl {
    if (!DictionaryServiceImpl.instance) {
      DictionaryServiceImpl.instance = new DictionaryServiceImpl();
    }
    return DictionaryServiceImpl.instance;
  }

  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Start initialization but don't block constructor
    this.initializationPromise = this.initializeBuiltinWordLists();
  }

  private async initializeBuiltinWordLists(): Promise<void> {
    // Skip initialization in test environment
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
      this.initialized = true;
      return;
    }

    // Don't load word lists immediately - they will be loaded on demand
    this.initialized = true;
  }

  private async loadWordListOnDemand(key: string): Promise<WordList | null> {
    if (this.wordLists.has(key)) {
      return this.wordLists.get(key) || null;
    }

    const wordListFiles = {
      'eff': '/Walid-PassAnalyzer/wordlists/eff-large.json',
      'eff-short': '/Walid-PassAnalyzer/wordlists/eff-short.json',
      'original': '/Walid-PassAnalyzer/wordlists/original-diceware.json'
    };

    const path = wordListFiles[key as keyof typeof wordListFiles];
    if (!path) {
      return null;
    }

    try {
      const response = await fetch(path);
      
      if (response && response.ok) {
        const wordList: WordList = await response.json();
        this.wordLists.set(key, wordList);
        
        // Add as dictionary if not already present
        const existingDict = this.dictionaries.find(d => d.id === key);
        if (!existingDict) {
          const dictionary: Dictionary = {
            id: key,
            name: wordList.name,
            words: wordList.words,
            enabled: true,
            source: 'builtin'
          };
          this.dictionaries.push(dictionary);
        }
        
        return wordList;
      } else {
        console.warn(`Failed to load word list ${key}: ${response.status} ${response.statusText}`);
        return null;
      }
    } catch (error) {
      console.warn(`Failed to load word list ${key}:`, error);
      return null;
    }
  }

  async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  async loadDictionary(file: File): Promise<Dictionary> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          let data: unknown;
          let words: string[];
          let name: string;

          // Handle different file types
          if (file.name.toLowerCase().endsWith('.json')) {
            try {
              data = JSON.parse(content);
            } catch (parseError) {
              reject(new Error('Invalid JSON format. Please check your file syntax.'));
              return;
            }

            if (!this.validateDictionary(data)) {
              reject(new Error('Invalid dictionary format. Expected an array of words or an object with a "words" array.'));
              return;
            }

            // Extract words and name from JSON
            if (Array.isArray(data)) {
              words = data;
              name = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
            } else if (data && typeof data === 'object' && 'words' in data) {
              const dictObj = data as { name?: string; words: string[] };
              words = dictObj.words;
              name = dictObj.name || file.name.replace(/\.[^/.]+$/, '');
            } else {
              reject(new Error('Invalid dictionary structure.'));
              return;
            }
          } else if (file.name.toLowerCase().endsWith('.txt')) {
            // Handle text files - one word per line
            words = content
              .split(/\r?\n/)
              .map(line => line.trim())
              .filter(line => line.length > 0 && !line.startsWith('#')); // Filter empty lines and comments

            if (words.length === 0) {
              reject(new Error('Text file contains no valid words. Each word should be on a separate line.'));
              return;
            }

            name = file.name.replace(/\.[^/.]+$/, '');
          } else {
            reject(new Error('Unsupported file type. Only JSON and TXT files are supported.'));
            return;
          }

          // Validate word count
          if (words.length === 0) {
            reject(new Error('Dictionary must contain at least one word.'));
            return;
          }

          if (words.length > 100000) {
            reject(new Error('Dictionary is too large. Maximum 100,000 words allowed.'));
            return;
          }

          // Validate words
          const invalidWords = words.filter(word => typeof word !== 'string' || word.trim().length === 0);
          if (invalidWords.length > 0) {
            reject(new Error(`Dictionary contains ${invalidWords.length} invalid word(s). All words must be non-empty strings.`));
            return;
          }

          // Clean and deduplicate words
          const cleanWords = [...new Set(words.map(word => word.trim().toLowerCase()))];

          const dictionary: Dictionary = {
            id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: name,
            words: cleanWords,
            enabled: true,
            source: 'user'
          };

          resolve(dictionary);
        } catch (error) {
          if (error instanceof Error) {
            reject(error);
          } else {
            reject(new Error('An unexpected error occurred while processing the dictionary file.'));
          }
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read the dictionary file. Please try again.'));
      };

      reader.readAsText(file, 'utf-8');
    });
  }

  addDictionary(dictionary: Dictionary): void {
    // Remove existing dictionary with same ID
    this.dictionaries = this.dictionaries.filter(d => d.id !== dictionary.id);
    this.dictionaries.push(dictionary);
  }

  removeDictionary(id: string): void {
    this.dictionaries = this.dictionaries.filter(d => d.id !== id);
  }

  getDictionaries(): Dictionary[] {
    return [...this.dictionaries];
  }

  toggleDictionary(id: string, enabled: boolean): void {
    const dictionary = this.dictionaries.find(d => d.id === id);
    if (dictionary) {
      dictionary.enabled = enabled;
    }
  }

  validateDictionary(data: unknown): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check if it's a word list object with words array
    if ('words' in data && Array.isArray((data as any).words)) {
      const words = (data as any).words;
      return words.length > 0 && words.every((word: unknown) => typeof word === 'string');
    }

    // Check if it's a simple array of words
    if (Array.isArray(data)) {
      return data.length > 0 && data.every((word: unknown) => typeof word === 'string');
    }

    return false;
  }

  async getWordList(listType: 'eff' | 'eff-short' | 'original'): Promise<string[]> {
    const key = listType === 'eff-short' ? 'eff-short' : listType;
    const wordList = await this.loadWordListOnDemand(key);
    return wordList ? wordList.words : [];
  }

  async getWordListEntropy(listType: 'eff' | 'eff-short' | 'original'): Promise<number> {
    const key = listType === 'eff-short' ? 'eff-short' : listType;
    const wordList = await this.loadWordListOnDemand(key);
    return wordList ? wordList.entropy_per_word : 0;
  }

  // Get all enabled dictionaries for zxcvbn integration
  getEnabledDictionaries(): Dictionary[] {
    return this.dictionaries.filter(d => d.enabled);
  }
}