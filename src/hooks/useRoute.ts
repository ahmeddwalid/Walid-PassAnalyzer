import { useEffect, useState } from 'react';
import type { Route } from '../types';

const ROUTES: Route[] = ['analyze', 'generate', 'compare', 'dictionaries', 'learn', 'privacy'];

export const DEFAULT_ROUTE: Route = 'analyze';

export function routeFromHash(hash: string): Route | null {
  if (!hash.startsWith('#/')) return null;
  const candidate = hash.slice(2).split(/[/?]/)[0] as Route | undefined;
  return candidate && ROUTES.includes(candidate) ? candidate : DEFAULT_ROUTE;
}

export function hashForRoute(route: Route): string {
  return `#/${route}`;
}

export function navigateTo(route: Route): void {
  const next = hashForRoute(route);
  if (window.location.hash !== next) {
    window.location.hash = next;
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(
    () => routeFromHash(window.location.hash) ?? DEFAULT_ROUTE,
  );

  useEffect(() => {
    const onHashChange = () => {
      const next = routeFromHash(window.location.hash);
      if (next) setRoute(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route;
}
