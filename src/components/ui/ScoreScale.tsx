import type { Score } from '../../types';

interface ScoreScaleProps {
  score: Score;
  compact?: boolean;
}

const LABELS = ['trivial', 'weak', 'fair', 'strong', 'resilient'];

export function ScoreScale({ score, compact = false }: ScoreScaleProps) {
  return (
    <div className={`score-scale${compact ? ' score-scale--compact' : ''}`}>
      <div
        className="score-scale__track"
        role="img"
        aria-label={`zxcvbn model score ${score} of 4, ${LABELS[score]}`}
      >
        {LABELS.map((label, index) => (
          <span
            key={label}
            className="score-scale__cell"
            data-active={index === score ? 'true' : undefined}
            data-passed={index < score ? 'true' : undefined}
            aria-hidden="true"
          />
        ))}
      </div>
      {!compact ? (
        <div className="score-scale__labels" aria-hidden="true">
          {LABELS.map((label, index) => (
            <span key={label} data-active={index === score ? 'true' : undefined}>
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
