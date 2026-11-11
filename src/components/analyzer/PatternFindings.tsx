/* eslint-disable react-refresh/only-export-components */
import type { AnalysisResult, PatternKind } from '../../types';
import { formatPowerOfTen } from '../../lib/format';
import { Icon } from '../Icon';

export const PATTERN_LABELS: Record<PatternKind, string> = {
  dictionary: 'Recognizable term',
  spatial: 'Keyboard run',
  repeat: 'Repetition',
  sequence: 'Sequence',
  regex: 'Predictable format',
  date: 'Date pattern',
  bruteforce: 'Unmatched characters',
  unknown: 'Other pattern',
};

interface PatternMapProps {
  result: AnalysisResult;
}

export function PatternMap({ result }: PatternMapProps) {
  const total = Math.max(
    result.codePointLength,
    result.patterns.reduce((sum, pattern) => sum + pattern.length, 0),
    1,
  );
  const presentKinds = Array.from(new Set(result.patterns.map((pattern) => pattern.kind)));

  return (
    <div className="pattern-map">
      <div className="pattern-map__bar" aria-hidden="true">
        {result.patterns.length === 0 ? (
          <span className="pattern-segment pattern-segment--unknown" style={{ width: '100%' }} />
        ) : (
          result.patterns.map((pattern, index) => (
            <span
              key={`${pattern.kind}-${pattern.start}-${index}`}
              className={`pattern-segment pattern-segment--${pattern.kind}`}
              style={{ width: `${Math.max(1, (pattern.length / total) * 100)}%` }}
            />
          ))
        )}
      </div>
      <div className="pattern-map__legend">
        {presentKinds.length === 0 ? (
          <span>No pattern map available</span>
        ) : (
          presentKinds.map((kind) => (
            <span key={kind} className="pattern-legend-item">
              <span className={`pattern-swatch pattern-segment--${kind}`} aria-hidden="true" />
              {PATTERN_LABELS[kind]}
            </span>
          ))
        )}
      </div>
      <p className="pattern-map__caption">
        The map partitions the candidate by the model's own sequence. Labels never include the
        candidate text.
      </p>
    </div>
  );
}

interface PatternFindingsProps {
  result: AnalysisResult;
}

export function PatternFindings({ result }: PatternFindingsProps) {
  const patterns = result.patterns.filter((pattern) => pattern.kind !== 'bruteforce');

  return (
    <section className="panel patterns-panel" aria-labelledby="patterns-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Patterns</p>
          <h2 id="patterns-title" className="panel-title">
            Why this result
          </h2>
        </div>
        <span className="mono-meta">model sequence</span>
      </div>

      <PatternMap result={result} />

      {patterns.length === 0 ? (
        <div className="pattern-empty">
          <Icon name="analyze" size={18} />
          <p>
            No dominant recognizable pattern was found. The estimate is driven by
            character-by-character guessing, not by a dictionary hit or a keyboard walk.
          </p>
        </div>
      ) : (
        <ul className="pattern-list">
          {patterns.map((pattern, index) => (
            <li key={`${pattern.kind}-${pattern.start}-${index}`} className="pattern-row">
              <div className="pattern-row__kind">
                <span
                  className={`pattern-swatch pattern-segment--${pattern.kind}`}
                  aria-hidden="true"
                />
                <span>{PATTERN_LABELS[pattern.kind]}</span>
              </div>
              <div className="pattern-row__span">
                {pattern.start === pattern.end
                  ? `char ${pattern.start}`
                  : `chars ${pattern.start}-${pattern.end}`}
              </div>
              <p className="pattern-row__note">{pattern.note}</p>
              <div className="pattern-row__weight">
                <span className="mono-meta">~{formatPowerOfTen(pattern.guessesLog10)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {result.customMatches.length > 0 ? (
        <div className="custom-match-block">
          <div className="custom-match-block__head">
            <Icon name="dictionary" size={17} />
            <h3>Imported dictionary matches</h3>
          </div>
          <p>
            Matched terms are withheld from this page. The organization or dictionary name is shown
            so you can decide whether the candidate depends on a known term.
          </p>
          <ul>
            {result.customMatches.slice(0, 6).map((match) => (
              <li key={`${match.dictionaryId}-${match.start}-${match.end}`}>
                <span>
                  {match.dictionaryName} · chars {match.start}-{match.end}
                </span>
                <span className={`severity severity--${match.severity}`}>{match.severity}</span>
              </li>
            ))}
          </ul>
          {result.customMatches.length > 6 ? (
            <p className="mono-meta">+{result.customMatches.length - 6} more matches, not shown</p>
          ) : null}
        </div>
      ) : null}

      <details className="disclosure">
        <summary>How the estimate is assembled</summary>
        <div className="disclosure__body">
          <p>
            zxcvbn splits the candidate into patterns, assigns each a guess estimate, and combines
            them. A long dictionary word is cheap; a random character run is expensive. The model
            then adds a small penalty for case and substitution variations.
          </p>
          <p>
            The 0-4 score is a coarse band derived from the estimated guesses. The raw orders of
            magnitude are shown above because they carry more information than a percentage.
          </p>
        </div>
      </details>
    </section>
  );
}
