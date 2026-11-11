/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  assertDictionaryCapacity,
  importDictionaryFile,
  importDictionaryText,
  prewarmDictionary,
} from '../services/dictionaries';
import type { Dictionary, DictionaryImport } from '../types';

interface DictionaryContextValue {
  dictionaries: Dictionary[];
  addFromFile: (file: File) => Promise<DictionaryImport>;
  addFromText: (text: string, name: string) => DictionaryImport;
  remove: (id: string) => void;
  toggle: (id: string, enabled: boolean) => void;
  clearAll: () => void;
}

const DictionaryContext = createContext<DictionaryContextValue | null>(null);

function schedulePrewarm(dictionary: Dictionary): void {
  const run = () => prewarmDictionary(dictionary);
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  };
  if (typeof idleWindow.requestIdleCallback === 'function') {
    idleWindow.requestIdleCallback(run, { timeout: 1500 });
  } else {
    window.setTimeout(run, 0);
  }
}

export function DictionaryProvider({ children }: { children: ReactNode }) {
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([]);

  const addFromFile = useCallback(
    async (file: File) => {
      assertDictionaryCapacity(dictionaries.length);
      const imported = await importDictionaryFile(file);
      setDictionaries((current) => [...current, imported.dictionary]);
      schedulePrewarm(imported.dictionary);
      return imported;
    },
    [dictionaries.length],
  );

  const addFromText = useCallback(
    (text: string, name: string) => {
      assertDictionaryCapacity(dictionaries.length);
      const imported = importDictionaryText(text, name);
      setDictionaries((current) => [...current, imported.dictionary]);
      schedulePrewarm(imported.dictionary);
      return imported;
    },
    [dictionaries.length],
  );

  const remove = useCallback((id: string) => {
    setDictionaries((current) => current.filter((dictionary) => dictionary.id !== id));
  }, []);

  const toggle = useCallback((id: string, enabled: boolean) => {
    setDictionaries((current) =>
      current.map((dictionary) => (dictionary.id === id ? { ...dictionary, enabled } : dictionary)),
    );
  }, []);

  const clearAll = useCallback(() => setDictionaries([]), []);

  const value = useMemo<DictionaryContextValue>(
    () => ({ dictionaries, addFromFile, addFromText, remove, toggle, clearAll }),
    [dictionaries, addFromFile, addFromText, remove, toggle, clearAll],
  );

  return <DictionaryContext.Provider value={value}>{children}</DictionaryContext.Provider>;
}

export function useDictionaries(): DictionaryContextValue {
  const context = useContext(DictionaryContext);
  if (!context) {
    throw new Error('useDictionaries must be used inside DictionaryProvider.');
  }
  return context;
}
