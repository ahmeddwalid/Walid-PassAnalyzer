import { ATTACK_DEFINITIONS, MAX_MODEL_INPUT_LENGTH } from '../constants';
import type {
  AnalysisResult,
  AttackKey,
  AttackScenario,
  PatternFinding,
  PatternKind,
  Score,
} from '../types';

export class AnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalysisError';
  }
}

export interface RawMatch {
  pattern?: string;
  i?: number;
  j?: number;
  guesses_log10?: number;
  dictionary_name?: string;
  l33t?: boolean;
  reversed?: boolean;
  uppercase_variations?: number;
  repeat_count?: number;
  regex_name?: string;
  sequence_name?: string;
}

export interface RawAnalysis {
  score: number;
  guesses: number;
  guesses_log10: number;
  crack_times_seconds: Partial<Record<AttackKey, number | string>>;
  crack_times_display: Partial<Record<AttackKey, number | string>>;
  feedback: {
    warning?: string;
    suggestions?: string[];
  };
  sequence: RawMatch[];
  calc_time: number;
}

export type ZxcvbnFunction = (password: string, userInputs?: string[]) => RawAnalysis;

export type ModelAnalysis = Omit<AnalysisResult, 'customMatches'>;

function isScore(value: number): value is Score {
  return value === 0 || value === 1 || value === 2 || value === 3 || value === 4;
}

function patternKind(pattern: string | undefined): PatternKind {
  switch (pattern) {
    case 'dictionary':
      return 'dictionary';
    case 'spatial':
      return 'spatial';
    case 'repeat':
      return 'repeat';
    case 'sequence':
      return 'sequence';
    case 'regex':
      return 'regex';
    case 'date':
      return 'date';
    case 'bruteforce':
      return 'bruteforce';
    default:
      return 'unknown';
  }
}

function dictionaryLabel(name: string | undefined): string {
  switch (name) {
    case 'passwords':
      return 'common password';
    case 'english_wikipedia':
      return 'common English word';
    case 'female_names':
    case 'male_names':
    case 'surnames':
      return 'common name';
    case 'us_tv_and_film':
      return 'familiar phrase from film and television';
    case 'user_inputs':
      return 'imported dictionary term';
    default:
      return 'known word list';
  }
}

function describePattern(match: RawMatch, kind: PatternKind): string {
  switch (kind) {
    case 'dictionary': {
      let description = `Matches a ${dictionaryLabel(match.dictionary_name)}.`;
      if (match.l33t) description += ' Letter substitutions were detected.';
      if (match.reversed) description += ' It also appears in reverse.';
      if ((match.uppercase_variations ?? 1) > 1) {
        description += ' Case changes do not add meaningful uncertainty.';
      }
      return description;
    }
    case 'spatial':
      return 'A keyboard-adjacent run. These are among the first patterns an attacker tries.';
    case 'repeat': {
      const repeats = match.repeat_count ?? 2;
      return `A repeated run (${repeats.toLocaleString('en-US')} repetitions) adds little uncertainty.`;
    }
    case 'sequence':
      return 'A sequential run, such as letters or digits in order.';
    case 'regex':
      return match.regex_name === 'recent_year'
        ? 'A recent year. These are cheap to enumerate.'
        : 'A predictable format that is cheap to enumerate.';
    case 'date':
      return 'A date-like pattern. Dates are a common and early guessing strategy.';
    case 'bruteforce':
      return 'Characters without a recognized pattern.';
    default:
      return 'A pattern zxcvbn identified in the estimate.';
  }
}

function toCodePointPosition(password: string, utf16Index: number): number {
  const safeIndex = Math.max(0, Math.min(utf16Index, password.length));
  return Array.from(password.slice(0, safeIndex)).length + 1;
}

function sanitize(raw: RawAnalysis, password: string, adjusted: boolean): ModelAnalysis {
  const codePointLength = Array.from(password).length;

  const patterns: PatternFinding[] = raw.sequence.map((match) => {
    const kind = patternKind(match.pattern);
    const startUnit = match.i ?? 0;
    const endUnit = match.j ?? startUnit;
    const start = toCodePointPosition(password, startUnit);
    const end = toCodePointPosition(password, endUnit);
    return {
      kind,
      start,
      end,
      length: Math.max(0, end - start + 1),
      guessesLog10: match.guesses_log10 ?? 0,
      note: describePattern(match, kind),
      ...(match.dictionary_name ? { dictionaryName: dictionaryLabel(match.dictionary_name) } : {}),
    };
  });

  const recognizedLength = patterns
    .filter((pattern) => pattern.kind !== 'bruteforce')
    .reduce((sum, pattern) => sum + pattern.length, 0);

  const attacks: AttackScenario[] = ATTACK_DEFINITIONS.map((definition) => {
    const secondsValue = Number(raw.crack_times_seconds[definition.key]);
    const seconds = Number.isFinite(secondsValue) ? secondsValue : Number.POSITIVE_INFINITY;
    return {
      key: definition.key,
      label: definition.label,
      model: definition.model,
      rateLabel: definition.rateLabel,
      seconds,
      display: String(raw.crack_times_display[definition.key] ?? 'unknown'),
    };
  });

  const score = isScore(raw.score) ? raw.score : 0;
  const guesses = Number.isFinite(raw.guesses) ? raw.guesses : Number.MAX_VALUE;
  const guessesLog10 = Number.isFinite(raw.guesses_log10) ? raw.guesses_log10 : Math.log10(guesses);

  return {
    score,
    guesses,
    guessesLog10,
    attacks,
    patterns,
    feedback: {
      warning: raw.feedback.warning ?? '',
      suggestions: raw.feedback.suggestions ?? [],
    },
    dictionaryAdjusted: adjusted,
    calcTimeMs: Number.isFinite(raw.calc_time) ? raw.calc_time : 0,
    codePointLength,
    onlyWhitespace: /^\s+$/u.test(password),
    // Control range is intentional: this detects non-ASCII input for a UI note.
    // eslint-disable-next-line no-control-regex
    hasUnicode: /[^\u0000-\u007f]/u.test(password),
    patternCoverage: codePointLength === 0 ? 0 : Math.min(1, recognizedLength / codePointLength),
  };
}

/**
 * Runs the model and optionally re-estimates with matched organization terms.
 * The returned object omits every token, matched word, and candidate value.
 */
export function runModel(
  password: string,
  userInputs: string[],
  analyzer: ZxcvbnFunction,
): ModelAnalysis {
  if (password.length === 0) {
    throw new AnalysisError('There is no candidate to analyze.');
  }
  if (Array.from(password).length > MAX_MODEL_INPUT_LENGTH) {
    throw new AnalysisError(
      `The pattern model is limited to ${MAX_MODEL_INPUT_LENGTH} characters. The candidate was not truncated or modified.`,
    );
  }

  let raw = analyzer(password);
  let adjusted = false;

  if (userInputs.length > 0) {
    const withTerms = analyzer(password, userInputs);
    if (withTerms.guesses_log10 < raw.guesses_log10) {
      raw = withTerms;
      adjusted = true;
    }
  }

  return sanitize(raw, password, adjusted);
}
