import { useRef, useState } from 'react';
import { PageIntro } from '../layout/PageIntro';
import { Icon } from '../Icon';
import { PasswordGenerator } from './PasswordGenerator';
import { PassphraseGenerator } from './PassphraseGenerator';

type Mode = 'password' | 'passphrase';

export default function GeneratorPage() {
  const [mode, setMode] = useState<Mode>('password');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const modes: Mode[] = ['password', 'passphrase'];
    const index = modes.indexOf(mode);
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (index + direction + modes.length) % modes.length;
      const next = modes[nextIndex];
      if (next) {
        setMode(next);
        tabRefs.current[nextIndex]?.focus();
      }
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setMode('password');
      tabRefs.current[0]?.focus();
    }
    if (event.key === 'End') {
      event.preventDefault();
      setMode('passphrase');
      tabRefs.current[1]?.focus();
    }
  };

  return (
    <div className="page page--generator">
      <PageIntro
        number="02"
        label="Generation"
        title={
          <>
            Randomness
            <br />
            <span className="display-title__accent">you can audit.</span>
          </>
        }
        lede="Generate passwords and passphrases from a precisely defined space. Every selection uses the browser's cryptographic random source. There is no weak fallback, no hidden retry loop, and no decorative delay."
        meta={
          <>
            <span className="hero-meta-item">
              <span className="status-dot" aria-hidden="true" /> crypto.getRandomValues
            </span>
            <span className="hero-meta-item">unbiased selection</span>
            <span className="hero-meta-item">fails closed</span>
            <span className="hero-meta-item">generation entropy ≠ human guessability</span>
          </>
        }
      />

      <div className="mode-tabs" role="tablist" aria-label="Generator type">
        <button
          ref={(element) => {
            tabRefs.current[0] = element;
          }}
          type="button"
          role="tab"
          id="tab-password"
          aria-selected={mode === 'password'}
          aria-controls="panel-password"
          tabIndex={mode === 'password' ? 0 : -1}
          onClick={() => setMode('password')}
          onKeyDown={onKeyDown}
          className="mode-tab"
        >
          <Icon name="key" size={17} />
          Random password
        </button>
        <button
          ref={(element) => {
            tabRefs.current[1] = element;
          }}
          type="button"
          role="tab"
          id="tab-passphrase"
          aria-selected={mode === 'passphrase'}
          aria-controls="panel-passphrase"
          tabIndex={mode === 'passphrase' ? 0 : -1}
          onClick={() => setMode('passphrase')}
          onKeyDown={onKeyDown}
          className="mode-tab"
        >
          <Icon name="dictionary" size={17} />
          Passphrase
        </button>
      </div>

      <div
        role="tabpanel"
        id="panel-password"
        aria-labelledby="tab-password"
        hidden={mode !== 'password'}
      >
        {mode === 'password' ? <PasswordGenerator /> : null}
      </div>
      <div
        role="tabpanel"
        id="panel-passphrase"
        aria-labelledby="tab-passphrase"
        hidden={mode !== 'passphrase'}
      >
        {mode === 'passphrase' ? <PassphraseGenerator /> : null}
      </div>
    </div>
  );
}
