import React, { useState, useCallback, useMemo } from 'react';
import { GeneratorConfig } from '../services/interfaces';
import { EnhancedAnalysisResult } from '../types';
import { StrengthMeter } from './StrengthMeter';
import { FeedbackDisplay } from './FeedbackDisplay';
import { ClipboardButton } from './ClipboardButton';
import { ExportButton } from './ExportButton';
import { PassphraseGenerator } from './PassphraseGenerator';
import { useCryptoService, usePasswordAnalysisService, useCustomDictionaries } from '../contexts/AppContext';
import { createAnalysisData } from '../services/ExportUtils';

interface GeneratorControlsProps {
  config: GeneratorConfig;
  onConfigChange: (config: GeneratorConfig) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  validationErrors: string[];
}

interface GeneratedPasswordDisplayProps {
  password: string;
  analysis: EnhancedAnalysisResult | null;
  entropy: number;
  onRegenerate: () => void;
}

const GeneratorControls: React.FC<GeneratorControlsProps> = ({
  config,
  onConfigChange,
  onGenerate,
  isGenerating,
  validationErrors
}) => {
  const handleConfigChange = useCallback((updates: Partial<GeneratorConfig>) => {
    onConfigChange({ ...config, ...updates });
  }, [config, onConfigChange]);

  const hasValidationErrors = validationErrors.length > 0;

  return (
    <div className="space-y-6 p-6 bg-gray-800/50 rounded-lg border border-gray-700/50">
      <h3 className="text-lg font-semibold text-white mb-4">Generator Settings</h3>
      
      {/* Length Control */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Password Length: {config.length}
        </label>
        <input
          type="range"
          min="4"
          max="128"
          value={config.length}
          onChange={(e) => handleConfigChange({ length: parseInt(e.target.value) })}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>4</span>
          <span>128</span>
        </div>
      </div>

      {/* Character Set Options */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-300">Character Types</h4>
        
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.includeUppercase}
            onChange={(e) => handleConfigChange({ includeUppercase: e.target.checked })}
            className="w-4 h-4 text-sky-600 bg-gray-700 border-gray-600 rounded focus:ring-sky-500 focus:ring-2"
          />
          <span className="text-sm text-gray-300">Uppercase Letters (A-Z)</span>
        </label>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.includeLowercase}
            onChange={(e) => handleConfigChange({ includeLowercase: e.target.checked })}
            className="w-4 h-4 text-sky-600 bg-gray-700 border-gray-600 rounded focus:ring-sky-500 focus:ring-2"
          />
          <span className="text-sm text-gray-300">Lowercase Letters (a-z)</span>
        </label>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.includeNumbers}
            onChange={(e) => handleConfigChange({ includeNumbers: e.target.checked })}
            className="w-4 h-4 text-sky-600 bg-gray-700 border-gray-600 rounded focus:ring-sky-500 focus:ring-2"
          />
          <span className="text-sm text-gray-300">Numbers (0-9)</span>
        </label>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.includeSymbols}
            onChange={(e) => handleConfigChange({ includeSymbols: e.target.checked })}
            className="w-4 h-4 text-sky-600 bg-gray-700 border-gray-600 rounded focus:ring-sky-500 focus:ring-2"
          />
          <span className="text-sm text-gray-300">Symbols (!@#$%^&*)</span>
        </label>
      </div>

      {/* Advanced Options */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-300">Advanced Options</h4>
        
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.excludeSimilar}
            onChange={(e) => handleConfigChange({ excludeSimilar: e.target.checked })}
            className="w-4 h-4 text-sky-600 bg-gray-700 border-gray-600 rounded focus:ring-sky-500 focus:ring-2"
          />
          <span className="text-sm text-gray-300">Exclude Similar Characters (i, l, 1, L, o, 0, O)</span>
        </label>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.excludeAmbiguous}
            onChange={(e) => handleConfigChange({ excludeAmbiguous: e.target.checked })}
            className="w-4 h-4 text-sky-600 bg-gray-700 border-gray-600 rounded focus:ring-sky-500 focus:ring-2"
          />
          <span className="text-sm text-gray-300">Exclude Ambiguous Characters ({`{}[]()/"'~,;<>.`})</span>
        </label>
      </div>

      {/* Custom Characters */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Custom Characters (optional)
        </label>
        <input
          type="text"
          value={config.customCharacters || ''}
          onChange={(e) => handleConfigChange({ customCharacters: e.target.value })}
          placeholder="Add custom characters..."
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
      </div>

      {/* Exclude Characters */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Exclude Characters (optional)
        </label>
        <input
          type="text"
          value={config.excludeCharacters || ''}
          onChange={(e) => handleConfigChange({ excludeCharacters: e.target.value })}
          placeholder="Characters to exclude..."
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
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
            : 'bg-gradient-to-r from-sky-500 to-purple-600 hover:from-sky-600 hover:to-purple-700 transform hover:scale-[1.02] shadow-lg'
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
          '⚡ Generate Password'
        )}
      </button>
    </div>
  );
};

