/* eslint-disable react-refresh/only-export-components */
import { formatGuesses, formatPowerOfTen } from '../../lib/format';
import type { AnalysisResult, PatternKind } from '../../types';
import { Icon } from '../Icon';

export const PATTERN_LABELS: Record<PatternKind, string> = {
  dictionary: 'Common word',
  spatial: 'Keyboard pattern',
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
              style={{ width: `${Math.max(2, (pattern.length / total) * 100)}%` }}
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
    </div>
  );
}

interface PatternFindingsProps {
  result: AnalysisResult;
}

export function PatternFindings({ result }: PatternFindingsProps) {
  const patterns = result.patterns.filter((pattern) => pattern.kind !== 'bruteforce');

  return (
    <section className="detail-card" aria-labelledby="patterns-title">
      <div className="detail-card__head">
        <div>
          <h3 id="patterns-title" className="detail-card__title">
            Detected patterns
          </h3>
          <p className="detail-card__subtitle">
            Positions and types of patterns found in your password, without exposing the text
            itself.
          </p>
        </div>
      </div>

      <PatternMap result={result} />

      {patterns.length === 0 ? (
        <div className="pattern-empty">
          <Icon name="check" size={18} />
          <p>
            No recognizable words, dates, or keyboard runs were found. Strength comes from
            unpredictable characters rather than familiar patterns.
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
                  : `chars ${pattern.start}–${pattern.end}`}
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
            <Icon name="dictionary" size={16} />
            <h4>Imported dictionary matches</h4>
          </div>
          <p>
            Matched words are hidden to keep sensitive lists private. Only the dictionary name and
            character positions are shown.
          </p>
          <ul>
            {result.customMatches.slice(0, 6).map((match) => (
              <li key={`${match.dictionaryId}-${match.start}-${match.end}`}>
                <span>
                  {match.dictionaryName} · chars {match.start}–{match.end}
                </span>
                <span className={`severity severity--${match.severity}`}>{match.severity}</span>
              </li>
            ))}
          </ul>
          {result.customMatches.length > 6 ? (
            <p className="mono-meta">+{result.customMatches.length - 6} more matches not shown</p>
          ) : null}
        </div>
      ) : null}

      <dl className="tech-ledger" aria-label="Technical model measurements">
        <div className="tech-ledger__item">
          <dt>Estimated guesses</dt>
          <dd>
            {formatPowerOfTen(result.guessesLog10)}
            <span>{formatGuesses(result.guessesLog10)}</span>
          </dd>
        </div>
        <div className="tech-ledger__item">
          <dt>Length</dt>
          <dd>
            {result.codePointLength.toLocaleString('en-US')}
            <span>{result.codePointLength === 1 ? 'character' : 'characters'}</span>
          </dd>
        </div>
        <div className="tech-ledger__item">
          <dt>Pattern coverage</dt>
          <dd>
            {Math.round(result.patternCoverage * 100)}%<span>of characters</span>
          </dd>
        </div>
        <div className="tech-ledger__item">
          <dt>zxcvbn score</dt>
          <dd>
            {result.score} / 4<span>{result.calcTimeMs.toLocaleString('en-US')} ms local</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
