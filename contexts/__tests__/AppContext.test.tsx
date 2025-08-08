import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { AppProvider, useAppContext } from '../AppContext';

// Test component that uses the context
const TestComponent: React.FC = () => {
  const { cryptoService, clipboardService, exportService, dictionaryService } = useAppContext();
  
  return (
    <div>
      <div data-testid="crypto-supported">{cryptoService.isWebCryptoSupported().toString()}</div>
      <div data-testid="clipboard-supported">{clipboardService?.isSupported?.()?.toString() || 'false'}</div>
      <div data-testid="dictionaries-count">{dictionaryService.getDictionaries().length}</div>
      <div data-testid="services-available">true</div>
    </div>
  );
};

describe('AppContext', () => {
  it('should provide all services through context', () => {
    const { getByTestId } = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    expect(getByTestId('services-available')).toHaveTextContent('true');
    expect(getByTestId('crypto-supported')).toHaveTextContent('true');
    expect(getByTestId('clipboard-supported')).toHaveTextContent('false'); // Expected false in test environment
    expect(getByTestId('dictionaries-count')).toHaveTextContent('0');
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = () => {};

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAppContext must be used within an AppProvider');

    console.error = originalError;
  });
});