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
            A local-first password instrument. No accounts, no analytics, no password storage.
          </p>
        </div>

        <div className="footer-column">
          <p className="footer-heading">Navigate</p>
          <a href={hashForRoute('analyze')}>Analyze</a>
          <a href={hashForRoute('generate')}>Generate</a>
          <a href={hashForRoute('privacy')}>Privacy and data handling</a>
          <a href={hashForRoute('learn')}>Field guide</a>
        </div>

        <div className="footer-column">
          <p className="footer-heading">Transparency</p>
          <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
            Source code <Icon name="external" size={13} />
          </a>
          <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer">
            Apache-2.0 license <Icon name="external" size={13} />
          </a>
          <a href={ZXCVBN_URL} target="_blank" rel="noopener noreferrer">
            zxcvbn model <Icon name="external" size={13} />
          </a>
          <a href="https://www.eff.org/dice" target="_blank" rel="noopener noreferrer">
            EFF wordlists <Icon name="external" size={13} />
          </a>
        </div>
      </div>
      <div className="site-footer__base">
        <p>
          Built by Ahmed Walid. Estimates are advisory; this is not a security audit of any account
          or service.
        </p>
        <p className="footer-version">Instrument {APP_VERSION} · open source</p>
      </div>
    </footer>
  );
}
