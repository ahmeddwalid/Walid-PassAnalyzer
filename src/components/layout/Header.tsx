import { useEffect, useRef, useState } from 'react';
import { REPOSITORY_URL } from '../../constants';
import { hashForRoute } from '../../hooks/useRoute';
import type { Route, Theme } from '../../types';
import { Icon, type IconName } from '../Icon';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  route: Route;
  theme: Theme;
  onToggleTheme: () => void;
}

interface NavEntry {
  route: Route;
  label: string;
  hint: string;
  icon: IconName;
}

const TOOL_LINKS: NavEntry[] = [
  { route: 'analyze', label: 'Analyze', hint: 'Check password strength', icon: 'analyze' },
  { route: 'generate', label: 'Generate', hint: 'Create random passwords', icon: 'generate' },
  { route: 'compare', label: 'Compare', hint: 'Rank candidates side by side', icon: 'compare' },
  {
    route: 'dictionaries',
    label: 'Dictionaries',
    hint: 'Add custom word lists',
    icon: 'dictionary',
  },
];

const INFO_LINKS: NavEntry[] = [
  { route: 'learn', label: 'Learn', hint: 'Password guidance', icon: 'learn' },
  { route: 'privacy', label: 'Privacy', hint: 'How data is handled', icon: 'shield' },
];

export function Header({ route, theme, onToggleTheme }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    const firstLink = menuRef.current?.querySelector<HTMLAnchorElement>('a');
    firstLink?.focus();

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a className="brand" href={hashForRoute('analyze')} onClick={() => setMenuOpen(false)}>
          <BrandMark size={28} />
          <span className="brand__name">
            Walid <span className="brand__product">PassAnalyzer</span>
          </span>
        </a>

        <nav className="desktop-nav" aria-label="Primary">
          <div className="desktop-nav__tools">
            {TOOL_LINKS.map((item) => (
              <a
                key={item.route}
                href={hashForRoute(item.route)}
                className="desktop-nav__link"
                aria-current={route === item.route ? 'page' : undefined}
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="desktop-nav__info">
            {INFO_LINKS.map((item) => (
              <a
                key={item.route}
                href={hashForRoute(item.route)}
                className="desktop-nav__secondary"
                aria-current={route === item.route ? 'page' : undefined}
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="header-actions">
          <a
            className="icon-button"
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Source code on GitHub"
            title="Source code on GitHub"
          >
            <Icon name="github" size={18} />
          </a>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button
            ref={buttonRef}
            type="button"
            className="icon-button menu-button"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
          </button>
        </div>
      </div>

      <div id="mobile-navigation" ref={menuRef} className="mobile-nav" hidden={!menuOpen}>
        <nav aria-label="Mobile primary">
          <p className="mobile-nav__group-label">Tools</p>
          <div className="mobile-nav__list">
            {TOOL_LINKS.map((item) => (
              <a
                key={item.route}
                href={hashForRoute(item.route)}
                className="mobile-nav__link"
                aria-current={route === item.route ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                <span className="mobile-nav__icon" aria-hidden="true">
                  <Icon name={item.icon} size={17} />
                </span>
                <span className="mobile-nav__copy">
                  <span className="mobile-nav__title">{item.label}</span>
                  <span className="mobile-nav__hint">{item.hint}</span>
                </span>
                <Icon name="arrowRight" size={15} className="mobile-nav__arrow" />
              </a>
            ))}
          </div>

          <p className="mobile-nav__group-label">Reference</p>
          <div className="mobile-nav__secondary-row">
            {INFO_LINKS.map((item) => (
              <a
                key={item.route}
                href={hashForRoute(item.route)}
                className="mobile-nav__pill"
                aria-current={route === item.route ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                <Icon name={item.icon} size={15} />
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </nav>

        <div className="mobile-nav__footer">
          <span>Runs locally in your browser</span>
          <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
            GitHub <Icon name="external" size={13} />
          </a>
        </div>
      </div>
    </header>
  );
}
