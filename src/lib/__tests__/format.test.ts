import { describe, expect, it } from 'vitest';
import {
  clampLogPosition,
  codePointLength,
  formatGuesses,
  formatPowerOfTen,
  secondsBeyondScale,
  superscriptNumber,
} from '../format';

describe('formatting', () => {
  it('uses code-point length for Unicode', () => {
    expect(codePointLength('abc')).toBe(3);
    expect(codePointLength('☃')).toBe(1);
    expect(codePointLength('a☃')).toBe(2);
    expect(codePointLength('👩‍💻')).toBe(3); // two code points plus ZWJ; no grapheme claim
  });

  it('formats powers and guesses without a fake percentage', () => {
    expect(superscriptNumber(129)).toBe('¹²⁹');
    expect(formatPowerOfTen(14.4)).toBe('10¹⁴');
    expect(formatGuesses(1.7)).toBe('about 50 guesses');
    expect(formatGuesses(14.4)).toBe('about 10¹⁴ guesses');
  });

  it('clamps the attack marker to the visible logarithmic scale', () => {
    expect(clampLogPosition(0.01)).toBe(1.5);
    expect(clampLogPosition(1)).toBeGreaterThan(1.5);
    expect(clampLogPosition(Number.POSITIVE_INFINITY)).toBe(100);
    expect(secondsBeyondScale(10 ** 13)).toBe(true);
    expect(secondsBeyondScale(10 ** 11)).toBe(false);
  });
});
