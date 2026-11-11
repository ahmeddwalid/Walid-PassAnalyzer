import type { ReactNode } from 'react';
import { PageIntro } from '../layout/PageIntro';
import { Icon } from '../Icon';
import { Callout } from '../ui/Callout';

interface SectionProps {
  id: string;
  number: string;
  title: string;
  children: ReactNode;
}

function Section({ id, number, title, children }: SectionProps) {
  return (
    <section id={id} className="learn-section" aria-labelledby={`${id}-title`}>
      <div className="learn-section__heading">
        <span className="section-number">{number}</span>
        <h2 id={`${id}-title`} tabIndex={-1}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

const CONTENTS = [
  { id: 'length', label: 'Length, uniqueness, and composition' },
  { id: 'random', label: 'Random passwords and passphrases' },
  { id: 'reuse', label: 'Reuse and password managers' },
  { id: 'breach', label: 'Breach exposure' },
  { id: 'mfa', label: 'MFA and passkeys' },
  { id: 'meters', label: 'What meters cannot see' },
  { id: 'policy', label: 'Verifier policies and this analyzer' },
];

export default function LearnPage() {
  return (
    <div className="page page--learn">
      <PageIntro
        number="05"
        label="Field guide"
        title={
          <>
            The parts that
            <br />
            <span className="display-title__accent">actually matter.</span>
          </>
        }
        lede="A concise field guide to the decisions around a password: uniqueness, randomness, breach exposure, and the account controls that survive a mistake. Written to match current NIST and OWASP guidance, without pretending the model is an audit."
        meta={
          <>
            <span className="hero-meta-item">NIST SP 800-63B aligned</span>
            <span className="hero-meta-item">OWASP-informed</span>
            <span className="hero-meta-item">no arbitrary rotation advice</span>
          </>
        }
      />

      <div className="learn-layout">
        <nav className="toc" aria-label="Field guide contents">
          <p className="eyebrow">Contents</p>
          <ol>
            {CONTENTS.map((item, index) => (
              <li key={item.id}>
                <a
                  href="#/learn"
                  onClick={(event) => {
                    event.preventDefault();
                    const target = document.getElementById(item.id);
                    target?.scrollIntoView({
                      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                        ? 'auto'
                        : 'smooth',
                      block: 'start',
                    });
                    target?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
                  }}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
          <a className="text-link" href="#/privacy">
            Privacy and data handling <Icon name="arrowRight" size={14} />
          </a>
        </nav>

        <article className="learn-article">
          <Section id="length" number="01" title="Length, uniqueness, and composition">
            <p>
              Length matters because it increases the number of candidates an attacker must
              consider. It matters only when the extra characters are unpredictable. A 20-character
              value built from a name, a year, and an exclamation mark is not twenty characters of
              security; it is a short, recognizable pattern with decoration.
            </p>
            <p>
              Character-class rules are a weak proxy for unpredictability. Requiring an uppercase
              letter, a digit, and a symbol often produces predictable substitutions such as{' '}
              <code>P@ssw0rd2024</code>. Current NIST guidance emphasizes length, blocklists, and
              breached-password screening rather than composition rules. Use a generated password or
              a randomly chosen passphrase when you need a new secret; do not rely on a formula that
              a person invented to satisfy a form.
            </p>
            <Callout tone="neutral" icon="info" title="The practical translation">
              Prefer a long random value or a six-word random passphrase. Use a unique value per
              account. If a service forces composition rules, satisfy them with a generated
              candidate rather than a human pattern.
            </Callout>
            <details className="disclosure">
              <summary>Does length have a hard minimum?</summary>
              <div className="disclosure__body">
                <p>
                  Service policies differ. NIST's current guidance favors longer passwords and a
                  higher minimum when MFA is not used; OWASP recommends at least eight characters
                  and support for at least 64. This analyzer does not reject a candidate for being
                  short. It assesses it and explains why length is only one part of the estimate.
                </p>
              </div>
            </details>
          </Section>

          <Section id="random" number="02" title="Random passwords and passphrases">
            <p>
              A random password is drawn from a character pool. A passphrase is drawn from a word
              list. Both can be strong if the selection is genuinely random and the space is large
              enough. The difference is mostly memory and typing.
            </p>
            <div className="compare-columns">
              <div>
                <p className="eyebrow">Random password</p>
                <p>
                  Compact, easy to paste, and well suited to a password manager. Twenty characters
                  from a 90-character pool is roughly 129 bits of search-space entropy. Most of the
                  benefit disappears if you try to memorize a shorter one and reuse it.
                </p>
              </div>
              <div>
                <p className="eyebrow">Random passphrase</p>
                <p>
                  Six EFF Large words give about 77.5 bits from the words alone. That is easier to
                  remember and type on a device without a manager. Capitalization rules and a
                  two-digit suffix add little compared with another random word.
                </p>
              </div>
            </div>
            <Callout tone="accent" icon="key" title="Entropy is not the whole story">
              Generation entropy describes a uniform draw from a defined space. Human-chosen
              passwords are not uniform; that is why the analyzer uses a pattern-aware model rather
              than a character-class formula. Neither number knows whether a value is reused or
              already breached.
            </Callout>
          </Section>

          <Section id="reuse" number="03" title="Reuse and password managers">
            <p>
              Reuse turns one breach into many. An attacker does not need to guess your password if
              they can take a working pair from one compromised service and try it elsewhere. This
              is why uniqueness matters more than a small difference in an individual password's
              strength score.
            </p>
            <p>
              A password manager resolves the practical tension: it can generate a unique, random
              value per account and recall it without human memory. The manager becomes a high-value
              target, so protect it with a strong master passphrase, MFA where available, and a
              trusted device. A browser's built-in manager is generally better than reuse, though
              threat models differ.
            </p>
            <details className="disclosure">
              <summary>What if I cannot use a manager?</summary>
              <div className="disclosure__body">
                <p>
                  Prioritize the accounts that can cause the most harm: email, banking, identity,
                  and work. Use unique passphrases there and enable MFA. For low-value accounts, a
                  manager is still the better answer, but uniqueness and breach awareness matter
                  more than perfect randomness.
                </p>
              </div>
            </details>
          </Section>

          <Section id="breach" number="04" title="Breach exposure">
            <p>
              A long, random password can still be unsafe if it already appears in a breach corpus.
              Attackers do not start from zero; they try known values first. This is why
              breached-password screening is part of current guidance and why the analyzer offers an
              optional Pwned Passwords check.
            </p>
            <p>
              The check uses k-anonymity: the browser hashes the candidate with SHA-1 and sends only
              the first five hex characters. The service returns a range of suffixes, and the
              comparison happens locally. This reduces disclosure, but the service still sees the
              prefix, your IP address, and request timing. It is not an anonymity guarantee.
            </p>
            <Callout tone="warning" icon="alert" title="Absence is not safety">
              Not finding a value in one corpus does not prove it is safe. Corpora are incomplete,
              and a password can be guessed or reused without appearing in a breach list. Treat the
              check as one more piece of evidence.
            </Callout>
          </Section>

          <Section id="mfa" number="05" title="MFA and passkeys">
            <p>
              Multi-factor authentication changes the consequence of a stolen password. A second
              factor can be a security key, a platform authenticator, a one-time code, or a push
              approval. Not all factors are equal: phishing-resistant authenticators such as
              passkeys and hardware security keys are stronger than SMS or a code that can be
              relayed.
            </p>
            <p>
              Passkeys replace the password with a public-key credential bound to a service. The
              private key stays on the authenticator, so there is no shared secret to guess or
              reuse. Where a service supports passkeys, they are usually the better default. Keep a
              recovery method that you control.
            </p>
            <p>
              MFA is not a reason to choose a weaker password. It is a layer that reduces the damage
              when a password fails. The strongest practical setup combines a unique password or
              passkey with a phishing-resistant second factor where available.
            </p>
          </Section>

          <Section id="meters" number="06" title="What meters cannot see">
            <p>
              A password-strength meter sees one candidate at a time. It cannot see whether you
              reused it, whether it is in a breach corpus, whether the service stores it correctly,
              or whether an attacker already knows it. A high score is not an audit; a low score is
              useful evidence, not a moral judgment.
            </p>
            <p>
              Percentages are especially easy to misread. A meter that maps a 0-4 model score to
              20-100% implies a precision the model does not have. This application shows the score
              band, the estimated orders of magnitude, and the patterns behind the estimate instead.
            </p>
            <details className="disclosure">
              <summary>How zxcvbn builds its estimate</summary>
              <div className="disclosure__body">
                <p>
                  zxcvbn splits a candidate into dictionary matches, keyboard walks, repeats,
                  sequences, dates, and brute-force runs. It assigns each a guess estimate and
                  combines them, with penalties for common substitutions and case variations. It is
                  a mature estimator with known limits, not a formal proof.
                </p>
              </div>
            </details>
          </Section>

          <Section id="policy" number="07" title="Verifier policies and this analyzer">
            <p>
              A verifier is the service accepting your password. It may enforce a minimum length, a
              maximum length, composition rules, Unicode restrictions, or a blocklist. Those
              policies are separate from this analyzer's assessment. This tool does not reject a
              candidate because it is below a particular service's minimum; it explains the
              guessability and lets you decide.
            </p>
            <p>
              Current guidance discourages arbitrary composition rules and periodic expiration.
              Rotation on a schedule tends to produce predictable increments (
              <code>Spring2025</code> to <code>Summer2025</code>). Change a password when there is
              evidence of compromise, when a service requires it, or when you are replacing a weak
              or reused value. Do not wait for a calendar reminder to invent a new pattern.
            </p>
            <Callout tone="neutral" icon="learn" title="A useful division of labor">
              Use the verifier's rules to know what the service will accept. Use a generator plus a
              manager to produce and store something unpredictable. Use breach screening, MFA, and
              passkeys to reduce the chance that a single failure becomes a complete account
              compromise.
            </Callout>
          </Section>

          <section className="references" aria-labelledby="references-title">
            <p className="eyebrow">References</p>
            <h2 id="references-title">Primary sources</h2>
            <ul>
              <li>
                <a
                  href="https://pages.nist.gov/800-63-4/sp800-63b.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  NIST SP 800-63B: Digital Identity Guidelines, Authentication and Lifecycle
                  Management
                </a>
              </li>
              <li>
                <a
                  href="https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  OWASP Authentication Cheat Sheet
                </a>
              </li>
              <li>
                <a
                  href="https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  OWASP Password Storage Cheat Sheet
                </a>
              </li>
              <li>
                <a
                  href="https://haveibeenpwned.com/Passwords"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Have I Been Pwned: Pwned Passwords
                </a>
              </li>
              <li>
                <a href="https://www.eff.org/dice" target="_blank" rel="noopener noreferrer">
                  EFF Dice-Generated Passphrases
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/dropbox/zxcvbn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  zxcvbn password strength estimator
                </a>
              </li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}
