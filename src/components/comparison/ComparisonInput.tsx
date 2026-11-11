import { useId, useState } from 'react';
import { Icon } from '../Icon';

interface ComparisonInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
  inputRef: (element: HTMLInputElement | null) => void;
}

export function ComparisonInput({
  label,
  value,
  onChange,
  onRemove,
  canRemove,
  inputRef,
}: ComparisonInputProps) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="comparison-input">
      <div className="comparison-input__head">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {canRemove ? (
          <button
            type="button"
            className="text-button text-button--danger"
            onClick={onRemove}
            aria-label={`Remove ${label}`}
          >
            <Icon name="trash" size={14} />
            Remove
          </button>
        ) : null}
      </div>
      <div className="comparison-input__field">
        <input
          ref={inputRef}
          id={id}
          type={revealed ? 'text' : 'password'}
          className="text-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Type or paste a candidate"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <div className="comparison-input__actions">
          <button
            type="button"
            className="field-icon-button"
            onClick={() => onChange('')}
            disabled={!value}
            aria-label={`Clear ${label}`}
            title={`Clear ${label}`}
          >
            <Icon name="x" size={16} />
          </button>
          <button
            type="button"
            className="field-icon-button"
            onClick={() => setRevealed((current) => !current)}
            aria-pressed={revealed}
            aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
            title={revealed ? `Hide ${label}` : `Show ${label}`}
          >
            <Icon name={revealed ? 'eyeOff' : 'eye'} size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
