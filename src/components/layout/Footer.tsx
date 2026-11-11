import { APP_NAME, APP_VERSION, LICENSE_URL, REPOSITORY_URL, ZXCVBN_URL } from '../../constants';
import { hashForRoute } from '../../hooks/useRoute';
import { Icon } from '../Icon';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="footer-brand">
          <p className="footer-brand__name">{APP_NAME}</p>
          <p className="footer-brand__statement">
            Local password strength analysis, random generation, and optional k-anonymous breach
            checks. No accounts, analytics, or password storage.
          </p>
        </div>

        <div className="footer-links">
          <div className="footer-column">
            <p className="footer-heading">Tools</p>
            <a href={hashForRoute('analyze')}>Analyze</a>
            <a href={hashForRoute('generate')}>Generate</a>
            <a href={hashForRoute('compare')}>Compare</a>
            <a href={hashForRoute('dictionaries')}>Dictionaries</a>
          </div>

          <div className="footer-column">
            <p className="footer-heading">Resources</p>
            <a href={hashForRoute('learn')}>Password guide</a>
            <a href={hashForRoute('privacy')}>Privacy &amp; data handling</a>
            <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
              Source code <Icon name="external" size={12} />
            </a>
            <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer">
              Apache-2.0 license <Icon name="external" size={12} />
            </a>
            <a href={ZXCVBN_URL} target="_blank" rel="noopener noreferrer">
              zxcvbn estimator <Icon name="external" size={12} />
            </a>
          </div>
        </div>
      </div>
      <div className="site-footer__base">
        <p>Built by Ahmed Walid · Estimates are model-based, not guarantees.</p>
        <p className="footer-version">v{APP_VERSION} · Open source</p>
      </div>
    </footer>
  );
}
