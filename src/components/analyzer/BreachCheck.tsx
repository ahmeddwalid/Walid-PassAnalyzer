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
  const [error, setError] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    requestId.current += 1;
    return () => {
      requestId.current += 1;
    };
  }, [password]);

  const runCheck = async () => {
    requestId.current += 1;
    const currentRequest = requestId.current;
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
    <section className="panel breach-panel" aria-labelledby="breach-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Optional network check</p>
          <h2 id="breach-title" className="panel-title">
            Pwned Passwords
          </h2>
        </div>
        <span className="network-tag">
          <Icon name="external" size={14} />
          opt-in
        </span>
      </div>

      <p className="breach-intro">
        A strong estimate cannot tell you whether a password has already appeared in a breach. This
        optional check uses the Have I Been Pwned range API and only runs when you press the button.
      </p>

      <div className="breach-disclosure">
        <p>
          <strong>What leaves this browser:</strong> the first five characters of the SHA-1 digest
          (20 bits), plus ordinary request metadata such as your IP address and browser user agent.
          The password and the complete digest stay here.
        </p>
        <details className="inline-details">
          <summary>Read the exact protocol and its limits</summary>
          <div className="inline-details__body">
            <p>
              The candidate is hashed locally with SHA-1. Only the first five hex characters are
              requested from <code>api.pwnedpasswords.com/range/&lt;prefix&gt;</code>. The response
              contains suffixes and occurrence counts; the comparison happens entirely in this tab.
              The request includes <code>Add-Padding: true</code>, which pads responses to reduce a
              narrow prefix's visibility.
            </p>
            <p>
              k-anonymity reduces disclosure but is not zero information. The service can still see
              your IP address, timing, and the prefix. This application does not proxy the request
              or hide that metadata. If that trade-off is unacceptable, do not run the check; local
              analysis continues to work offline.
            </p>
          </div>
        </details>
      </div>

      <div className="breach-actions">
        <button
          type="button"
          className="button button--primary"
          onClick={runCheck}
          disabled={password.length === 0 || status === 'loading'}
          aria-busy={status === 'loading'}
        >
          <Icon name={status === 'loading' ? 'clock' : 'offline'} size={16} />
          {status === 'loading' ? 'Checking prefix...' : 'Check this candidate'}
        </button>
        <span className="mono-meta">no automatic requests</span>
      </div>

      <div aria-live="polite">
        {status === 'loading' ? (
          <p className="breach-status">Contacting the range API with a five-character prefix.</p>
        ) : null}

        {status === 'error' ? (
          <Callout tone="danger" icon="alert" title="Check could not complete">
            {error}
          </Callout>
        ) : null}

        {status === 'done' && result ? (
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

        {status === 'done' && !result ? (
          <p className="breach-status">The check completed without a result. Try again.</p>
        ) : null}
      </div>
    </section>
  );
}
