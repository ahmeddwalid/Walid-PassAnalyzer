import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function useDebouncedVersionedValue<T>(
  value: T,
  version: number,
  delay: number,
): { value: T; version: number } {
  const [state, setState] = useState({ value, version });

  useEffect(() => {
    const timer = window.setTimeout(() => setState({ value, version }), delay);
    return () => window.clearTimeout(timer);
  }, [value, version, delay]);

  return state;
}
