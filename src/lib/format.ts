export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function codePointLength(value: string): number {
  return Array.from(value).length;
}

const SUPERSCRIPT: Record<string, string> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};

export function superscriptNumber(value: number): string {
  return String(value)
    .split('')
    .map((character) => SUPERSCRIPT[character] ?? character)
    .join('');
}

export function formatPowerOfTen(log10: number): string {
  if (!Number.isFinite(log10)) return 'beyond measure';
  const rounded = Math.max(0, Math.round(log10));
  return `10${superscriptNumber(rounded)}`;
}

export function formatGuesses(log10: number): string {
  if (!Number.isFinite(log10)) return 'an uncountable number';
  if (log10 < 3) {
    const guesses = Math.round(10 ** log10);
    return `about ${guesses.toLocaleString('en-US')} guesses`;
  }
  return `about ${formatPowerOfTen(log10)} guesses`;
}

export function formatBits(bits: number): string {
  if (!Number.isFinite(bits)) return 'uncountable';
  if (bits >= 100) return `${Math.round(bits)} bits`;
  if (bits >= 10) return `${bits.toFixed(1)} bits`;
  return `${bits.toFixed(2)} bits`;
}

export function formatPoolSize(size: number): string {
  return size.toLocaleString('en-US');
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatDateForFilename(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? singular : plural}`;
}

export function clampLogPosition(seconds: number): number {
  if (!Number.isFinite(seconds)) return 100;
  if (seconds <= 0) return 0;
  const minLog = -1; // 0.1 seconds
  const maxLog = 12.5; // roughly 10,000 years
  const position = ((Math.log10(seconds) - minLog) / (maxLog - minLog)) * 100;
  return clamp(position, 1.5, 100);
}

export function secondsBeyondScale(seconds: number): boolean {
  return seconds === Number.POSITIVE_INFINITY || (Number.isFinite(seconds) && seconds > 10 ** 12.5);
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}
