import { useState, type ReactNode } from 'react';
import { Icon } from '../Icon';
import { CopyButton } from '../ui/CopyButton';
import { Callout } from '../ui/Callout';

interface GeneratorOutputProps {
  value: string;
  label: string;
  meta: ReactNode;
  onRegenerate: () => void;
  dirty?: boolean;
  error?: string | null;
  loading?: boolean;
  footnote?: ReactNode;
}

export function GeneratorOutput({
  value,
  label,
  meta,
  onRegenerate,
  dirty = false,
  error = null,
  loading = false,
  footnote,
}: GeneratorOutputProps) {
  const [revealed, setRevealed] = useState(true);
  const hiddenValue = '•'.repeat(Math.min(Array.from(value).length, 42));

  return (
    <section className="panel generator-output" aria-labelledby="generator-output-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Output</p>
          <h2 id="generator-output-title" className="panel-title">
            {label}
          </h2>
        </div>
        <span className="local-tag">
          <span className="status-dot" aria-hidden="true" />
          generated locally
        </span>
      </div>

      <div className="secret-value" data-hidden={!revealed ? 'true' : undefined}>
        <code aria-hidden={!revealed}>{revealed ? value : hiddenValue}</code>
        {!revealed ? (
          <span className="visually-hidden">
            Generated value is hidden. Use the reveal control to read it.
          </span>
        ) : null}
      </div>

      <div className="secret-actions">
        <button
          type="button"
          className="button button--secondary button--compact"
          onClick={() => setRevealed((current) => !current)}
          aria-pressed={!revealed}
          disabled={!value}
        >
          <Icon name={revealed ? 'eyeOff' : 'eye'} size={15} />
          {revealed ? 'Hide' : 'Reveal'}
        </button>
        <CopyButton value={value} label="Copy" disabled={!value || loading} />
        <button
          type="button"
          className="button button--primary button--compact"
          onClick={onRegenerate}
          disabled={loading}
        >
          <Icon name="refresh" size={15} />
          Regenerate
        </button>
      </div>

      <div className="secret-meta">{meta}</div>

      {dirty ? (
        <p className="generator-dirty">
          <Icon name="info" size={15} />
          Settings changed. Regenerate to apply them.
        </p>
      ) : null}

      {loading ? (
        <p className="generator-dirty" role="status">
          <Icon name="clock" size={15} />
          Loading the selected word list...
        </p>
      ) : null}

      {error ? (
        <Callout tone="danger" icon="alert" title="Generation failed">
          {error}
        </Callout>
      ) : null}

      {footnote ? <div className="generator-output__footnote">{footnote}</div> : null}
    </section>
  );
}
