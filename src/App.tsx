import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { APP_NAME, ROUTE_TITLES } from './constants';
import { DictionaryProvider } from './contexts/DictionaryContext';
import { useRoute } from './hooks/useRoute';
import { persistTheme, readTheme } from './lib/preferences';
import type { Theme } from './types';
import AnalyzerPage from './components/analyzer/AnalyzerPage';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';

const GeneratorPage = lazy(() => import('./components/generator/GeneratorPage'));
const ComparisonPage = lazy(() => import('./components/comparison/ComparisonPage'));
const DictionaryPage = lazy(() => import('./components/dictionaries/DictionaryPage'));
const LearnPage = lazy(() => import('./components/learn/LearnPage'));
const PrivacyPage = lazy(() => import('./components/privacy/PrivacyPage'));

function RouteFallback() {
  return (
    <div className="page route-fallback" role="status">
      <p className="eyebrow">Local instrument</p>
      <p className="route-fallback__title">Preparing this section...</p>
      <p>Only the code for this route is being loaded.</p>
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const [theme, setTheme] = useState<Theme>(readTheme);
  const previousRoute = useRef(route);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    persistTheme(theme);
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#0B111A' : '#F4F6FA';
  }, [theme]);

  useEffect(() => {
    document.title = `${ROUTE_TITLES[route]} · ${APP_NAME}`;
  }, [route]);

  useEffect(() => {
    if (previousRoute.current === route) return;
    previousRoute.current = route;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    window.requestAnimationFrame(() => {
      document.getElementById('main-content')?.focus({ preventScroll: true });
    });
  }, [route]);

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  };

  return (
    <DictionaryProvider>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Header route={route} theme={theme} onToggleTheme={toggleTheme} />
      <main id="main-content" className="main-content" tabIndex={-1}>
        <span className="visually-hidden" role="status" aria-live="polite">
          {ROUTE_TITLES[route]}
        </span>
        <Suspense fallback={<RouteFallback />}>
          {route === 'analyze' ? <AnalyzerPage /> : null}
          {route === 'generate' ? <GeneratorPage /> : null}
          {route === 'compare' ? <ComparisonPage /> : null}
          {route === 'dictionaries' ? <DictionaryPage /> : null}
          {route === 'learn' ? <LearnPage /> : null}
          {route === 'privacy' ? <PrivacyPage /> : null}
        </Suspense>
      </main>
      <Footer />
    </DictionaryProvider>
  );
}
