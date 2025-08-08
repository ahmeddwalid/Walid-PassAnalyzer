import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { PassphraseConfig } from '../services/interfaces';
import { EnhancedAnalysisResult } from '../types';
import { StrengthMeter } from './StrengthMeter';
import { FeedbackDisplay } from './FeedbackDisplay';
import { ClipboardButton } from './ClipboardButton';
import { ExportButton } from './ExportButton';
import { useCryptoService, usePasswordAnalysisService, useCustomDictionaries, useDictionaryService } from '../contexts/AppContext';
import { createAnalysisData } from '../services/ExportUtils';

interface PassphraseControlsProps {
  config: PassphraseConfig;
  onConfigChange: (config: PassphraseConfig) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  validationErrors: string[];
}

interface GeneratedPassphraseDisplayProps {
  passphrase: string;
  analysis: EnhancedAnalysisResult | null;
  entropy: number;
  onRegenerate: () => void;
}

const PassphraseControls: React.FC<PassphraseControlsProps> = ({
  config,
  onConfigChange,
  onGenerate,
  isGenerating,
  validationErrors
}) => {
  const [availableWordLists, setAvailableWordLists] = useState<string[]>([]);

  const dictionaryService = useDictionaryService();

  useEffect(() => {
    // Check which word lists are available
    const dictionaries = dictionaryService.getDictionaries();
    const wordLists = ['eff', 'original'];
    
    // Add eff-short if available
    if (dictionaries.some(d => d.id === 'eff-short')) {
      wordLists.splice(1, 0, 'eff-short');
    }
    
    // Add custom if there are user dictionaries
    const customDictionaries = dictionaries.filter(d => d.source === 'user' && d.enabled);
    if (customDictionaries.length > 0) {
      wordLists.push('custom');
    }
    
    setAvailableWordLists(wordLists);
  }, [dictionaryService]);

  const handleConfigChange = useCallback((updates: Partial<PassphraseConfig>) => {
    onConfigChange({ ...config, ...updates });
  }, [config, onConfigChange]);

  const hasValidationErrors = validationErrors.length > 0;

  const getWordListDescription = (wordList: string) => {
    switch (wordList) {
      case 'eff':
        return 'EFF Large Wordlist (7776 words, ~12.9 bits/word)';
      case 'eff-short':
        return 'EFF Short Wordlist (1296 words, ~10.3 bits/word)';
      case 'original':
        return 'Original Diceware (7776 words, ~12.9 bits/word)';
      case 'custom':
        return 'Custom Dictionary (user-provided words)';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-800/50 rounded-lg border border-gray-700/50">
      <h3 className="text-lg font-semibold text-white mb-4">Passphrase Settings</h3>
      
      {/* Word Count Control */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Number of Words: {config.wordCount}
        </label>
        <input
          type="range"
          min="3"
          max="12"
          value={config.wordCount}
          onChange={(e) => handleConfigChange({ wordCount: parseInt(e.target.value) })}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>3</span>
          <span>12</span>
        </div>
        <p className="text-xs text-gray-400">
          Recommended: 4-6 words for good security and memorability
        </p>
      </div>

      {/* Word List Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Word List
        </label>
        <select
          value={config.wordList}
          onChange={(e) => handleConfigChange({ wordList: e.target.value as 'eff' | 'eff-short' | 'original' | 'custom' })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        >
          {availableWordLists.map(wordList => (
            <option key={wordList} value={wordList}>
              {wordList === 'eff' ? 'EFF Large' : 
               wordList === 'eff-short' ? 'EFF Short' :
               wordList === 'original' ? 'Original Diceware' : 
               'Custom Dictionary'}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400">
          {getWordListDescription(config.wordList)}
        </p>
      </div>

      {/* Separator */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Word Separator
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleConfigChange({ separator: '-' })}
            className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 ${
              config.separator === '-'
                ? 'bg-sky-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Hyphen (-)
          </button>
          <button
            onClick={() => handleConfigChange({ separator: ' ' })}
            className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 ${
              config.separator === ' '
                ? 'bg-sky-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Space ( )
          </button>
          <button
            onClick={() => handleConfigChange({ separator: '.' })}
            className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 ${
              config.separator === '.'
                ? 'bg-sky-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Period (.)
          </button>
          <button
            onClick={() => handleConfigChange({ separator: '_' })}
            className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 ${
              config.separator === '_'
                ? 'bg-sky-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Underscore (_)
          </button>
        </div>
        <input
          type="text"
          value={config.separator}
          onChange={(e) => handleConfigChange({ separator: e.target.value })}
          placeholder="Custom separator..."
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
      </div>

      {/* Capitalization Options */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-300">Capitalization</h4>
        
        <div className="space-y-2">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="capitalize"
              value="none"
              checked={config.capitalize === 'none'}
              onChange={(e) => handleConfigChange({ capitalize: e.target.value as any })}
              className="w-4 h-4 text-sky-600 bg-gray-700 border-gray-600 focus:ring-sky-500 focus:ring-2"
            />
            <span className="text-sm text-gray-300">None (all lowercase)</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="capitalize"
              value="first"
              checked={config.capitalize === 'first'}
              onChange={(e) => handleConfigChange({ capitalize: e.target.value as any })}
              className="w-4 h-4 text-sky-600 bg-gray-700 border-gray-600 focus:ring-sky-500 focus:ring-2"
            />
            <span className="text-sm text-gray-300">First word only</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="capitalize"
              value="all"
              checked={config.capitalize === 'all'}
              onChange={(e) => handleConfigChange({ capitalize: e.target.value as any })}
              className="w-4 h-4 text-sky-600 bg-gray-700 border-gray-600 focus:ring-sky-500 focus:ring-2"
            />
            <span className="text-sm text-gray-300">All words</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="capitalize"
              value="random"
              checked={config.capitalize === 'random'}
              onChange={(e) => handleConfigChange({ capitalize: e.target.value as any })}
              className="w-4 h-4 text-sky-600 bg-gray-700 border-gray-600 focus:ring-sky-500 focus:ring-2"
            />
            <span className="text-sm text-gray-300">Random words</span>
          </label>
        </div>
      </div>

      {/* Include Numbers */}
      <div className="space-y-3">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.includeNumbers}
            onChange={(e) => handleConfigChange({ includeNumbers: e.target.checked })}
            className="w-4 h-4 text-sky-600 bg-gray-700 border-gray-600 rounded focus:ring-sky-500 focus:ring-2"
          />
          <span className="text-sm text-gray-300">Add numbers at the end (10-99)</span>
        </label>
      </div>

      {/* Validation Errors */}
      {hasValidationErrors && (
        <div className="p-3 bg-red-900/40 border border-red-700/60 rounded-lg">
          <h4 className="text-sm font-medium text-red-300 mb-2">Configuration Issues:</h4>
          <ul className="text-sm text-red-200 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={isGenerating || hasValidationErrors}
        className={`
          w-full py-3 px-4 rounded-lg font-medium text-white transition-all duration-200
          ${hasValidationErrors || isGenerating
            ? 'bg-gray-600 cursor-not-allowed opacity-50'
            : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 transform hover:scale-[1.02] shadow-lg'
          }
        `}
      >
        {isGenerating ? (
          <span className="flex items-center justify-center space-x-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Generating...</span>
          </span>
        ) : (
          '🎲 Generate Passphrase'
        )}
      </button>
    </div>
  );
};

const GeneratedPassphraseDisplay: React.FC<GeneratedPassphraseDisplayProps> = ({
  passphrase,
  analysis,
  entropy,
  onRegenerate
}) => {
  if (!passphrase) {
    return (
      <div className="text-center p-8 bg-gray-800/30 rounded-lg border border-gray-700/30">
        <div className="text-4xl mb-4 text-gray-500">🎲</div>
        <p className="text-gray-400">
          Configure your settings and click "Generate Passphrase" to create a memorable passphrase.
        </p>
      </div>
    );
  }

  // Calculate estimated entropy for passphrase
  const words = passphrase.replace(/\d+$/, '').split(/[-\s._]+/).filter(w => w.length > 0);
  const estimatedEntropy = words.length * 12.9; // Approximate for diceware

  return (
    <div className="space-y-6">
      {/* Generated Passphrase Display */}
      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">Generated Passphrase</h3>
        
        <div className="space-y-4">
          {/* Passphrase Display */}
          <div className="relative">
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-600/50 font-mono text-lg text-center break-all select-all">
              <span className="text-purple-400">{passphrase}</span>
            </div>
            <div className="absolute top-2 right-2 flex space-x-2">
              <ClipboardButton 
                content={passphrase}
                label="Copy"
                className="px-3 py-1 rounded text-xs font-medium transition-all duration-200"
              />
              <button
                onClick={onRegenerate}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium transition-all duration-200"
                title="Generate new passphrase"
              >
                🔄 New
              </button>
            </div>
          </div>

          {/* Passphrase Stats */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-gray-900/30 rounded-lg">
              <div className="text-gray-400">Words</div>
              <div className="text-white font-semibold">{words.length}</div>
            </div>
            <div className="text-center p-3 bg-gray-900/30 rounded-lg">
              <div className="text-gray-400">Length</div>
              <div className="text-white font-semibold">{passphrase.length}</div>
            </div>
            <div className="text-center p-3 bg-gray-900/30 rounded-lg">
              <div className="text-gray-400">Entropy</div>
              <div className="text-white font-semibold">{estimatedEntropy.toFixed(1)} bits</div>
            </div>
          </div>
        </div>
      </div>

      {/* Strength Analysis */}
      {analysis && (
        <div className="space-y-4">
          <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">Strength Analysis</h3>
            <StrengthMeter score={analysis.score} />
          </div>
          
          <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <FeedbackDisplay result={analysis} />
          </div>

          {/* Export Section */}
          <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
              <h3 className="text-sm font-medium text-gray-300 sm:mr-4">Export Analysis Report:</h3>
              <div className="flex gap-3">
                <ExportButton 
                  data={createAnalysisData(passphrase, analysis)}
                  format="pdf"
                  className="text-sm"
                />
                <ExportButton 
                  data={createAnalysisData(passphrase, analysis)}
                  format="text"
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const PassphraseGenerator: React.FC = () => {
  const [config, setConfig] = useState<PassphraseConfig>({
    wordCount: 4,
    wordList: 'eff',
    separator: '-',
    capitalize: 'none',
    includeNumbers: false
  });

  const [generatedPassphrase, setGeneratedPassphrase] = useState<string>('');
  const [analysis, setAnalysis] = useState<EnhancedAnalysisResult | null>(null);
  const [entropy, setEntropy] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const cryptoService = useCryptoService();
  const passwordAnalysisService = usePasswordAnalysisService();
  const customDictionaries = useCustomDictionaries();

  // Validation logic
  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    // Check word count constraints
    if (config.wordCount < 3) {
      errors.push('Word count must be at least 3 for security');
    }

    if (config.wordCount > 12) {
      errors.push('Word count cannot exceed 12 for practicality');
    }

    // Check if separator is too long
    if (config.separator.length > 3) {
      errors.push('Separator should be 3 characters or less');
    }

    return errors;
  }, [config]);

  const handleGenerate = useCallback(async () => {
    if (validationErrors.length > 0) {
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 100));

      const passphrase = await cryptoService.generatePassphrase(config);
      const passphraseEntropy = cryptoService.calculateEntropy(passphrase);
      const strengthAnalysis = passwordAnalysisService.analyzePassword(passphrase, customDictionaries);

      setGeneratedPassphrase(passphrase);
      setEntropy(passphraseEntropy);
      setAnalysis(strengthAnalysis);
    } catch (error) {
      console.error('Passphrase generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [config, validationErrors, cryptoService, passwordAnalysisService, customDictionaries]);



  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Passphrase Generator</h2>
        <p className="text-gray-400">
          Generate memorable passphrases using the diceware methodology
        </p>
      </div>

      <div className="space-y-8 xl:space-y-0 xl:grid xl:grid-cols-5 xl:gap-8">
        <div className="xl:col-span-2">
          <PassphraseControls
            config={config}
            onConfigChange={setConfig}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            validationErrors={validationErrors}
          />
        </div>

        <div className="xl:col-span-3">
          {error && (
            <div className="mb-6 p-4 bg-red-900/40 border border-red-700/60 rounded-lg">
              <h4 className="text-sm font-medium text-red-300 mb-2">Generation Error:</h4>
              <p className="text-sm text-red-200">{error}</p>
              <button
                onClick={() => setError('')}
                className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
              >
                Dismiss
              </button>
            </div>
          )}
          <GeneratedPassphraseDisplay
            passphrase={generatedPassphrase}
            analysis={analysis}
            entropy={entropy}
            onRegenerate={handleRegenerate}
          />
        </div>
      </div>
    </div>
  );
};