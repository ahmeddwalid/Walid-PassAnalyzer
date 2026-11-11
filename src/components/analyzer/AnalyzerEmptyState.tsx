import { ANALYZER_EXAMPLES } from '../../constants';
import { hashForRoute } from '../../hooks/useRoute';
import { Icon } from '../Icon';

interface AnalyzerEmptyStateProps {
  onLoadExample: (value: string) => void;
}

export function AnalyzerEmptyState({ onLoadExample }: AnalyzerEmptyStateProps) {
  return (
    <section className="examples-strip" aria-labelledby="examples-title">
      <div className="examples-strip__head">
        <h2 id="examples-title" className="examples-strip__title">
          Try a sample password
        </h2>
        <p className="examples-strip__note">
          Test an invented value rather than a real account password.
        </p>
      </div>

      <div className="example-buttons">
        {ANALYZER_EXAMPLES.map((example) => (
          <button
            key={example.id}
            type="button"
            className="example-button"
            onClick={() => onLoadExample(example.value)}
          >
            <span className="example-button__label">{example.label}</span>
            <span className="example-button__value" aria-hidden="true">
              {example.value}
            </span>
          </button>
        ))}
      </div>

      <div className="examples-strip__footer">
        <a className="examples-strip__link" href={hashForRoute('generate')}>
          <span>Need a strong password? Open the generator</span>
          <Icon name="arrowRight" size={14} />
        </a>
      </div>
    </section>
  );
}
