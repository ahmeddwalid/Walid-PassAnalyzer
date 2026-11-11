import { PATTERN_LABELS } from '../analyzer/PatternFindings';
import { formatGuesses, formatPowerOfTen } from '../../lib/format';
import type { ComparisonEntry, PatternKind } from '../../types';
import { ScoreScale } from '../ui/ScoreScale';

interface ComparisonResultsProps {
  entries: ComparisonEntry[];
  duplicateCount: number;
  updating: boolean;
}

function kindsFor(entry: ComparisonEntry): Set<PatternKind> {
  return new Set(
    entry.analysis.patterns
      .filter((pattern) => pattern.kind !== 'bruteforce')
      .map((pattern) => pattern.kind),
  );
}

export function ComparisonResults({ entries, duplicateCount, updating }: ComparisonResultsProps) {
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((left, right) => {
    if (right.analysis.guessesLog10 !== left.analysis.guessesLog10) {
      return right.analysis.guessesLog10 - left.analysis.guessesLog10;
    }
    return right.analysis.score - left.analysis.score;
  });

  const top = sorted[0];
  const second = sorted[1];
  const ratioLog = top && second ? top.analysis.guessesLog10 - second.analysis.guessesLog10 : 0;

  const topKinds = top ? kindsFor(top) : new Set<PatternKind>();
  const secondKinds = second ? kindsFor(second) : new Set<PatternKind>();
  const topAvoids = second ? [...secondKinds].filter((kind) => !topKinds.has(kind)) : [];
  const topContains = top ? [...topKinds] : [];

  return (
    <section
      className={`panel comparison-results${updating ? ' is-updating' : ''}`}
      aria-labelledby="comparison-results-title"
      aria-busy={updating}
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Ranking</p>
          <h2 id="comparison-results-title" className="panel-title">
            Relative guessability
          </h2>
        </div>
        <span className="mono-meta">{entries.length} candidates</span>
      </div>

      <p className="comparison-intro">
        Ranked by zxcvbn's estimated guesses, not by a character-class formula. The ranking is a
        coarse comparison of modelled resistance; it is not a claim that the top candidate is safe.
      </p>

      <div className="comparison-list">
        {sorted.map((entry) => {
          const fastest = [...entry.analysis.attacks].sort(
            (left, right) => left.seconds - right.seconds,
          )[0];
          const kinds = [...kindsFor(entry)];
          return (
            <article key={entry.id} className="comparison-row">
              <div className="comparison-row__rank">
                <span className="mono-meta">rank</span>
                <strong>{entry.rank}</strong>
              </div>
              <div className="comparison-row__identity">
                <h3>{entry.label}</h3>
                <span className="mono-meta">
                  {entry.analysis.codePointLength} characters · score {entry.analysis.score}/4
                </span>
              </div>
              <div className="comparison-row__score">
                <ScoreScale score={entry.analysis.score} compact />
              </div>
              <div className="comparison-row__numbers">
                <div>
                  <span className="mono-meta">guesses</span>
                  <strong>{formatPowerOfTen(entry.analysis.guessesLog10)}</strong>
                  <span>{formatGuesses(entry.analysis.guessesLog10)}</span>
                </div>
                <div>
                  <span className="mono-meta">fastest route</span>
                  <strong>{fastest?.display ?? 'unknown'}</strong>
                  <span>{fastest?.label ?? ''}</span>
                </div>
              </div>
              <div className="comparison-row__patterns">
                {kinds.length === 0 ? (
                  <span className="pattern-chip pattern-chip--neutral">no dominant pattern</span>
                ) : (
                  kinds.slice(0, 4).map((kind) => (
                    <span key={kind} className="pattern-chip">
                      {PATTERN_LABELS[kind]}
                    </span>
                  ))
                )}
              </div>
            </article>
          );
        })}
      </div>

      {top && second ? (
        <div className="difference-note">
          <p className="eyebrow">What differs</p>
          {ratioLog >= 1 ? (
            <p>
              <strong>{top.label}</strong> is estimated to require about{' '}
              <strong>{formatPowerOfTen(ratioLog)}</strong> times more guesses than{' '}
              <strong>{second.label}</strong>.
            </p>
          ) : ratioLog >= 0.3 ? (
            <p>
              <strong>{top.label}</strong> is estimated to require somewhat more guesses than{' '}
              <strong>{second.label}</strong>, but less than one full order of magnitude. Treat the
              difference as suggestive, not decisive.
            </p>
          ) : (
            <p>
              <strong>{top.label}</strong> and <strong>{second.label}</strong> are within the
              model's coarse resolution. Treat them as comparable rather than assuming the first
              rank is meaningfully safer.
            </p>
          )}
          {topAvoids.length > 0 ? (
            <p>
              The stronger candidate does not rely on{' '}
              {topAvoids.map((kind) => PATTERN_LABELS[kind].toLowerCase()).join(', ')}.
            </p>
          ) : topContains.length > 0 ? (
            <p>
              Both candidates contain recognized patterns. The difference is scale, not the presence
              of a single weakness.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="comparison-note">
          Add at least two non-empty candidates to see a relative ranking.
        </p>
      )}

      {duplicateCount > 0 ? (
        <p className="comparison-warning">
          {duplicateCount} duplicate {duplicateCount === 1 ? 'candidate was' : 'candidates were'}{' '}
          detected. Identical values cannot be meaningfully ranked against each other. Reusing one
          value across accounts is the more important risk.
        </p>
      ) : null}

      <details className="disclosure">
        <summary>Limits of comparing candidates</summary>
        <div className="disclosure__body">
          <p>
            Two candidates can receive the same score and still differ by orders of magnitude in
            estimated guesses. That is why the raw orders of magnitude are shown. Conversely, a
            small difference in the displayed rank may be noise rather than a meaningful security
            difference.
          </p>
          <p>
            The comparison does not know whether either candidate is reused, already breached, or
            subject to a provider's own password policy. Use candidates you invented; do not paste
            several live account passwords into any web page.
          </p>
        </div>
      </details>
    </section>
  );
}
