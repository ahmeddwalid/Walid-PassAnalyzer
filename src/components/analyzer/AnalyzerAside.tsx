import { hashForRoute } from '../../hooks/useRoute';
import { Icon } from '../Icon';

export function AnalyzerAside() {
  return (
    <aside className="analyzer-aside" aria-label="Method and privacy notes">
      <section className="aside-panel aside-panel--local">
        <p className="eyebrow">Local by construction</p>
        <div className="local-stat">
          <span className="local-stat__value">0</span>
          <span className="local-stat__unit">bytes sent by default</span>
        </div>
        <ul className="aside-list">
          <li>zxcvbn runs in this tab.</li>
          <li>No analytics, accounts, or telemetry.</li>
          <li>Breach checking is explicit and optional.</li>
          <li>
            Nothing is written to local storage except the theme and an auto-clear preference.
          </li>
        </ul>
        <a className="text-link" href={hashForRoute('privacy')}>
          Read the full data-handling note <Icon name="arrowRight" size={14} />
        </a>
      </section>

      <section className="aside-panel">
        <p className="eyebrow">The instrument</p>
        <h2 className="aside-title">A coarse score, with its work shown.</h2>
        <p>
          The 0-4 band comes from zxcvbn's estimated guesses. This interface shows the patterns and
          orders of magnitude behind that band rather than converting it to a misleading percentage.
        </p>
        <details className="inline-details">
          <summary>What the estimate can and cannot tell you</summary>
          <div className="inline-details__body">
            <p>
              It can identify dictionary words, keyboard walks, repeats, sequences, dates, and
              common substitutions. It cannot know whether a password is reused, already in a breach
              corpus, or accepted by a particular service.
            </p>
            <p>
              A high score is not an audit or a guarantee. A low score is useful evidence that the
              candidate is a poor choice.
            </p>
          </div>
        </details>
        <a className="text-link" href={hashForRoute('learn')}>
          Read the field guide <Icon name="arrowRight" size={14} />
        </a>
      </section>

      <section className="aside-panel aside-panel--annotation">
        <p className="eyebrow">Note</p>
        <p className="annotation-text">
          “Strength” is a property of a candidate against a model. Reuse and exposure are properties
          of an account. The second set matters more.
        </p>
        <p className="annotation-signature">Walid PassAnalyzer · local instrument</p>
      </section>
    </aside>
  );
}
