import { useEffect, useRef, useState } from 'react';
import { NAV_ITEMS, REPOSITORY_URL } from '../../constants';
import { hashForRoute } from '../../hooks/useRoute';
import type { Route, Theme } from '../../types';
import { Icon } from '../Icon';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  route: Route;
  theme: Theme;
  onToggleTheme: () => void;
}

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
          <BrandMark />
          <span className="brand__text">
            <span className="brand__name">Walid&nbsp;</span>
            <span className="brand__product">PassAnalyzer</span>
          </span>
        </a>

        <nav className="desktop-nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.route}
              href={hashForRoute(item.route)}
              className="desktop-nav__link"
              aria-current={route === item.route ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <a
            className="header-privacy-link"
            href={hashForRoute('privacy')}
            aria-current={route === 'privacy' ? 'page' : undefined}
          >
            Privacy
          </a>
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
          {NAV_ITEMS.map((item) => (
            <a
              key={item.route}
              href={hashForRoute(item.route)}
              className="mobile-nav__link"
              aria-current={route === item.route ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              <span className="mobile-nav__number">{item.number}</span>
              <span>{item.label}</span>
              <Icon name="arrowRight" size={16} />
            </a>
          ))}
          <a
            href={hashForRoute('privacy')}
            className="mobile-nav__link"
            aria-current={route === 'privacy' ? 'page' : undefined}
            onClick={() => setMenuOpen(false)}
          >
            <span className="mobile-nav__number">06</span>
            <span>Privacy</span>
            <Icon name="arrowRight" size={16} />
          </a>
        </nav>
        <div className="mobile-nav__footer">
          <p>Local-first. No accounts, analytics, or password storage.</p>
          <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
            Source on GitHub <Icon name="external" size={14} />
          </a>
        </div>
      </div>
    </header>
  );
}
