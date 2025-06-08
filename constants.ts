import { StrengthLevelInfo } from './types';

export const STRENGTH_LEVEL_CONFIG: StrengthLevelInfo[] = [
  // Score 0: Very Weak
  { label: "Very Weak", color: "bg-red-600", textColor: "text-red-400", barWidthClass: "w-[20%]" },
  // Score 1: Weak
  { label: "Weak", color: "bg-orange-500", textColor: "text-orange-400", barWidthClass: "w-[40%]" },
  // Score 2: Fair
  { label: "Fair", color: "bg-yellow-500", textColor: "text-yellow-400", barWidthClass: "w-[60%]" },
  // Score 3: Good
  { label: "Good", color: "bg-lime-500", textColor: "text-lime-400", barWidthClass: "w-[80%]" },
  // Score 4: Strong
  { label: "Strong", color: "bg-green-500", textColor: "text-green-400", barWidthClass: "w-full" },
];

export const DEFAULT_STRENGTH_LABEL = "Enter a password to assess";