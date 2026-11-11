import { PageIntro } from '../layout/PageIntro';
import { Icon } from '../Icon';
import { Callout } from '../ui/Callout';
import { hashForRoute } from '../../hooks/useRoute';

const STATUS_ITEMS = [
  { value: '0', label: 'bytes sent by default analysis' },
  { value: '5', label: 'SHA-1 hex characters in an optional breach check' },
  { value: '2', label: 'local preferences: theme and auto-clear' },
  { value: 'none', label: 'accounts, analytics, telemetry, or password storage' },
];

export default function PrivacyPage() {
  return (
    <div className="page page--privacy">
      <PageIntro
        number="06"
        label="Privacy"
        title={
          <>
            What leaves
            <br />
            <span className="display-title__accent">this page.</span>
          </>
        }
        lede="A precise account of what runs locally, what can leave the browser, and what the browser cannot promise. These statements describe the implementation, not a marketing policy."
        meta={
          <>
            <span className="hero-meta-item">
              <span className="status-dot" aria-hidden="true" /> no analytics
            </span>
            <span className="hero-meta-item">self-hosted assets</span>
            <span className="hero-meta-item">source available</span>
          </>
        }
      />

      <div className="privacy-status-grid" aria-label="Privacy summary">
        {STATUS_ITEMS.map((item) => (
          <div key={item.label} className="privacy-stat">
            <span className="privacy-stat__value">{item.value}</span>
            <span className="privacy-stat__label">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="privacy-layout">
        <article className="privacy-article">
          <section className="learn-section">
            <div className="learn-section__heading">
              <span className="section-number">01</span>
              <h2>Default analysis is local</h2>
            </div>
            <p>
              The candidate you enter is processed by JavaScript running in this tab. The strength
              model, pattern matching, entropy calculation, comparison logic, dictionary matching,
              and report generation all execute on your device. The default analyzer does not make a
              network request.
            </p>
            <p>
              The page does not include third-party scripts, analytics, tracking pixels, remote
              fonts, or a CDN at runtime. React, zxcvbn, jsPDF, the fonts, and the wordlists are
              served from the same GitHub Pages origin as the application.
            </p>
            <div className="privacy-columns">
              <div>
                <p className="eyebrow">Not collected</p>
                <ul className="privacy-list">
                  <li>Passwords or password fragments</li>
                  <li>Analysis results or scores</li>
                  <li>Account identifiers or email addresses</li>
                  <li>Usage events, page views, or session recordings</li>
                  <li>Device fingerprints</li>
                </ul>
              </div>
              <div>
                <p className="eyebrow">Generated locally</p>
                <ul className="privacy-list">
                  <li>Strength assessments and pattern maps</li>
                  <li>Comparison rankings</li>
                  <li>Password and passphrase candidates</li>
                  <li>PDF and text reports</li>
                  <li>Custom dictionary matches</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="learn-section">
            <div className="learn-section__heading">
              <span className="section-number">02</span>
              <h2>When a request can leave the browser</h2>
            </div>
            <p>
              There are two categories: an explicit action inside the app, and ordinary hosting
              metadata.
            </p>
            <div
              className="table-wrap"
              role="region"
              aria-label="Network request comparison"
              tabIndex={0}
            >
              <table className="data-table">
                <caption className="visually-hidden">
                  Network requests made by the application
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Action</th>
                    <th scope="col">Destination</th>
                    <th scope="col">Data</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Default analysis</th>
                    <td>None</td>
                    <td>Nothing leaves the tab.</td>
                  </tr>
                  <tr>
                    <th scope="row">“Check this candidate”</th>
                    <td>
                      <code>api.pwnedpasswords.com</code>
                    </td>
                    <td>
                      First five SHA-1 hex characters, <code>Add-Padding: true</code>, plus ordinary
                      HTTP metadata such as IP address and user agent.
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Clicking a reference or GitHub link</th>
                    <td>The linked site</td>
                    <td>
                      The destination receives a normal request when you choose to follow the link.
                      The app does not preconnect or prefetch it.
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Loading the static app</th>
                    <td>GitHub Pages</td>
                    <td>
                      GitHub receives the request metadata inherent in serving any static site. This
                      is hosting infrastructure, not application telemetry.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <Callout tone="warning" icon="alert" title="k-anonymity is not invisibility">
              The Pwned Passwords range protocol reduces disclosure: the complete hash and plaintext
              never leave the browser. It does not hide the five-character prefix, your IP address,
              or request timing from the service or your network. If that trade-off is unacceptable,
              keep the check off; local analysis continues to work.
            </Callout>
          </section>

          <section className="learn-section">
            <div className="learn-section__heading">
              <span className="section-number">03</span>
              <h2>Clipboard behavior</h2>
            </div>
            <p>
              Clipboard writes occur only when you press a copy control. The browser's Clipboard
              API, or a temporary textarea fallback, receives the value. This application does not
              write an empty value afterward and does not claim to erase your clipboard.
            </p>
            <p>
              Clipboard history, synchronization, and retention are controlled by the browser and
              operating system. A copied password may remain in a clipboard manager, a remote
              session, or another application. Clear it yourself if that matters to you.
            </p>
          </section>

          <section className="learn-section">
            <div className="learn-section__heading">
              <span className="section-number">04</span>
              <h2>Imported dictionaries</h2>
            </div>
            <p>
              Dictionary files are read with the browser's File API and parsed in this tab. The
              contents are not uploaded. Imported dictionaries are held in memory for the current
              tab and are deliberately not written to local storage, sessionStorage, IndexedDB, or a
              service worker cache. Reloading the page clears them.
            </p>
            <p>
              Organization-specific terms can be sensitive. The trade-off is explicit: session-only
              storage avoids persistent copies but requires re-importing after a refresh. Matching
              caches are also in memory and disappear with the tab.
            </p>
          </section>

          <section className="learn-section">
            <div className="learn-section__heading">
              <span className="section-number">05</span>
              <h2>Reports and filenames</h2>
            </div>
            <p>
              The PDF and text report builders do not accept the candidate as an argument. They
              receive only the sanitized assessment, attack estimates, pattern descriptions,
              recommendations, and breach status. The report body and metadata contain no password,
              no candidate fragment, and no imported dictionary word. Filenames are generic and
              date-based.
            </p>
            <p>
              A downloaded report is a local file after creation. Anyone with access to your
              downloads folder can read its assessment details, even though the password is absent.
            </p>
          </section>

          <section className="learn-section">
            <div className="learn-section__heading">
              <span className="section-number">06</span>
              <h2>What the browser cannot guarantee</h2>
            </div>
            <p>
              JavaScript cannot reliably erase every copy of a secret from memory. React state,
              browser internals, form history, extensions, operating-system input methods, and crash
              dumps are outside this application's control. Clearing a field removes the value from
              this component's state, but it is not a cryptographic memory wipe.
            </p>
            <p>
              A browser extension or another process with page access can observe input. A
              compromised device can observe it before JavaScript receives it. Use a trusted device
              and a browser profile you control. For a high-value account, test an invented
              candidate before using it, or use a password manager on the account itself.
            </p>
            <Callout tone="neutral" icon="offline" title="What “local” means here">
              The application does not transmit the candidate. It does not follow that the candidate
              is confined to the tab in a way the browser can prove. The honest boundary is the
              implementation plus the trustworthiness of your device.
            </Callout>
          </section>

          <section className="learn-section">
            <div className="learn-section__heading">
              <span className="section-number">07</span>
              <h2>Preferences and hosting</h2>
            </div>
            <p>
              Two benign preferences may be stored in <code>localStorage</code>:{' '}
              <code>pa.theme</code> (light or dark) and <code>pa.autoClear</code> (whether the
              five-minute inactivity clear is enabled). No candidate, score, dictionary, or report
              data is stored there. If storage is blocked, the app continues to work with defaults.
            </p>
            <p>
              The production build is a static site served by GitHub Pages. A
              Content-Security-Policy meta tag restricts scripts and styles to the site's own origin
              and restricts network connections to the optional Pwned Passwords endpoint. GitHub
              Pages cannot set arbitrary HTTP response headers, so protections that require headers,
              such as <code>frame-ancestors</code> or a strict transport policy controlled by the
              application, are not available. The source repository and build workflow are public
              for inspection.
            </p>
            <p>
              No security certification or external audit is claimed. The implementation is open
              source under Apache-2.0; review it, run it locally, or report a problem through the
              repository.
            </p>
            <div className="privacy-links">
              <a className="text-link" href={hashForRoute('analyze')}>
                Back to the analyzer <Icon name="arrowRight" size={14} />
              </a>
              <a
                className="text-link"
                href="https://github.com/ahmeddwalid/Walid-PassAnalyzer"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read the source <Icon name="external" size={14} />
              </a>
            </div>
          </section>
        </article>

        <aside className="privacy-aside">
          <section className="aside-panel">
            <p className="eyebrow">Short version</p>
            <ul className="aside-list">
              <li>Analysis is local and does not make a request.</li>
              <li>Breach checking is opt-in and sends a prefix only.</li>
              <li>Dictionaries are session-only and never uploaded.</li>
              <li>Exports contain assessment data, never the password.</li>
              <li>No claim is made that memory is perfectly erased.</li>
            </ul>
          </section>
          <section className="aside-panel aside-panel--annotation">
            <p className="eyebrow">Design principle</p>
            <p className="annotation-text">
              Privacy claims should be specific enough to verify and modest enough to remain true
              when the browser behaves badly.
            </p>
            <p className="annotation-signature">Walid PassAnalyzer · privacy note</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
