import { useId, useState, type RefObject } from 'react';
import { codePointLength } from '../../lib/format';
import { Icon } from '../Icon';
import { Callout } from '../ui/Callout';

interface PasswordFieldProps {
  password: string;
  onPasswordChange: (value: string) => void;
  onClear: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  autoClear: boolean;
  onAutoClearChange: (value: boolean) => void;
  autoClearMessage: string;
  status: string;
  statusTone: 'idle' | 'working' | 'ready' | 'error';
  error: string | null;
}

export function PasswordField({
  password,
  onPasswordChange,
  onClear,
  inputRef,
  autoClear,
  onAutoClearChange,
  autoClearMessage,
  status,
  statusTone,
  error,
}: PasswordFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const inputId = useId();
  const helpId = useId();
  const statusId = useId();
  const countId = useId();
  const count = codePointLength(password);

  return (
    <section className="panel password-panel" aria-label="Password analysis input">
      <div className="panel-heading">
        <label id={`${inputId}-label`} htmlFor={inputId} className="field-label">
          Password to analyze
        </label>
        <span className="local-tag">
          <span className="status-dot" aria-hidden="true" />
          Stays in this tab
        </span>
      </div>

      <div className="password-control" data-revealed={revealed ? 'true' : undefined}>
        <input
          ref={inputRef}
          id={inputId}
          className="password-input"
          type={revealed ? 'text' : 'password'}
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          aria-describedby={`${helpId} ${countId} ${statusId}`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="text"
          placeholder="Enter a candidate"
        />
        <div className="password-control__actions">
          <button
            type="button"
            className="field-icon-button"
            onClick={() => {
              onClear();
              inputRef.current?.focus();
            }}
            disabled={password.length === 0}
            aria-label="Clear password field"
            title="Clear password field"
          >
            <Icon name="x" size={18} />
          </button>
          <button
            type="button"
            className="field-icon-button"
            onClick={() => setRevealed((value) => !value)}
            aria-pressed={revealed}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            title={revealed ? 'Hide password' : 'Show password'}
          >
            <Icon name={revealed ? 'eyeOff' : 'eye'} size={19} />
          </button>
        </div>
      </div>

      <div className="field-meta">
        <span id={countId} className="mono-meta">
          {count.toLocaleString('en-US')} {count === 1 ? 'character' : 'characters'}
        </span>
        <span id={helpId} className="field-help">
          Spaces and Unicode are preserved. Nothing is trimmed or modified.
        </span>
      </div>

      <div className="password-panel__footer">
        <p
          id={statusId}
          className={`analysis-status analysis-status--${statusTone}`}
          role="status"
          aria-live="polite"
        >
          <span className="analysis-status__mark" aria-hidden="true" />
          {status}
        </p>
        <details className="inline-details">
          <summary>Privacy controls</summary>
          <div className="inline-details__body">
            <label className="check-row">
              <input
                type="checkbox"
                checked={autoClear}
                onChange={(event) => onAutoClearChange(event.target.checked)}
              />
              <span>Clear the field after five minutes of inactivity</span>
            </label>
            <p>
              The timer resets whenever you type. Only this preference is stored locally; the
              candidate is never written to storage. Automatic clearing removes the value from this
              component, but browsers cannot guarantee that every copy in memory is erased.
            </p>
          </div>
        </details>
        {autoClearMessage ? (
          <p className="auto-clear-note" role="status">
            {autoClearMessage}
          </p>
        ) : null}
      </div>

      {error ? (
        <Callout tone="danger" icon="alert" title="Assessment unavailable">
          {error}
        </Callout>
      ) : null}
    </section>
  );
}