const GeneratedPasswordDisplay: React.FC<GeneratedPasswordDisplayProps> = ({
  password,
  analysis,
  entropy,
  onRegenerate
}) => {
  if (!password) {
    return (
      <div className="text-center p-8 bg-gray-800/30 rounded-lg border border-gray-700/30">
        <div className="text-4xl mb-4 text-gray-500">🔐</div>
        <p className="text-gray-400">
          Configure your settings and click "Generate Password" to create a secure password.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generated Password Display */}
      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">Generated Password</h3>
        
        <div className="space-y-4">
          {/* Password Display */}
          <div className="relative">
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-600/50 font-mono text-lg text-center break-all select-all">
              <span className="text-green-400">{password}</span>
            </div>
            <div className="absolute top-2 right-2 flex space-x-2">
              <ClipboardButton 
                content={password}
                label="Copy"
                className="px-3 py-1 rounded text-xs font-medium transition-all duration-200"
              />
              <button
                onClick={onRegenerate}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium transition-all duration-200"
                title="Generate new password"
              >
                🔄 New
              </button>
            </div>
          </div>

          {/* Password Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center p-3 bg-gray-900/30 rounded-lg">
              <div className="text-gray-400">Length</div>
              <div className="text-white font-semibold">{password.length}</div>
            </div>
            <div className="text-center p-3 bg-gray-900/30 rounded-lg">
              <div className="text-gray-400">Entropy</div>
              <div className="text-white font-semibold">{entropy.toFixed(1)} bits</div>
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
                  data={createAnalysisData(password, analysis)}
                  format="pdf"
                  className="text-sm"
                />
                <ExportButton 
                  data={createAnalysisData(password, analysis)}
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

export const PasswordGenerator: React.FC = () => {
  const [generatorType, setGeneratorType] = useState<'password' | 'passphrase'>('password');
  const [config, setConfig] = useState<GeneratorConfig>({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeSimilar: false,
    excludeAmbiguous: false,
    customCharacters: '',
    excludeCharacters: ''
  });

  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [analysis, setAnalysis] = useState<EnhancedAnalysisResult | null>(null);
  const [entropy, setEntropy] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const cryptoService = useCryptoService();
  const passwordAnalysisService = usePasswordAnalysisService();
  const customDictionaries = useCustomDictionaries();

  // Validation logic
  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    // Check if at least one character type is selected
    if (!config.includeUppercase && !config.includeLowercase && !config.includeNumbers && !config.includeSymbols && !config.customCharacters) {
      errors.push('At least one character type must be selected');
    }

    // Check length constraints
    if (config.length < 4) {
      errors.push('Password length must be at least 4 characters');
    }

    if (config.length > 128) {
      errors.push('Password length cannot exceed 128 characters');
    }

    return errors;
  }, [config]);

  const handleGenerate = useCallback(async () => {
    if (validationErrors.length > 0) return;

    setIsGenerating(true);

    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 100));

      const password = cryptoService.generatePassword(config);
      const passwordEntropy = cryptoService.calculateEntropy(password);
      const strengthAnalysis = passwordAnalysisService.analyzePassword(password, customDictionaries);

      setGeneratedPassword(password);
      setEntropy(passwordEntropy);
      setAnalysis(strengthAnalysis);
    } catch (error) {
      console.error('Password generation failed:', error);
      // Could add error state here for user feedback
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
        <h2 className="text-2xl font-bold text-white mb-2">Password Generator</h2>
        <p className="text-gray-400">
          Generate cryptographically secure passwords and passphrases
        </p>
      </div>

      {/* Generator Type Selector */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-700/50 rounded-lg p-1 backdrop-blur-sm border border-gray-600/30">
          <button
            onClick={() => setGeneratorType('password')}
            className={`
              px-6 py-3 rounded-md text-sm font-medium transition-all duration-200
              ${generatorType === 'password'
                ? 'bg-gradient-to-r from-sky-500 to-purple-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
              }
            `}
          >
            🔐 Password
          </button>
          <button
            onClick={() => setGeneratorType('passphrase')}
            className={`
              px-6 py-3 rounded-md text-sm font-medium transition-all duration-200
              ${generatorType === 'passphrase'
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
              }
            `}
          >
            🎲 Passphrase
          </button>
        </div>
      </div>

      {generatorType === 'password' ? (
        <div className="space-y-8 xl:space-y-0 xl:grid xl:grid-cols-5 xl:gap-8">
          <div className="xl:col-span-2">
            <GeneratorControls
              config={config}
              onConfigChange={setConfig}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              validationErrors={validationErrors}
            />
          </div>

          <div className="xl:col-span-3">
            <GeneratedPasswordDisplay
              password={generatedPassword}
              analysis={analysis}
              entropy={entropy}
              onRegenerate={handleRegenerate}
            />
          </div>
        </div>
      ) : (
        <PassphraseGenerator />
      )}
    </div>
  );
};