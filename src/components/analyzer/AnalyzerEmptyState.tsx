import { ANALYZER_EXAMPLES } from '../../constants';
import { Icon } from '../Icon';

interface AnalyzerEmptyStateProps {
  onLoadExample: (value: string) => void;
}

export function AnalyzerEmptyState({ onLoadExample }: AnalyzerEmptyStateProps) {
  return (
    <section className="empty-state" aria-labelledby="empty-state-title">
      <div className="empty-state__graphic" aria-hidden="true">
        <svg viewBox="0 0 220 88" role="presentation">
          <path d="M0 44h34M186 44h34" className="empty-rule" />
          <path
            d="M54 70V18M74 70V36M94 70V28M114 70V48M134 70V22M154 70V40"
            className="empty-bars"
          />
          <circle cx="134" cy="14" r="3" className="empty-dot" />
          <path d="M42 78h136" className="empty-rule" />
        </svg>
      </div>
      <div className="empty-state__copy">
        <p className="eyebrow">No candidate yet</p>
        <h2 id="empty-state-title">Start with an invented value.</h2>
        <p>
          The analyzer reads patterns as well as character classes. Use a test value rather than a
          password attached to a live account.
        </p>
      </div>
      <div className="example-group">
        <p className="example-group__label">
          <Icon name="arrowRight" size={14} />
          Try a documented example
        </p>
        <div className="example-buttons">
          {ANALYZER_EXAMPLES.map((example) => (
            <button
              key={example.id}
              type="button"
              className="example-button"
              onClick={() => onLoadExample(example.value)}
            >
              <span>{example.label}</span>
              <span className="example-button__value" aria-hidden="true">
                {example.value}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
