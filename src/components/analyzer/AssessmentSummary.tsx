import { hashForRoute } from '../../hooks/useRoute';
import { buildRecommendations } from '../../lib/recommendations';
import { buildVerdict } from '../../lib/verdict';
import type { AnalysisResult, BreachResult } from '../../types';
import { Icon } from '../Icon';
import { Callout } from '../ui/Callout';
import { StrengthMeter } from './StrengthMeter';

interface AssessmentSummaryProps {
  result: AnalysisResult;
  breach: BreachResult | null;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  onJumpToBreach: () => void;
}

export function AssessmentSummary({
  result,
  breach,
  detailsOpen,
  onToggleDetails,
  onJumpToBreach,
}: AssessmentSummaryProps) {
  const verdict = buildVerdict(result);
  const recommendations = buildRecommendations(result);
  const topCandidateAdvice = recommendations.find((item) => item.group === 'candidate');
  const highCustom = result.customMatches.filter((match) => match.severity === 'high');
  const isWeakOrCapped = verdict.tier <= 2 || Boolean(breach?.found);

  return (
    <section
      className={`verdict-card verdict-card--${verdict.tone}`}
      aria-labelledby="assessment-title"
    >
      <div className="verdict-card__header">
        <div className="verdict-card__title-group">
          <div className="verdict-badge-row">
            <span className={`verdict-pill verdict-pill--${verdict.tone}`}>
              <Icon name={verdict.tier >= 3 ? 'check' : 'alert'} size={14} />
              <span>Assessment</span>
            </span>
            {verdict.qualifier ? <span className="qualifier-pill">{verdict.qualifier}</span> : null}
            {breach?.found ? (
              <span className="verdict-pill verdict-pill--danger">
                <Icon name="alert" size={14} />
                <span>Found in breach</span>
              </span>
            ) : null}
          </div>
          <h2 id="assessment-title" className="verdict-heading">
            {verdict.label}
          </h2>
        </div>

        {verdict.fastestAttack ? (
          <div className="verdict-crack-readout">
            <span className="verdict-crack-readout__label">Fastest crack estimate</span>
            <strong className="verdict-crack-readout__value">
              {verdict.fastestAttack.display}
            </strong>
            <span className="verdict-crack-readout__route">{verdict.fastestAttack.label}</span>
          </div>
        ) : null}
      </div>

      <StrengthMeter
        tier={verdict.tier}
        tone={verdict.tone}
        qualifier={verdict.qualifier}
        zxcvbnScore={result.score}
      />

      <p className="verdict-explanation">{verdict.explanation}</p>

      {breach?.found ? (
        <Callout tone="danger" icon="alert" title="Exposed in known data breaches">
          This password appeared{' '}
          <strong>
            {breach.count.toLocaleString('en-US')} {breach.count === 1 ? 'time' : 'times'}
          </strong>{' '}
          in the Pwned Passwords dataset. Do not use it on any account.
        </Callout>
      ) : null}

      {result.onlyWhitespace ? (
        <Callout tone="warning" icon="alert" title="Whitespace-only input">
          Spaces count toward length, but a password made only of whitespace has almost no
          uncertainty. Use words or random characters instead.
        </Callout>
      ) : null}

      {highCustom.length > 0 ? (
        <Callout tone="accent" icon="dictionary" title="Matches an imported dictionary term">
          {highCustom.length === 1
            ? 'One imported dictionary match covers '
            : `${highCustom.length} imported dictionary matches cover `}
          {highCustom.reduce((sum, match) => sum + match.wordLength, 0).toLocaleString('en-US')}{' '}
          characters. Anyone with that word list can guess this much faster.
        </Callout>
      ) : result.dictionaryAdjusted ? (
        <Callout tone="accent" icon="dictionary" title="Imported dictionary adjusted the score">
          An imported term was detected and lowered the estimate. The matched word is never shown or
          exported.
        </Callout>
      ) : null}

      {verdict.fastHashWeakLink ? (
        <Callout tone="warning" icon="alert" title="Vulnerable if a service stores fast hashes">
          While strong against rate-limited logins and slow hashes (like bcrypt or Argon2), a fast
          offline hash database could crack it in{' '}
          <strong>{verdict.fastHashWeakLink.display}</strong>.
        </Callout>
      ) : null}

      {result.hasUnicode ? (
        <Callout tone="neutral" icon="info" title="Non-ASCII characters detected">
          Unicode characters are included in this estimate, though some websites reject or normalize
          them. Check the service's rules before relying on this password.
        </Callout>
      ) : null}

      {topCandidateAdvice ? (
        <div className="top-advice">
          <div className="top-advice__icon" aria-hidden="true">
            <Icon name={isWeakOrCapped ? 'key' : 'shield'} size={17} />
          </div>
          <div className="top-advice__body">
            <p className="top-advice__title">{topCandidateAdvice.title}</p>
            <p className="top-advice__text">{topCandidateAdvice.body}</p>
          </div>
        </div>
      ) : null}

      <div className="verdict-actions">
        {isWeakOrCapped ? (
          <a className="button button--primary" href={hashForRoute('generate')}>
            <Icon name="generate" size={16} />
            Generate a stronger password
          </a>
        ) : (
          <button type="button" className="button button--primary" onClick={onJumpToBreach}>
            <Icon name="offline" size={16} />
            Check known breaches
          </button>
        )}

        <button
          type="button"
          className="button button--secondary"
          aria-expanded={detailsOpen}
          aria-controls="detailed-analysis"
          onClick={onToggleDetails}
        >
          <span>{detailsOpen ? 'Hide detailed analysis' : 'Explore detailed analysis'}</span>
          <Icon
            name="chevronDown"
            size={16}
            className={`chevron-icon${detailsOpen ? ' chevron-icon--open' : ''}`}
          />
        </button>

        {isWeakOrCapped ? (
          <button type="button" className="button button--ghost" onClick={onJumpToBreach}>
            Check known breaches
          </button>
        ) : (
          <a className="button button--ghost" href={hashForRoute('generate')}>
            Open generator
          </a>
        )}
      </div>
    </section>
  );
}
