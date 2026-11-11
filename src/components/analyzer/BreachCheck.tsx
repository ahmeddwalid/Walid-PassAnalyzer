import { useEffect, useRef, useState } from 'react';
import { BreachCheckError, checkPwnedPassword } from '../../services/breach';
import type { BreachResult } from '../../types';
import { Icon } from '../Icon';
import { Callout } from '../ui/Callout';

interface BreachCheckProps {
  password: string;
  result: BreachResult | null;
  onResult: (result: BreachResult | null) => void;
}

type CheckStatus = 'idle' | 'loading' | 'done' | 'error';

export function BreachCheck({ password, result, onResult }: BreachCheckProps) {
  const [status, setStatus] = useState<CheckStatus>('idle');
  const [checkedPassword, setCheckedPassword] = useState('');
  const [error, setError] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    requestId.current += 1;
    return () => {
      requestId.current += 1;
    };
  }, [password]);

  const effectiveStatus: CheckStatus =
    checkedPassword === password || (status === 'loading' && checkedPassword === password)
      ? status
      : 'idle';

  const runCheck = async () => {
    requestId.current += 1;
    const currentRequest = requestId.current;
    setCheckedPassword(password);
    setStatus('loading');
    setError('');
    onResult(null);
    try {
      const next = await checkPwnedPassword(password);
      if (requestId.current !== currentRequest) return;
      onResult(next);
      setStatus('done');
    } catch (caught) {
      if (requestId.current !== currentRequest) return;
      setStatus('error');
      setError(
        caught instanceof BreachCheckError
          ? caught.message
          : 'The breach check failed. No password or full hash was sent.',
      );
    }
  };

  return (
    <section
      id="breach-check-section"
      className="panel utility-card"
      aria-labelledby="breach-title"
    >
      <div className="detail-card__head">
        <div>
          <h2 id="breach-title" tabIndex={-1} className="detail-card__title">
            Check known breaches
          </h2>
          <p className="detail-card__subtitle">
            Check if this password appears in public leaks. Only the first 5 characters of a SHA-1
            hash leave your browser.
          </p>
        </div>
        <span className="network-tag">
          <Icon name="external" size={14} />
          Opt-in
        </span>
      </div>

      <div className="breach-actions">
        <button
          type="button"
          className="button button--primary"
          onClick={runCheck}
          disabled={password.length === 0 || effectiveStatus === 'loading'}
          aria-busy={effectiveStatus === 'loading'}
        >
          <Icon name={effectiveStatus === 'loading' ? 'clock' : 'offline'} size={16} />
          {effectiveStatus === 'loading' ? 'Checking prefix...' : 'Check this candidate'}
        </button>
        <span className="mono-meta">No automatic requests</span>
      </div>

      <details className="inline-details">
        <summary>How k-anonymity works &amp; limits</summary>
        <div className="inline-details__body">
          <p>
            The candidate is hashed locally with SHA-1. Only the first five hex characters are
            requested from <code>api.pwnedpasswords.com/range/&lt;prefix&gt;</code> with{' '}
            <code>Add-Padding: true</code>, and matching happens in this tab.
          </p>
          <p>
            Ordinary HTTP metadata (IP address, timing, and the five-character prefix) is visible to
            the remote service. Skip this check if that trade-off is unacceptable; all other
            analysis stays offline.
          </p>
        </div>
      </details>

      <div aria-live="polite">
        {effectiveStatus === 'loading' ? (
          <p className="breach-status">Contacting the range API with a five-character prefix.</p>
        ) : null}

        {effectiveStatus === 'error' ? (
          <Callout tone="danger" icon="alert" title="Check could not complete">
            {error}
          </Callout>
        ) : null}

        {effectiveStatus === 'done' && result ? (
          result.found ? (
            <Callout tone="danger" icon="alert" title="Found in the breach corpus">
              This candidate appears {result.count.toLocaleString('en-US')}{' '}
              {result.count === 1 ? 'time' : 'times'} in the Pwned Passwords dataset. Do not use it.
              Change any account that uses it and enable MFA or a passkey.
            </Callout>
          ) : (
            <Callout tone="positive" icon="check" title="No occurrence found">
              This candidate was not found in the queried Pwned Passwords dataset. That is not proof
              of safety: the corpus is not exhaustive, and a value can be guessed or reused without
              appearing here.
            </Callout>
          )
        ) : null}

        {effectiveStatus === 'done' && !result ? (
          <p className="breach-status">The check completed without a result. Try again.</p>
        ) : null}
      </div>
    </section>
  );
}
