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
    <section className="password-card" aria-label="Password analysis input">
      <div className="password-card__top">
        <label htmlFor={inputId} className="password-card__label">
          Password to analyze
        </label>
        <span id={countId} className="password-card__count">
          {count.toLocaleString('en-US')} {count === 1 ? 'character' : 'characters'}
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
          placeholder="Type or paste a test password"
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

      <div className="password-card__footer">
        <p
          id={statusId}
          className={`analysis-status analysis-status--${statusTone}`}
          role="status"
          aria-live="polite"
        >
          <span className="analysis-status__mark" aria-hidden="true" />
          <span>{status}</span>
        </p>

        <span id={helpId} className="visually-hidden">
          Spaces and Unicode characters are preserved exactly as typed.
        </span>

        <label
          className="auto-clear-toggle"
          title="Clears the input automatically after 5 minutes of inactivity. Only this toggle setting is saved locally."
        >
          <input
            type="checkbox"
            checked={autoClear}
            onChange={(event) => onAutoClearChange(event.target.checked)}
          />
          <span>Auto-clear in 5 min</span>
        </label>
      </div>

      {autoClearMessage ? (
        <p className="auto-clear-note" role="status">
          {autoClearMessage}
        </p>
      ) : null}

      {error ? (
        <Callout
          tone="danger"
          icon="alert"
          title="Unable to analyze"
          className="password-card__error"
        >
          {error}
        </Callout>
      ) : null}
    </section>
  );
}
