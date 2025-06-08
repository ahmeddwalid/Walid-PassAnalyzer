export interface ZxcvbnResult {
  score: 0 | 1 | 2 | 3 | 4;
  feedback: {
    warning: string;
    suggestions: string[];
  };
  crack_times_display: {
    online_no_throttling_10_per_second: string;
    online_throttling_100_per_hour: string;
    offline_slow_hashing_1e4_per_second: string;
    offline_fast_hashing_1e10_per_second: string;
  };
  calc_time: number; // Time in ms zxcvbn took to calculate
}

export interface StrengthLevelInfo {
  label: string;
  color: string; // Tailwind background color class
  textColor: string; // Tailwind text color class
  barWidthClass: string; // Tailwind width class for the meter bar
}
