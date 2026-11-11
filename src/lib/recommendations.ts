import type { AnalysisResult, PatternKind } from '../types';

export interface Recommendation {
  title: string;
  body: string;
  group: 'candidate' | 'hygiene';
}

function hasKind(analysis: AnalysisResult, kind: PatternKind): boolean {
  return analysis.patterns.some(
    (pattern) => pattern.kind === kind && pattern.kind !== 'bruteforce',
  );
}

export function buildRecommendations(analysis: AnalysisResult): Recommendation[] {
  const candidate: Recommendation[] = [];

  if (analysis.onlyWhitespace) {
    candidate.push({
      title: 'Do not use whitespace on its own',
      body: 'Spaces are valid characters, but a value made only of spaces has almost no uncertainty. Start with a random password or a multi-word passphrase.',
      group: 'candidate',
    });
  }

  const highCustom = analysis.customMatches.filter((match) => match.severity === 'high');
  if (highCustom.length > 0) {
    candidate.push({
      title: 'Remove organization-specific terms',
      body: 'An imported dictionary term covers a meaningful part of this candidate. Anyone who knows the organization or has the same list can skip that search space.',
      group: 'candidate',
    });
  }

  if (hasKind(analysis, 'dictionary')) {
    candidate.push({
      title: 'Replace recognizable words',
      body: 'Common words, names, and familiar phrases are tried before brute force. A random password or randomly chosen passphrase avoids that shortcut.',
      group: 'candidate',
    });
  }

  if (hasKind(analysis, 'spatial') || hasKind(analysis, 'sequence')) {
    candidate.push({
      title: 'Break keyboard walks and sequences',
      body: 'Runs such as qwerty, asdf, or 1234 are among the first patterns an attacker enumerates. Do not simply add a character to the end of one.',
      group: 'candidate',
    });
  }

  if (hasKind(analysis, 'repeat')) {
    candidate.push({
      title: 'Avoid repeated runs',
      body: 'Repeating a character or a short block adds very little search space. Replace the repetition rather than adding more of it.',
      group: 'candidate',
    });
  }

  if (hasKind(analysis, 'date') || hasKind(analysis, 'regex')) {
    candidate.push({
      title: 'Remove dates, years, and predictable formats',
      body: 'Dates and recent years are cheap to enumerate, especially when they appear next to a name or a common word.',
      group: 'candidate',
    });
  }

  const fastOffline = analysis.attacks.find(
    (attack) => attack.key === 'offline_fast_hashing_1e10_per_second',
  );
  const fastOfflineVulnerable =
    fastOffline !== undefined &&
    Number.isFinite(fastOffline.seconds) &&
    fastOffline.seconds < 365 * 24 * 60 * 60;

  if (analysis.score <= 2) {
    candidate.push({
      title: 'Increase length and unpredictability',
      body: 'Length helps only when the extra characters are unpredictable. For a human-chosen value, a randomly generated passphrase of six or more words is easier to remember than a short, complex string.',
      group: 'candidate',
    });
  } else if (analysis.score >= 3 && fastOfflineVulnerable && candidate.length === 0) {
    candidate.push({
      title: 'Add more length against fast offline attacks',
      body: 'This candidate resists rate-limited logins, but a fast offline hash database (such as leaked MD5 or SHA-1 hashes) could crack it much sooner. Add more random characters or use a six-word passphrase.',
      group: 'candidate',
    });
  } else if (analysis.score >= 3 && candidate.length === 0) {
    candidate.push({
      title: 'Keep this candidate unique',
      body: 'The local model finds a substantial search space. The remaining risk is reuse or prior exposure, which a strength estimate cannot detect.',
      group: 'candidate',
    });
  }

  const hygiene: Recommendation[] = [
    {
      title: 'Use one password per account',
      body: 'A breach at one service should not compromise another. A password manager makes unique values practical.',
      group: 'hygiene',
    },
    {
      title: 'Check breach exposure',
      body: 'A password can be long and random and still be unsafe if it already appears in a breach corpus. The optional Pwned Passwords check runs locally except for a five-character hash prefix.',
      group: 'hygiene',
    },
    {
      title: 'Prefer MFA or a passkey',
      body: 'Multi-factor authentication and passkeys reduce the damage of a guessed or reused password. They are not a reason to choose a weaker password, but they are strong account-level controls.',
      group: 'hygiene',
    },
  ];

  return [...candidate, ...hygiene];
}
