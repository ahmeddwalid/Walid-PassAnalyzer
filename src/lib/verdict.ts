import type { AnalysisResult, AttackScenario, PatternKind } from '../types';

export type StrengthTier = 0 | 1 | 2 | 3 | 4;

export interface AssessmentVerdict {
  tier: StrengthTier;
  label: 'Very weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  tone: 'danger' | 'caution' | 'warning' | 'positive';
  qualifier: string | null;
  explanation: string;
  fastestAttack: AttackScenario | null;
  fastHashWeakLink: AttackScenario | null;
}

const ONE_DAY_SECONDS = 24 * 60 * 60;
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

const PATTERN_PHRASES: Partial<Record<PatternKind, string>> = {
  dictionary: 'common words',
  spatial: 'a keyboard walk',
  sequence: 'a character sequence',
  repeat: 'repeated characters',
  date: 'a date',
  regex: 'a predictable format',
};

function describeDetectedPatterns(result: AnalysisResult): string | null {
  const seen = new Set<string>();
  const phrases: string[] = [];

  for (const pattern of result.patterns) {
    if (pattern.kind === 'bruteforce' || pattern.kind === 'unknown') continue;
    const phrase =
      pattern.kind === 'regex' && pattern.note.toLowerCase().includes('recent year')
        ? 'a recent year'
        : PATTERN_PHRASES[pattern.kind];
    if (phrase && !seen.has(phrase)) {
      seen.add(phrase);
      phrases.push(phrase);
    }
    if (phrases.length === 2) break;
  }

  if (phrases.length === 0) return null;
  if (phrases.length === 1) return phrases[0] ?? null;
  return `${phrases[0]} and ${phrases[1]}`;
}

export function getFastestAttack(result: AnalysisResult): AttackScenario | null {
  if (result.attacks.length === 0) return null;
  return [...result.attacks].sort((left, right) => left.seconds - right.seconds)[0] ?? null;
}

export function buildVerdict(result: AnalysisResult): AssessmentVerdict {
  const fastestAttack = getFastestAttack(result);
  const fastHash =
    result.attacks.find((attack) => attack.key === 'offline_fast_hashing_1e10_per_second') ?? null;
  const hasHighCustom = result.customMatches.some((match) => match.severity === 'high');
  const fastHashUnderDay =
    fastHash !== null && Number.isFinite(fastHash.seconds) && fastHash.seconds < ONE_DAY_SECONDS;
  const fastHashUnderYear =
    fastHash !== null && Number.isFinite(fastHash.seconds) && fastHash.seconds < ONE_YEAR_SECONDS;
  const patternSummary = describeDetectedPatterns(result);

  if (result.onlyWhitespace) {
    return {
      tier: 0,
      label: 'Very weak',
      tone: 'danger',
      qualifier: 'Whitespace only',
      explanation:
        'Spaces count as characters, but a password made only of whitespace has almost no randomness and is trivial to guess.',
      fastestAttack,
      fastHashWeakLink: null,
    };
  }

  if (result.score === 0) {
    const reason = patternSummary
      ? `It relies on ${patternSummary}, which automated tools try immediately.`
      : 'Its search space is tiny, so automated tools can guess it almost immediately.';
    return {
      tier: 0,
      label: 'Very weak',
      tone: 'danger',
      qualifier: null,
      explanation: reason,
      fastestAttack,
      fastHashWeakLink: null,
    };
  }

  if (result.score === 1) {
    const reason = patternSummary
      ? `Built with ${patternSummary}, making it quick for an automated attack to guess.`
      : 'A small search space leaves it vulnerable to fast guessing.';
    return {
      tier: 1,
      label: 'Weak',
      tone: 'caution',
      qualifier: null,
      explanation: reason,
      fastestAttack,
      fastHashWeakLink: null,
    };
  }

  if (result.score === 2) {
    const reason = patternSummary
      ? `Contains ${patternSummary}. It may resist rate-limited logins, but a fast offline attack could crack it quickly.`
      : 'It may hold up against rate-limited logins, but a fast offline attack can crack it quickly.';
    return {
      tier: 2,
      label: 'Fair',
      tone: 'warning',
      qualifier: null,
      explanation: reason,
      fastestAttack,
      fastHashWeakLink: null,
    };
  }

  if (hasHighCustom) {
    return {
      tier: 2,
      label: 'Fair',
      tone: 'warning',
      qualifier: 'Custom list match',
      explanation:
        'It looks strong to a generic estimator, but matches an imported dictionary term that lowers resistance against targeted attacks.',
      fastestAttack,
      fastHashWeakLink: fastHashUnderDay ? fastHash : null,
    };
  }

  if (fastHashUnderDay && fastHash) {
    const patternIntro = patternSummary ? `Built with ${patternSummary}. ` : '';
    return {
      tier: 2,
      label: 'Fair',
      tone: 'warning',
      qualifier: 'Fast offline risk',
      explanation: `${patternIntro}It resists slow logins and strong password hashing, though a fast offline attack could still crack it in ${fastHash.display}.`,
      fastestAttack,
      fastHashWeakLink: fastHash,
    };
  }

  if (result.score === 3 || (fastHashUnderYear && fastHash)) {
    const fastNote = fastHash
      ? `Against a fast unthrottled hash dump it holds for ${fastHash.display}; adding a bit more length raises that to centuries.`
      : 'It provides solid protection across online logins and offline cracking.';
    const reason = patternSummary
      ? `Uses ${patternSummary}, yet remains long enough to resist online logins and slow hashing. ${fastNote}`
      : `Resists rate-limited logins and slow password hashing well. ${fastNote}`;
    return {
      tier: 3,
      label: 'Good',
      tone: 'positive',
      qualifier: null,
      explanation: reason,
      fastestAttack,
      fastHashWeakLink: null,
    };
  }

  return {
    tier: 4,
    label: 'Strong',
    tone: 'positive',
    qualifier: null,
    explanation: patternSummary
      ? `Even with ${patternSummary}, its length creates a large search space that resists both online and fast offline attacks.`
      : 'No predictable patterns detected. Its length and randomness resist both online logins and fast offline attacks.',
    fastestAttack,
    fastHashWeakLink: null,
  };
}
