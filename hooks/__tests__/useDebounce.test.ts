import { renderHook, act } from '@testing-library/react';
import { useDebounce, useDebouncedCallback } from '../useDebounce';

// Mock timers
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe('useDebounce', () => {
  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    // Change value
    rerender({ value: 'updated', delay: 500 });
    expect(result.current).toBe('initial'); // Should still be initial

    // Fast forward time but not enough
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toBe('initial');

    // Fast forward past delay
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    // Rapid changes
    rerender({ value: 'change1', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(250);
    });

    rerender({ value: 'change2', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(250);
    });

    rerender({ value: 'final', delay: 500 });
    
    // Should still be initial because timer keeps resetting
    expect(result.current).toBe('initial');

    // Now let it complete
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('final');
  });

  it('should handle different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 100 } }
    );

    rerender({ value: 'updated', delay: 100 });
    
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('updated');
  });

  it('should handle zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 0 } }
    );

    rerender({ value: 'updated', delay: 0 });
    
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current).toBe('updated');
  });
});

describe('useDebouncedCallback', () => {
  it('should return a debounced callback function', () => {
    const mockCallback = vi.fn();
    const { result } = renderHook(() => 
      useDebouncedCallback(mockCallback, 500)
    );

    expect(typeof result.current).toBe('function');
  });

  it('should debounce callback execution', () => {
    const mockCallback = vi.fn();
    const { result, rerender } = renderHook(
      ({ callback, delay }) => useDebouncedCallback(callback, delay),
      { initialProps: { callback: mockCallback, delay: 500 } }
    );

    // Initial callback should be available immediately
    expect(result.current).toBe(mockCallback);

    // Update callback
    const newCallback = vi.fn();
    rerender({ callback: newCallback, delay: 500 });

    // Should still be old callback
    expect(result.current).toBe(mockCallback);

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should now be new callback
    expect(result.current).toBe(newCallback);
  });

  it('should handle dependencies correctly', () => {
    const mockCallback = vi.fn();
    let dep = 'initial';
    
    const { result, rerender } = renderHook(
      ({ callback, delay, deps }) => useDebouncedCallback(callback, delay, deps),
      { initialProps: { callback: mockCallback, delay: 500, deps: [dep] } }
    );

    const initialCallback = result.current;

    // Change dependency
    dep = 'updated';
    rerender({ callback: mockCallback, delay: 500, deps: [dep] });

    // Should trigger debounce due to dependency change
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Callback should be updated
    expect(result.current).toBe(mockCallback);
  });
});