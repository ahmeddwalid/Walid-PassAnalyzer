import { STORAGE_KEYS } from '../constants';
import type { Theme } from '../types';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preferences are optional. A blocked storage API must not break the app.
  }
}

export function readTheme(): Theme {
  const rootTheme = document.documentElement.dataset.theme;
  if (rootTheme === 'dark' || rootTheme === 'light') return rootTheme;
  return read(STORAGE_KEYS.theme) === 'light' ? 'light' : 'dark';
}

export function persistTheme(theme: Theme): void {
  write(STORAGE_KEYS.theme, theme);
}

export function readAutoClear(): boolean {
  return read(STORAGE_KEYS.autoClear) === 'true';
}

export function persistAutoClear(enabled: boolean): void {
  write(STORAGE_KEYS.autoClear, String(enabled));
}
