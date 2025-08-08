import zxcvbn from 'zxcvbn';
import { ZxcvbnResult, EnhancedAnalysisResult, DictionaryMatch } from '../types';
import { Dictionary } from './interfaces';

export interface PasswordAnalysisService {
  analyzePassword(password: string, customDictionaries?: Dictionary[]): EnhancedAnalysisResult;
  findDictionaryMatches(password: string, dictionaries: Dictionary[]): DictionaryMatch[];
}

export class PasswordAnalysisServiceImpl implements PasswordAnalysisService {
  private static instance: PasswordAnalysisServiceImpl;

  public static getInstance(): PasswordAnalysisServiceImpl {
    if (!PasswordAnalysisServiceImpl.instance) {
      PasswordAnalysisServiceImpl.instance = new PasswordAnalysisServiceImpl();
    }
    return PasswordAnalysisServiceImpl.instance;
  }

  analyzePassword(password: string, customDictionaries: Dictionary[] = []): EnhancedAnalysisResult {
    // Get base zxcvbn analysis
    const baseResult = zxcvbn(password) as ZxcvbnResult;

    // Find custom dictionary matches
    const enabledDictionaries = customDictionaries.filter(d => d.enabled);
    const customDictionaryMatches = this.findDictionaryMatches(password, enabledDictionaries);

    // Calculate entropy (simplified calculation)
    const entropy = this.calculateEntropy(password);

    // Create enhanced result
    const enhancedResult: EnhancedAnalysisResult = {
      ...baseResult,
      entropy,
      customDictionaryMatches,
      generationMethod: 'manual' // Default, can be overridden
    };

    // Adjust score based on custom dictionary matches
    if (customDictionaryMatches.length > 0) {
      const highSeverityMatches = customDictionaryMatches.filter(m => m.severity === 'high');
      const mediumSeverityMatches = customDictionaryMatches.filter(m => m.severity === 'medium');

      // Reduce score if there are dictionary matches
      if (highSeverityMatches.length > 0) {
        enhancedResult.score = Math.max(0, enhancedResult.score - 2) as 0 | 1 | 2 | 3 | 4;
      } else if (mediumSeverityMatches.length > 0) {
        enhancedResult.score = Math.max(0, enhancedResult.score - 1) as 0 | 1 | 2 | 3 | 4;
      }

      // Add custom feedback
      this.addCustomFeedback(enhancedResult, customDictionaryMatches);
    }

    return enhancedResult;
  }

  findDictionaryMatches(password: string, dictionaries: Dictionary[]): DictionaryMatch[] {
    const matches: DictionaryMatch[] = [];
    const lowerPassword = password.toLowerCase();

    for (const dictionary of dictionaries) {
      for (const word of dictionary.words) {
        const lowerWord = word.toLowerCase();
        
        // Find all occurrences of the word in the password
        let startIndex = 0;
        while (true) {
          const index = lowerPassword.indexOf(lowerWord, startIndex);
          if (index === -1) break;

          // Determine severity based on word length and position
          let severity: 'low' | 'medium' | 'high' = 'low';
          
          if (word.length >= 6) {
            severity = 'high';
          } else if (word.length >= 4) {
            severity = 'medium';
          }

          // Increase severity if the word is at the beginning or end
          if (index === 0 || index + word.length === password.length) {
            severity = severity === 'low' ? 'medium' : 'high';
          }

          matches.push({
            dictionaryName: dictionary.name,
            matchedWord: word,
            position: index,
            severity
          });

          startIndex = index + 1;
        }
      }
    }

    // Remove duplicate matches (same word at same position)
    const uniqueMatches = matches.filter((match, index, array) => 
      array.findIndex(m => 
        m.matchedWord === match.matchedWord && 
        m.position === match.position
      ) === index
    );

    return uniqueMatches.sort((a, b) => a.position - b.position);
  }

  private calculateEntropy(password: string): number {
    // Simple entropy calculation based on character set size
    let charsetSize = 0;
    
    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (/[0-9]/.test(password)) charsetSize += 10;
    if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32; // Approximate for symbols
    
    return Math.log2(Math.pow(charsetSize, password.length));
  }

  private addCustomFeedback(result: EnhancedAnalysisResult, matches: DictionaryMatch[]): void {
    const highSeverityMatches = matches.filter(m => m.severity === 'high');
    const mediumSeverityMatches = matches.filter(m => m.severity === 'medium');
    const lowSeverityMatches = matches.filter(m => m.severity === 'low');

    // Add warnings for dictionary matches
    if (highSeverityMatches.length > 0) {
      const dictNames = [...new Set(highSeverityMatches.map(m => m.dictionaryName))];
      result.feedback.warning = `Contains words from custom dictionaries: ${dictNames.join(', ')}`;
    } else if (mediumSeverityMatches.length > 0) {
      result.feedback.warning = result.feedback.warning || 'Contains words from custom dictionaries';
    }

    // Add suggestions
    const suggestions = [...result.feedback.suggestions];
    
    if (matches.length > 0) {
      suggestions.push('Avoid using words from organization-specific dictionaries');
      
      if (highSeverityMatches.length > 0) {
        suggestions.push('Consider using a completely different password that doesn\'t contain recognizable terms');
      }
      
      if (matches.some(m => m.position === 0)) {
        suggestions.push('Avoid starting passwords with dictionary words');
      }
      
      if (matches.some(m => m.position + m.matchedWord.length === result.feedback.warning.length)) {
        suggestions.push('Avoid ending passwords with dictionary words');
      }
    }

    result.feedback.suggestions = [...new Set(suggestions)]; // Remove duplicates
  }
}