import { SCORE_VERDICTS } from '../../constants';
import { formatGuesses, formatPowerOfTen } from '../../lib/format';
import type { AnalysisResult } from '../../types';
import { ScoreScale } from '../ui/ScoreScale';
import { Callout } from '../ui/Callout';

interface AssessmentSummaryProps {
  result: AnalysisResult;
}

export function AssessmentSummary({ result }: AssessmentSummaryProps) {
  const verdict = SCORE_VERDICTS[result.score];
  const fastHash = result.attacks.find(
    (attack) => attack.key === 'offline_fast_hashing_1e10_per_second',
  );
  const highCustom = result.customMatches.filter((match) => match.severity === 'high');
  const fastHashIsWeakLink =
    result.score >= 3 &&
    fastHash !== undefined &&
    Number.isFinite(fastHash.seconds) &&
    fastHash.seconds < 365 * 24 * 60 * 60;

  return (
    <section className="panel assessment-summary" aria-labelledby="assessment-title">
      <div className="assessment-summary__top">
        <div>
          <p className="eyebrow">Assessment</p>
          <h2 id="assessment-title" className="assessment-verdict">
            {verdict.label}
          </h2>
        </div>
        <span className="model-badge">
          zxcvbn <strong>{result.score}</strong> / 4
        </span>
      </div>

      <p className="assessment-summary__body">{verdict.summary}</p>

      {highCustom.length > 0 ? (
        <Callout
          tone="accent"
          icon="dictionary"
          title="A known organization term reduces the effective space"
        >
          {highCustom.length === 1
            ? 'One high-severity imported match covers'
            : `${highCustom.length} high-severity imported matches cover`}{' '}
          {highCustom.reduce((sum, match) => sum + match.wordLength, 0).toLocaleString('en-US')}{' '}
          characters. The headline band is a generic model score; anyone holding the same list
          starts from a smaller space.
        </Callout>
      ) : null}

      {fastHashIsWeakLink && fastHash ? (
        <Callout tone="warning" icon="alert" title="The weakest modelled route is much cheaper">
          The score band reflects a slow-hash scenario. Against a fast-hash database, the estimate
          drops to <strong>{fastHash.display}</strong>. Do not read the headline as protection
          against every attack model.
        </Callout>
      ) : null}

      <ScoreScale score={result.score} />

      <dl className="metric-grid">
        <div className="metric">
          <dt>Estimated guesses</dt>
          <dd>
            {formatPowerOfTen(result.guessesLog10)}
            <span className="metric__sub">{formatGuesses(result.guessesLog10)}</span>
          </dd>
        </div>
        <div className="metric">
          <dt>Length</dt>
          <dd>
            {result.codePointLength.toLocaleString('en-US')}
            <span className="metric__sub">characters</span>
          </dd>
        </div>
        <div className="metric">
          <dt>Recognized coverage</dt>
          <dd>
            {Math.round(result.patternCoverage * 100)}%
            <span className="metric__sub">of characters</span>
          </dd>
        </div>
        <div className="metric">
          <dt>Model time</dt>
          <dd>
            {result.calcTimeMs.toLocaleString('en-US')} ms
            <span className="metric__sub">local computation</span>
          </dd>
        </div>
      </dl>

      {result.onlyWhitespace ? (
        <Callout tone="warning" icon="alert" title="Whitespace-only input">
          Spaces count as characters, but a value made only of whitespace has almost no uncertainty.
          It is assessed here rather than silently discarded.
        </Callout>
      ) : null}

      {result.hasUnicode ? (
        <Callout tone="neutral" icon="info" title="Unicode is supported">
          The model handles non-ASCII characters, but some services normalize or reject them. Check
          the account provider's rules before relying on this value.
        </Callout>
      ) : null}

      {result.dictionaryAdjusted ? (
        <Callout tone="accent" icon="dictionary" title="Imported dictionary changed the result">
          An organization-specific term was treated as a known input, which lowers the estimate. The
          matched word is not shown or exported.
        </Callout>
      ) : null}
    </section>
  );
}
