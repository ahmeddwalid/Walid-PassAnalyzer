
import React from 'react';
import { ZxcvbnResult } from '../types';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, ClockIcon } from './IconComponents';

interface FeedbackDisplayProps {
  result: ZxcvbnResult;
}

export const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ result }) => {
  const { feedback, crack_times_display, calc_time } = result;

  const crackTimeExplanations = [
    {
      key: 'online_no_throttling_10_per_second',
      label: 'Online Attack (Unthrottled)',
      rateContext: '10 guesses/second',
      value: crack_times_display.online_no_throttling_10_per_second,
      explanation: 'Context: An automated attack targeting an online service that has no protection against rapid, repeated login attempts.',
    },
    {
      key: 'online_throttling_100_per_hour',
      label: 'Online Attack (Throttled)',
      rateContext: '100 guesses/hour',
      value: crack_times_display.online_throttling_100_per_hour,
      explanation: 'Context: An automated attack targeting an online service that implements rate limiting or account lockouts after a few failed attempts.',
    },
    {
      key: 'offline_slow_hashing_1e4_per_second', 
      label: 'Offline Attack (Slow Hash)',
      rateContext: '10,000 guesses/second',
      value: crack_times_display.offline_slow_hashing_1e4_per_second,
      explanation: 'Context: An attacker has obtained a database of password hashes (e.g., from a data breach). These hashes are protected with a slow, strong hashing algorithm (like bcrypt, scrypt, or Argon2), which are designed to be computationally intensive. Cracking is attempted using a modern CPU.',
    },
    {
      key: 'offline_fast_hashing_1e10_per_second', 
      label: 'Offline Attack (Fast Hash/GPU)',
      rateContext: '10 billion guesses/second',
      value: crack_times_display.offline_fast_hashing_1e10_per_second,
      explanation: 'Context: An attacker targets password hashes protected with a fast hashing algorithm (like MD5 or unsalted SHA-1/SHA-256), which are not designed to resist brute-force attacks, or employs significant computational resources like multiple high-end GPUs or a large botnet.',
    },
  ];

  return (
    <div className="mt-6 space-y-6">
      {/* Crack Times */}
      <div className="p-5 bg-gray-700/40 rounded-lg shadow-lg border border-gray-600/60">
        <h3 className="text-xl font-semibold text-sky-300 mb-4 flex items-center">
          <InformationCircleIcon className="w-6 h-6 mr-2.5 text-sky-300 flex-shrink-0" />
          Estimated Time to Crack
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {crackTimeExplanations.map(item => (
            <div key={item.key || item.label} className="flex flex-col p-4 bg-gray-700/50 rounded-lg border border-gray-600/50 shadow-md">
              <div>
                <span className="font-semibold text-gray-100 text-base">{item.label}</span>
                <span className="block text-xs text-sky-300/90 mt-0.5">{item.rateContext}</span>
              </div>
              <p className="text-2xl font-bold text-gray-50 my-2">{item.value || 'N/A'}</p>
              <p className="text-xs text-gray-300 leading-relaxed">{item.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Warning */}
      {feedback.warning && (
        <div className="p-5 bg-yellow-800/50 border border-yellow-600/70 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-yellow-300 mb-3 flex items-center">
            <ExclamationTriangleIcon className="w-6 h-6 mr-2.5 text-yellow-300 flex-shrink-0" />
            Warning
          </h3>
          <p className="text-yellow-100 text-sm leading-relaxed">{feedback.warning}</p>
        </div>
      )}

      {/* Suggestions */}
      {feedback.suggestions && feedback.suggestions.length > 0 && (
        <div className="p-5 bg-gray-700/30 border border-gray-600/50 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-green-300 mb-4 flex items-center">
            <CheckCircleIcon className="w-6 h-6 mr-2.5 text-green-300 flex-shrink-0" />
            How to Improve Your Password
          </h3>
          <ul className="space-y-2.5 text-sm text-gray-200">
            {feedback.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <svg className="w-4 h-4 text-green-400 mr-2.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="leading-relaxed">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
       {calc_time !== undefined && 
          <div className="flex items-center justify-center text-xs text-gray-500 mt-5 pt-4 border-t border-gray-700/30">
            <ClockIcon className="w-3.5 h-3.5 mr-1.5 text-gray-500"/> 
            Analysis completed in {calc_time}ms
          </div>
        }
    </div>
  );
};
