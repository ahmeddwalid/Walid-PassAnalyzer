import React from 'react';
import { STRENGTH_LEVEL_CONFIG } from '../constants';
import { StrengthLevelInfo } from '../types';

interface StrengthMeterProps {
  score: number; // 0-4 from zxcvbn.
}

export const StrengthMeter: React.FC<StrengthMeterProps> = ({ score }) => {
  const safeScore = Math.max(0, Math.min(score, STRENGTH_LEVEL_CONFIG.length - 1));
  const currentStrength: StrengthLevelInfo = STRENGTH_LEVEL_CONFIG[safeScore];
  
  // Calculate percentage (0-4 scale to 0-100%)
  // Score 0 -> 20%, 1 -> 40%, 2 -> 60%, 3 -> 80%, 4 -> 100%
  // This matches the barWidthClass percentages roughly.
  const percentage = (safeScore + 1) * 20;

  if (!currentStrength) { 
    return (
        <div className="w-full my-4">
            <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-medium text-gray-400">
                Password Strength: Unknown
                </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4 shadow-inner">
                <div
                className="h-full rounded-full bg-gray-500 w-0"
                role="progressbar"
                aria-valuenow={0}
                aria-valuemin={0}
                aria-valuemax={4}
                aria-label="Password strength: Unknown"
                ></div>
            </div>
        </div>
    );
  }

  return (
    <div className="w-full my-4" aria-live="polite">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className={`text-base font-semibold ${currentStrength.textColor}`}>
          Strength: {currentStrength.label}
        </span>
        <span className={`text-sm font-medium ${currentStrength.textColor}`}>
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-gray-600/70 rounded-full h-4 overflow-hidden shadow-inner border border-gray-500/30">
        <div
          className={`h-full rounded-full ${currentStrength.color} transition-all duration-700 ease-in-out ${currentStrength.barWidthClass}`}
          style={{ transitionProperty: 'width, background-color' }}
          role="progressbar"
          aria-valuenow={safeScore}
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuetext={`${currentStrength.label} (${percentage}%)`}
          aria-label={`Password strength: ${currentStrength.label}`}
        ></div>
      </div>
    </div>
  );
};