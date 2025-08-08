import React, { useState, useCallback, useMemo } from 'react';
import { ComparisonInput } from './ComparisonInput';
import { ComparisonResults } from './ComparisonResults';
import { usePasswordAnalysisService, useCustomDictionaries } from '../contexts/AppContext';
import { ComparisonResult } from '../types';
import { PlusIcon } from './IconComponents';

export const PasswordComparison: React.FC = () => {
  const passwordAnalysisService = usePasswordAnalysisService();
  const customDictionaries = useCustomDictionaries();
  
  const [passwords, setPasswords] = useState<string[]>(['', '']);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);

  // Calculate comparison results whenever passwords change
  const updateComparisonResults = useCallback((updatedPasswords: string[]) => {
    const nonEmptyPasswords = updatedPasswords.filter(p => p.trim() !== '');
    
    if (nonEmptyPasswords.length === 0) {
      setComparisonResults([]);
      return;
    }

    // Get unique passwords to avoid duplicate analysis
    const uniquePasswords = [...new Set(nonEmptyPasswords)];

    // Analyze each unique password
    const uniqueResults = uniquePasswords.map(password => {
      const analysis = passwordAnalysisService.analyzePassword(password, customDictionaries);
      return {
        password,
        analysis,
        rank: 0, // Will be calculated below
        isStrongest: false // Will be calculated below
      };
    });

    // Sort by score (descending) and then by entropy (descending) for ranking
    const sortedResults = [...uniqueResults].sort((a, b) => {
      if (a.analysis.score !== b.analysis.score) {
        return b.analysis.score - a.analysis.score;
      }
      return b.analysis.entropy - a.analysis.entropy;
    });

    // Assign ranks and identify strongest
    const rankedResults = uniqueResults.map(result => {
      const rank = sortedResults.findIndex(r => r.password === result.password) + 1;
      return {
        ...result,
        rank,
        isStrongest: rank === 1
      };
    });

    setComparisonResults(rankedResults);
  }, [passwordAnalysisService, customDictionaries]);

  const handlePasswordChange = useCallback((index: number, newPassword: string) => {
    const updatedPasswords = [...passwords];
    updatedPasswords[index] = newPassword;
    setPasswords(updatedPasswords);
    updateComparisonResults(updatedPasswords);
  }, [passwords, updateComparisonResults]);

  const handleRemovePassword = useCallback((index: number) => {
    if (passwords.length <= 2) return; // Keep minimum of 2 password fields
    
    const updatedPasswords = passwords.filter((_, i) => i !== index);
    setPasswords(updatedPasswords);
    updateComparisonResults(updatedPasswords);
  }, [passwords, updateComparisonResults]);

  const handleAddPassword = useCallback(() => {
    if (passwords.length >= 6) return; // Maximum of 6 passwords for UI reasons
    
    const updatedPasswords = [...passwords, ''];
    setPasswords(updatedPasswords);
  }, [passwords]);

  const handleClearAll = useCallback(() => {
    const clearedPasswords = passwords.map(() => '');
    setPasswords(clearedPasswords);
    setComparisonResults([]);
  }, [passwords.length]);

  // Check for identical passwords
  const identicalPasswords = useMemo(() => {
    const nonEmptyPasswords = passwords.filter(p => p.trim() !== '');
    const duplicates = new Set<string>();
    const seen = new Set<string>();
    
    for (const password of nonEmptyPasswords) {
      if (seen.has(password)) {
        duplicates.add(password);
      } else {
        seen.add(password);
      }
    }
    
    return Array.from(duplicates);
  }, [passwords]);

  const hasPasswords = passwords.some(p => p.trim() !== '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-4">⚖️</div>
        <h2 className="text-2xl font-bold text-white mb-2">Password Comparison</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Compare multiple passwords side-by-side to identify the strongest option. 
          Enter up to 6 passwords to analyze their relative strengths.
        </p>
      </div>

      {/* Identical Password Warning */}
      {identicalPasswords.length > 0 && (
        <div className="bg-yellow-900/40 border border-yellow-700/60 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-lg">⚠️</span>
            <div>
              <p className="text-yellow-200 font-medium">Identical Passwords Detected</p>
              <p className="text-yellow-300 text-sm">
                You have entered identical passwords. Consider using unique passwords for better security.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Password Input Section */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Enter Passwords</h3>
          <div className="flex gap-2">
            {passwords.length < 6 && (
              <button
                onClick={handleAddPassword}
                className="flex items-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-sm font-medium transition-colors duration-200"
                aria-label="Add another password field"
              >
                <PlusIcon className="w-4 h-4" />
                Add Password
              </button>
            )}
            {hasPasswords && (
              <button
                onClick={handleClearAll}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors duration-200"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {passwords.map((password, index) => (
            <ComparisonInput
              key={index}
              index={index}
              password={password}
              onPasswordChange={handlePasswordChange}
              onRemove={passwords.length > 2 ? handleRemovePassword : undefined}
              isIdentical={password.trim() !== '' && identicalPasswords.includes(password)}
            />
          ))}
        </div>
      </div>

      {/* Results Section */}
      {comparisonResults.length > 0 && (
        <ComparisonResults 
          results={comparisonResults}
          identicalPasswords={identicalPasswords}
        />
      )}

      {/* Empty State */}
      {!hasPasswords && (
        <div className="text-center p-8 bg-gray-800/30 rounded-lg border border-gray-700/30">
          <div className="text-6xl mb-4 opacity-50">🔐</div>
          <p className="text-gray-400 text-lg">
            Enter passwords above to start comparing their strengths
          </p>
          <p className="text-gray-500 text-sm mt-2">
            All analysis is performed locally in your browser
          </p>
        </div>
      )}
    </div>
  );
};