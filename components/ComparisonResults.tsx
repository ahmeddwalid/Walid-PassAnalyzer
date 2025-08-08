import React from 'react';
import { ComparisonResult } from '../types';
import { StrengthMeter } from './StrengthMeter';
import { ClipboardButton } from './ClipboardButton';
import { STRENGTH_LEVEL_CONFIG } from '../constants';
import { TrophyIcon, ShieldCheckIcon, ExclamationTriangleIcon } from './IconComponents';

interface ComparisonResultsProps {
  results: ComparisonResult[];
  identicalPasswords: string[];
}

export const ComparisonResults: React.FC<ComparisonResultsProps> = ({ 
  results, 
  identicalPasswords 
}) => {
  // Sort results by rank for display
  const sortedResults = [...results].sort((a, b) => a.rank - b.rank);
  
  // Get original input order index for each password
  const getOriginalIndex = (password: string) => {
    return results.findIndex(r => r.password === password) + 1;
  };
  
  const getStrengthInfo = (score: number) => {
    const safeScore = Math.max(0, Math.min(score, STRENGTH_LEVEL_CONFIG.length - 1));
    return STRENGTH_LEVEL_CONFIG[safeScore];
  };

  const formatCrackTime = (crackTimeDisplay: any) => {
    return crackTimeDisplay.offline_slow_hashing_1e4_per_second || 'Unknown';
  };

  const getPasswordPreview = (password: string) => {
    if (password.length <= 20) return password;
    return password.substring(0, 17) + '...';
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <TrophyIcon className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <span className="w-5 h-5 flex items-center justify-center text-gray-300 font-bold text-sm">2</span>;
      case 3:
        return <span className="w-5 h-5 flex items-center justify-center text-amber-600 font-bold text-sm">3</span>;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-gray-400 font-bold text-sm">{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white';
      case 2:
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
      case 3:
        return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
      default:
        return 'bg-gray-600 text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">Comparison Results</h3>
        <p className="text-gray-400">
          Passwords ranked by strength (score and entropy)
        </p>
      </div>

      {/* Results Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedResults.map((result, index) => {
          const strengthInfo = getStrengthInfo(result.analysis.score);
          const isIdentical = identicalPasswords.includes(result.password);
          const originalIndex = getOriginalIndex(result.password);
          
          return (
            <div
              key={result.password}
              className={`
                relative bg-gray-800/60 rounded-lg p-4 border-2 
                transition-all duration-500 ease-in-out transform
                ${result.isStrongest 
                  ? 'border-yellow-500/60 bg-yellow-900/10 shadow-lg shadow-yellow-500/20' 
                  : 'border-gray-700/50 hover:border-gray-600/50'
                }
                ${isIdentical ? 'ring-2 ring-yellow-500/30' : ''}
              `}
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              {/* Rank Badge */}
              <div className="absolute -top-2 -right-2">
                <div className={`
                  flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold
                  ${getRankBadgeColor(result.rank)}
                `}>
                  {getRankIcon(result.rank)}
                  <span>#{result.rank}</span>
                </div>
              </div>

              {/* Strongest Badge */}
              {result.isStrongest && (
                <div className="absolute -top-2 -left-2">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <ShieldCheckIcon className="w-3 h-3" />
                    Strongest
                  </div>
                </div>
              )}

              {/* Password Preview */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-300">
                    Password {originalIndex}
                  </h4>
                  <ClipboardButton 
                    content={result.password}
                    label="Copy"
                    className="text-xs px-2 py-1"
                  />
                </div>
                <div className="bg-gray-900/50 rounded p-2 font-mono text-sm text-gray-300 break-all">
                  {getPasswordPreview(result.password)}
                </div>
                {isIdentical && (
                  <div className="flex items-center gap-1 mt-1 text-yellow-400 text-xs">
                    <ExclamationTriangleIcon className="w-3 h-3" />
                    <span>Duplicate password</span>
                  </div>
                )}
              </div>

              {/* Strength Meter */}
              <div className="mb-3">
                <StrengthMeter score={result.analysis.score} />
              </div>

              {/* Metrics */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Length:</span>
                  <span className="text-gray-200">{result.password.length} chars</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Entropy:</span>
                  <span className="text-gray-200">{result.analysis.entropy.toFixed(1)} bits</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Crack Time:</span>
                  <span className="text-gray-200">{formatCrackTime(result.analysis.crack_times_display)}</span>
                </div>
              </div>

              {/* Warnings */}
              {result.analysis.feedback.warning && (
                <div className="mt-3 p-2 bg-red-900/30 border border-red-700/50 rounded text-xs">
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-red-200">{result.analysis.feedback.warning}</span>
                  </div>
                </div>
              )}

              {/* Custom Dictionary Matches */}
              {result.analysis.customDictionaryMatches && result.analysis.customDictionaryMatches.length > 0 && (
                <div className="mt-2 p-2 bg-orange-900/30 border border-orange-700/50 rounded text-xs">
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-3 h-3 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-orange-200 font-medium">Dictionary matches found:</span>
                      <div className="mt-1 space-y-1">
                        {result.analysis.customDictionaryMatches.slice(0, 3).map((match, idx) => (
                          <div key={idx} className="text-orange-300">
                            "{match.matchedWord}" in {match.dictionaryName}
                          </div>
                        ))}
                        {result.analysis.customDictionaryMatches.length > 3 && (
                          <div className="text-orange-400">
                            +{result.analysis.customDictionaryMatches.length - 3} more matches
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/40">
        <h4 className="text-lg font-semibold text-white mb-3">Summary</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h5 className="text-sm font-medium text-gray-300 mb-2">Strongest Password</h5>
            <div className="text-sm text-gray-400">
              {(() => {
                const strongest = results.find(r => r.isStrongest);
                if (!strongest) return 'No passwords analyzed';
                
                const strengthInfo = getStrengthInfo(strongest.analysis.score);
                const originalIndex = getOriginalIndex(strongest.password);
                return (
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${strengthInfo.color}`}></div>
                    <span>Password {originalIndex}</span>
                    <span className="text-gray-500">({strengthInfo.label})</span>
                  </div>
                );
              })()}
            </div>
          </div>
          
          <div>
            <h5 className="text-sm font-medium text-gray-300 mb-2">Recommendations</h5>
            <div className="text-sm text-gray-400">
              {(() => {
                const strongest = results.find(r => r.isStrongest);
                if (!strongest) return 'Enter passwords to get recommendations';
                
                if (strongest.analysis.score >= 3) {
                  return '✅ Your strongest password has good security';
                } else if (strongest.analysis.score >= 2) {
                  return '⚠️ Consider strengthening your passwords further';
                } else {
                  return '🚨 All passwords need significant improvement';
                }
              })()}
            </div>
          </div>
        </div>
        
        {identicalPasswords.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="text-yellow-200 font-medium">Security Warning:</span>
                <span className="text-yellow-300 ml-1">
                  You have {identicalPasswords.length} duplicate password{identicalPasswords.length > 1 ? 's' : ''}. 
                  Using unique passwords for different accounts is essential for security.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};