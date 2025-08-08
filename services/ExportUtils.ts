import { ZxcvbnResult } from '../types';
import { AnalysisData } from './interfaces';

/**
 * Convert zxcvbn result to AnalysisData format for export
 */
export function createAnalysisData(
  password: string,
  zxcvbnResult: ZxcvbnResult,
  customNotes?: string
): AnalysisData {
  return {
    timestamp: new Date(),
    passwordLength: password.length,
    strengthScore: zxcvbnResult.score,
    crackTimes: {
      online_no_throttling_10_per_second: zxcvbnResult.crack_times_display.online_no_throttling_10_per_second,
      online_throttling_100_per_hour: zxcvbnResult.crack_times_display.online_throttling_100_per_hour,
      offline_slow_hashing_1e4_per_second: zxcvbnResult.crack_times_display.offline_slow_hashing_1e4_per_second,
      offline_fast_hashing_1e10_per_second: zxcvbnResult.crack_times_display.offline_fast_hashing_1e10_per_second
    },
    feedback: {
      warning: zxcvbnResult.feedback.warning || '',
      suggestions: zxcvbnResult.feedback.suggestions || []
    },
    customNotes
  };
}

/**
 * Generate a safe filename for export
 */
export function generateExportFilename(format: 'pdf' | 'text', prefix = 'password-analysis'): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const extension = format === 'pdf' ? 'pdf' : 'txt';
  return `${prefix}-${timestamp}.${extension}`;
}

/**
 * Validate analysis data before export
 */
export function validateAnalysisData(data: AnalysisData): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  return !!(
    data.timestamp &&
    typeof data.passwordLength === 'number' &&
    typeof data.strengthScore === 'number' &&
    data.crackTimes &&
    data.feedback
  );
}